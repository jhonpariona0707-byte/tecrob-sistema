package pe.tecrob.backend.api;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ventas")
public class SalesController {

    private final JdbcTemplate jdbc;

    public SalesController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> ventas() {
        List<Map<String, Object>> sales = jdbc.queryForList("""
                SELECT v.id_venta AS id, v.num_factura AS numFactura, v.tipo_comprobante AS tipoComprobante,
                       v.fecha, v.id_cliente AS clienteId,
                       COALESCE(CONCAT(c.nombre, ' ', c.apellidos), 'Cliente general') AS clienteNombre,
                       COALESCE(c.num_documento, '-') AS clienteDocumento, u.nombre AS usuario,
                       v.metodo_pago AS metodoPago, v.subtotal, v.igv, v.total, v.estado
                FROM ventas v LEFT JOIN clientes c ON c.id_cliente=v.id_cliente
                JOIN usuarios u ON u.id_usuario=v.id_usuario ORDER BY v.id_venta DESC
                """);
        for (Map<String, Object> sale : sales) {
            sale.put("items", jdbc.queryForList("""
                    SELECT d.id_producto AS productoId, p.codigo, p.nombre, d.cantidad,
                           d.precio_unitario AS precioUnitario, d.subtotal
                    FROM detalle_ventas d JOIN productos p ON p.id_producto=d.id_producto
                    WHERE d.id_venta=?
                    """, sale.get("id")));
        }
        return sales;
    }

    @PostMapping
    @Transactional
    public Map<String, Object> crearVenta(@RequestBody Map<String, Object> body) {
        Object rawItems = body.get("items");
        if (!(rawItems instanceof List<?> items) || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La venta debe incluir productos");
        }

        String email = String.valueOf(SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        int userId = jdbc.queryForObject("SELECT id_usuario FROM usuarios WHERE email=? AND activo=1",
                Integer.class, email);

        Integer clientId = body.get("clienteId") instanceof Number number ? number.intValue() : null;
        if (clientId != null && clientId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cliente seleccionado no es válido");
        }
        if (clientId != null && jdbc.queryForObject(
                "SELECT COUNT(*) FROM clientes WHERE id_cliente=?", Integer.class, clientId) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El cliente seleccionado no existe");
        }
        double total = 0;
        List<Map<String, Object>> saleItems = new ArrayList<>();

        for (Object raw : items) {
            Map<String, Object> item = map(raw);
            int productId = integer(item, "productoId");
            int quantity = integer(item, "cantidad");
            if (quantity <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad debe ser positiva");
            }
            List<Map<String, Object>> products = jdbc.query(
                    "SELECT codigo, nombre, precio_venta AS precioVenta FROM productos "
                            + "WHERE id_producto=? AND activo=1 AND cantidad>=? FOR UPDATE",
                    (rs, row) -> Map.of("precioVenta", rs.getBigDecimal("precioVenta")), productId, quantity);
            if (products.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El producto " + productId + " no existe o no tiene stock suficiente");
            }
            Map<String, Object> product = products.get(0);
            double price = ((Number) product.get("precioVenta")).doubleValue();
            double lineTotal = price * quantity;
            total += lineTotal;
            saleItems.add(Map.of("productoId", productId, "cantidad", quantity,
                    "precio", price, "subtotal", lineTotal));
        }

        double subtotal = total / 1.18;
        double tax = total - subtotal;
        double saleTotal = total;
        Integer selectedClientId = clientId;
        String temporaryInvoice = "TMP-" + java.util.UUID.randomUUID();
        KeyHolder saleKey = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO ventas (id_cliente, id_usuario, num_factura, tipo_comprobante,
                    subtotal, igv, total, metodo_pago, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pagado')
                """, new String[]{"id_venta"});
            if (selectedClientId == null) statement.setNull(1, java.sql.Types.INTEGER);
            else statement.setInt(1, selectedClientId);
            statement.setInt(2, userId);
            statement.setString(3, temporaryInvoice);
            statement.setString(4, text(body, "tipoComprobante", "Boleta"));
            statement.setDouble(5, subtotal);
            statement.setDouble(6, tax);
            statement.setDouble(7, saleTotal);
            statement.setString(8, text(body, "metodoPago", "Efectivo"));
            return statement;
        }, saleKey);
        int saleId = saleKey.getKey().intValue();
        String invoice = "FAC-" + String.format("%06d", saleId);
        jdbc.update("UPDATE ventas SET num_factura=? WHERE id_venta=?", invoice, saleId);

        for (Map<String, Object> item : saleItems) {
            int productId = (int) item.get("productoId");
            int quantity = (int) item.get("cantidad");
            double price = (double) item.get("precio");
            double lineTotal = (double) item.get("subtotal");
            int stockUpdated = jdbc.update("UPDATE productos SET cantidad=cantidad-? "
                    + "WHERE id_producto=? AND cantidad>=?", quantity, productId, quantity);
            if (stockUpdated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Stock insuficiente");
            }
            jdbc.update("""
                    INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, descuento, subtotal)
                    VALUES (?, ?, ?, ?, 0, ?)
                    """, saleId, productId, quantity, price, lineTotal);
            jdbc.update("""
                    INSERT INTO movimientos_stock (tipo, id_producto, id_venta, cantidad, motivo, id_usuario)
                    VALUES ('salida', ?, ?, ?, ?, ?)
                    """, productId, saleId, quantity, "Venta N° " + invoice, userId);
        }

        return ventas().stream().filter(sale -> invoice.equals(sale.get("numFactura"))).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "No se pudo recuperar la venta registrada"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Detalle de producto inválido");
    }

    private static int integer(Map<String, Object> body, String key) {
        Object value = body.get(key);
        try {
            if (value instanceof Number number) {
                double numeric = number.doubleValue();
                if (!Double.isFinite(numeric) || numeric != Math.rint(numeric)
                        || numeric > Integer.MAX_VALUE || numeric < Integer.MIN_VALUE) {
                    throw new NumberFormatException();
                }
                return (int) numeric;
            }
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " debe ser un número entero válido");
        }
    }

    private static String text(Map<String, Object> body, String key, String fallback) {
        Object value = body.get(key);
        return value == null || value.toString().isBlank() ? fallback : value.toString();
    }
}
