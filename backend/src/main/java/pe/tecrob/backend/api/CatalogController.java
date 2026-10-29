package pe.tecrob.backend.api;

import java.util.List;
import java.util.Map;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final JdbcTemplate jdbc;

    public CatalogController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/clientes")
    public List<Map<String, Object>> clientes() {
        return jdbc.queryForList("""
                SELECT id_cliente AS id, tipo_documento AS tipoDocumento,
                       num_documento AS numDocumento, nombre, apellidos, telefono, email,
                       direccion, referencia, fecha_registro AS fechaRegistro
                FROM clientes ORDER BY id_cliente DESC
                """);
    }

    @PostMapping("/clientes")
    public Map<String, Object> crearCliente(@RequestBody Map<String, Object> body) {
        validateClient(body);
        jdbc.update("""
                INSERT INTO clientes (tipo_documento, num_documento, nombre, apellidos,
                                      telefono, email, direccion, referencia)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                value(body, "tipoDocumento", "DNI"), required(body, "numDocumento"),
                required(body, "nombre"), required(body, "apellidos"), value(body, "telefono", null),
                value(body, "email", null), value(body, "direccion", null), value(body, "referencia", null));
        return clientePorDocumento(required(body, "numDocumento"));
    }

    @PutMapping("/clientes/{id}")
    public Map<String, Object> actualizarCliente(@PathVariable int id, @RequestBody Map<String, Object> body) {
        validateClient(body);
        int updated = jdbc.update("""
                UPDATE clientes SET tipo_documento=?, num_documento=?, nombre=?, apellidos=?,
                    telefono=?, email=?, direccion=?, referencia=? WHERE id_cliente=?
                """,
                value(body, "tipoDocumento", "DNI"), required(body, "numDocumento"),
                required(body, "nombre"), required(body, "apellidos"), value(body, "telefono", null),
                value(body, "email", null), value(body, "direccion", null), value(body, "referencia", null), id);
        ensureUpdated(updated);
        return jdbc.queryForMap("SELECT id_cliente AS id, tipo_documento AS tipoDocumento, "
                + "num_documento AS numDocumento, nombre, apellidos, telefono, email, direccion, "
                + "referencia, fecha_registro AS fechaRegistro FROM clientes WHERE id_cliente=?", id);
    }

    @DeleteMapping("/clientes/{id}")
    public void eliminarCliente(@PathVariable int id) {
        Integer related = jdbc.queryForObject("""
                SELECT (SELECT COUNT(*) FROM equipos WHERE id_cliente=?)
                     + (SELECT COUNT(*) FROM ventas WHERE id_cliente=?)
                """, Integer.class, id, id);
        if (related != null && related > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede eliminar un cliente con equipos o ventas registrados");
        }
        try {
            ensureUpdated(jdbc.update("DELETE FROM clientes WHERE id_cliente=?", id));
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El cliente tiene equipos o ventas asociadas");
        }
    }

    @GetMapping("/productos")
    public List<Map<String, Object>> productos() {
        return jdbc.queryForList("""
                SELECT p.id_producto AS id, p.codigo, p.nombre, COALESCE(p.descripcion, '') AS descripcion,
                       COALESCE(c.nombre, '') AS categoria, p.precio_compra AS precioCompra,
                       p.precio_venta AS precioVenta, p.cantidad AS stock, p.stock_minimo AS stockMinimo,
                       COALESCE(p.proveedor, '') AS proveedor, p.imagen AS imagen,
                       p.fecha_registro AS fechaRegistro
                FROM productos p LEFT JOIN categorias c ON c.id_categoria=p.id_categoria
                WHERE p.activo=1 ORDER BY p.id_producto DESC
                """);
    }

    @GetMapping("/public/productos")
    public List<Map<String, Object>> catalogoPublico() {
        return jdbc.queryForList("""
                SELECT p.id_producto AS id, p.codigo, p.nombre, COALESCE(p.descripcion, '') AS descripcion,
                       COALESCE(c.nombre, '') AS categoria, 0 AS precioCompra,
                       p.precio_venta AS precioVenta, CASE WHEN p.cantidad > 0 THEN 1 ELSE 0 END AS stock,
                       0 AS stockMinimo, '' AS proveedor, p.imagen AS imagen,
                       p.fecha_registro AS fechaRegistro
                FROM productos p LEFT JOIN categorias c ON c.id_categoria=p.id_categoria
                WHERE p.activo=1 AND p.cantidad>0 ORDER BY p.id_producto DESC
                """);
    }

    @PostMapping("/productos")
    public Map<String, Object> crearProducto(@RequestBody Map<String, Object> body) {
        validateInventory(body);
        int categoryId = categoryId(required(body, "categoria"));
        jdbc.update("""
                INSERT INTO productos (id_categoria, codigo, nombre, descripcion, precio_compra,
                    precio_venta, cantidad, stock_minimo, proveedor, imagen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, categoryId, required(body, "codigo"), required(body, "nombre"),
                value(body, "descripcion", null), number(body, "precioCompra"), number(body, "precioVenta"),
                integer(body, "stock"), integer(body, "stockMinimo"), value(body, "proveedor", null),
                value(body, "imagen", null));
        return productoPorCodigo(required(body, "codigo"));
    }

    @PutMapping("/productos/{id}")
    public Map<String, Object> actualizarProducto(@PathVariable int id, @RequestBody Map<String, Object> body) {
        validateInventory(body);
        int updated = jdbc.update("""
                UPDATE productos SET id_categoria=?, codigo=?, nombre=?, descripcion=?, precio_compra=?,
                    precio_venta=?, cantidad=?, stock_minimo=?, proveedor=?,
                    imagen=COALESCE(?, imagen) WHERE id_producto=? AND activo=1
                """, categoryId(required(body, "categoria")), required(body, "codigo"), required(body, "nombre"),
                value(body, "descripcion", null), number(body, "precioCompra"), number(body, "precioVenta"),
                integer(body, "stock"), integer(body, "stockMinimo"), value(body, "proveedor", null),
                value(body, "imagen", null), id);
        ensureUpdated(updated);
        return productoPorId(id);
    }

    @DeleteMapping("/productos/{id}")
    public void eliminarProducto(@PathVariable int id) {
        ensureUpdated(jdbc.update("UPDATE productos SET activo=0 WHERE id_producto=? AND activo=1", id));
    }

    @GetMapping("/repuestos")
    public List<Map<String, Object>> repuestos() {
        return jdbc.queryForList("""
                SELECT r.id_repuesto AS id, r.codigo, r.nombre, COALESCE(r.descripcion, '') AS descripcion,
                       COALESCE(c.nombre, '') AS categoria, r.precio_compra AS precioCompra,
                       r.precio_venta AS precioVenta, r.cantidad AS stock, r.stock_minimo AS stockMinimo,
                       COALESCE(r.proveedor, '') AS proveedor, COALESCE(r.ubicacion, '') AS ubicacion,
                       r.fecha_registro AS fechaRegistro
                FROM repuestos r LEFT JOIN categorias c ON c.id_categoria=r.id_categoria
                ORDER BY r.id_repuesto DESC
                """);
    }

    @PostMapping("/repuestos")
    public Map<String, Object> crearRepuesto(@RequestBody Map<String, Object> body) {
        validateInventory(body);
        jdbc.update("""
                INSERT INTO repuestos (id_categoria, codigo, nombre, descripcion, precio_compra,
                    precio_venta, cantidad, stock_minimo, proveedor, ubicacion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, categoryId(required(body, "categoria")), required(body, "codigo"),
                required(body, "nombre"), value(body, "descripcion", null), number(body, "precioCompra"),
                number(body, "precioVenta"), integer(body, "stock"), integer(body, "stockMinimo"),
                value(body, "proveedor", null), value(body, "ubicacion", null));
        return repuestoPorCodigo(required(body, "codigo"));
    }

    @PutMapping("/repuestos/{id}")
    public Map<String, Object> actualizarRepuesto(@PathVariable int id, @RequestBody Map<String, Object> body) {
        validateInventory(body);
        int updated = jdbc.update("""
                UPDATE repuestos SET id_categoria=?, codigo=?, nombre=?, descripcion=?, precio_compra=?,
                    precio_venta=?, cantidad=?, stock_minimo=?, proveedor=?, ubicacion=? WHERE id_repuesto=?
                """, categoryId(required(body, "categoria")), required(body, "codigo"), required(body, "nombre"),
                value(body, "descripcion", null), number(body, "precioCompra"), number(body, "precioVenta"),
                integer(body, "stock"), integer(body, "stockMinimo"), value(body, "proveedor", null),
                value(body, "ubicacion", null), id);
        ensureUpdated(updated);
        return repuestoPorId(id);
    }

    @DeleteMapping("/repuestos/{id}")
    public void eliminarRepuesto(@PathVariable int id) {
        try {
            ensureUpdated(jdbc.update("DELETE FROM repuestos WHERE id_repuesto=?", id));
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El repuesto tiene órdenes asociadas");
        }
    }

    private Map<String, Object> clientePorDocumento(String documento) {
        return jdbc.queryForMap("SELECT id_cliente AS id, tipo_documento AS tipoDocumento, "
                + "num_documento AS numDocumento, nombre, apellidos, telefono, email, direccion, "
                + "referencia, fecha_registro AS fechaRegistro FROM clientes WHERE num_documento=?", documento);
    }

    private Map<String, Object> productoPorCodigo(String codigo) {
        return jdbc.queryForMap(productosQuery() + " WHERE p.codigo=?", codigo);
    }

    private Map<String, Object> productoPorId(int id) {
        return jdbc.queryForMap(productosQuery() + " WHERE p.id_producto=?", id);
    }

    private String productosQuery() {
        return """
                SELECT p.id_producto AS id, p.codigo, p.nombre, COALESCE(p.descripcion, '') AS descripcion,
                       COALESCE(c.nombre, '') AS categoria, p.precio_compra AS precioCompra,
                       p.precio_venta AS precioVenta, p.cantidad AS stock, p.stock_minimo AS stockMinimo,
                       COALESCE(p.proveedor, '') AS proveedor, p.imagen AS imagen,
                       p.fecha_registro AS fechaRegistro
                FROM productos p LEFT JOIN categorias c ON c.id_categoria=p.id_categoria
                """;
    }

    private Map<String, Object> repuestoPorCodigo(String codigo) {
        return jdbc.queryForMap(repuestosQuery() + " WHERE r.codigo=?", codigo);
    }

    private Map<String, Object> repuestoPorId(int id) {
        return jdbc.queryForMap(repuestosQuery() + " WHERE r.id_repuesto=?", id);
    }

    private String repuestosQuery() {
        return """
                SELECT r.id_repuesto AS id, r.codigo, r.nombre, COALESCE(r.descripcion, '') AS descripcion,
                       COALESCE(c.nombre, '') AS categoria, r.precio_compra AS precioCompra,
                       r.precio_venta AS precioVenta, r.cantidad AS stock, r.stock_minimo AS stockMinimo,
                       COALESCE(r.proveedor, '') AS proveedor, COALESCE(r.ubicacion, '') AS ubicacion,
                       r.fecha_registro AS fechaRegistro
                FROM repuestos r LEFT JOIN categorias c ON c.id_categoria=r.id_categoria
                """;
    }

    private int categoryId(String name) {
        List<Integer> ids = jdbc.query("SELECT id_categoria FROM categorias WHERE nombre=?",
                (rs, row) -> rs.getInt(1), name);
        if (!ids.isEmpty()) {
            return ids.get(0);
        }
        jdbc.update("INSERT INTO categorias (nombre) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id_categoria FROM categorias WHERE nombre=?", Integer.class, name);
    }

    private static String required(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " es obligatorio");
        }
        return value.toString().trim();
    }

    private static void validateClient(Map<String, Object> body) {
        String documentType = value(body, "tipoDocumento", "DNI");
        if (!List.of("DNI", "RUC", "Pasaporte", "Carnet Extranjeria").contains(documentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de documento no válido");
        }
        String document = required(body, "numDocumento");
        if (!document.matches("[A-Za-z0-9.-]{5,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El documento debe tener entre 5 y 20 caracteres válidos");
        }
        required(body, "nombre");
        required(body, "apellidos");
        String email = value(body, "email", null);
        if (email != null && !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El correo electrónico no es válido");
        }
    }

    private static void validateInventory(Map<String, Object> body) {
        required(body, "codigo");
        required(body, "nombre");
        required(body, "categoria");
        double purchasePrice = number(body, "precioCompra");
        double salePrice = number(body, "precioVenta");
        if (!Double.isFinite(purchasePrice) || !Double.isFinite(salePrice)
                || purchasePrice < 0 || salePrice < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los precios deben ser números no negativos");
        }
        if (integer(body, "stock") < 0 || integer(body, "stockMinimo") < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El stock no puede ser negativo");
        }
    }

    private static String value(Map<String, Object> body, String key, String fallback) {
        Object value = body.get(key);
        return value == null || value.toString().isBlank() ? fallback : value.toString();
    }

    private static double number(Map<String, Object> body, String key) {
        Object value = body.get(key);
        try {
            double result = value instanceof Number number ? number.doubleValue()
                    : Double.parseDouble(String.valueOf(value));
            if (!Double.isFinite(result)) {
                throw new NumberFormatException();
            }
            return result;
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " debe ser un número válido");
        }
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

    private static void ensureUpdated(int updated) {
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado");
        }
    }
}
