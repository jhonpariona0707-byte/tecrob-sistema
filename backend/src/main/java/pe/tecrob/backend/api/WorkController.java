package pe.tecrob.backend.api;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import tools.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.context.SecurityContextHolder;
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
public class WorkController {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public WorkController(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/equipos")
    public List<Map<String, Object>> equipos() {
        return jdbc.queryForList("""
                SELECT e.id_equipo AS id, e.id_cliente AS clienteId,
                       CONCAT(c.nombre, ' ', c.apellidos) AS clienteNombre,
                       c.num_documento AS clienteDocumento, e.tipo, COALESCE(e.marca, '') AS marca,
                       COALESCE(e.modelo, '') AS modelo, COALESCE(e.serial, '') AS serie,
                       COALESCE(e.caracteristicas, '') AS caracteristicas,
                       COALESCE(e.contrasena, '') AS contrasena, COALESCE(e.accesorios, '') AS accesorios,
                       e.fecha_registro AS fechaRegistro,
                       (SELECT COUNT(*) FROM ordenes_servicio o WHERE o.id_equipo=e.id_equipo) AS ordenesCount
                FROM equipos e JOIN clientes c ON c.id_cliente=e.id_cliente
                ORDER BY e.id_equipo DESC
                """);
    }

    @PostMapping("/equipos")
    public Map<String, Object> crearEquipo(@RequestBody Map<String, Object> body) {
        jdbc.update("""
                INSERT INTO equipos (id_cliente, tipo, marca, modelo, serial, caracteristicas, contrasena, accesorios)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, integer(body, "clienteId"), tipoEquipo(text(body, "tipo")), required(body, "marca"),
                required(body, "modelo"), nullable(body, "serie"), text(body, "caracteristicas"),
                text(body, "contrasena"), text(body, "accesorios"));
        return equipoPorSerie(text(body, "serie"), integer(body, "clienteId"));
    }

    @PutMapping("/equipos/{id}")
    public Map<String, Object> actualizarEquipo(@PathVariable int id, @RequestBody Map<String, Object> body) {
        int updated = jdbc.update("""
                UPDATE equipos SET id_cliente=?, tipo=?, marca=?, modelo=?, serial=?, caracteristicas=?,
                    contrasena=?, accesorios=? WHERE id_equipo=?
                """, integer(body, "clienteId"), tipoEquipo(text(body, "tipo")), required(body, "marca"),
                required(body, "modelo"), nullable(body, "serie"), text(body, "caracteristicas"),
                text(body, "contrasena"), text(body, "accesorios"), id);
        ensureUpdated(updated);
        return equipoPorId(id);
    }

    @DeleteMapping("/equipos/{id}")
    public void eliminarEquipo(@PathVariable int id) {
        Integer orderCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM ordenes_servicio WHERE id_equipo=?", Integer.class, id);
        if (orderCount != null && orderCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No se puede eliminar un equipo con órdenes registradas");
        }
        try {
            ensureUpdated(jdbc.update("DELETE FROM equipos WHERE id_equipo=?", id));
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El equipo tiene órdenes asociadas");
        }
    }

    @GetMapping("/ordenes")
    public List<Map<String, Object>> ordenes() {
        return jdbc.queryForList(ordenesQuery() + " ORDER BY o.id_orden DESC").stream()
                .map(this::ordenFrontend).toList();
    }

    @GetMapping("/ordenes/{numero}")
    public Map<String, Object> orden(@PathVariable String numero) {
        List<Map<String, Object>> results = jdbc.queryForList(ordenesQuery() + " WHERE o.num_orden=?", numero);
        if (results.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada");
        }
        return ordenFrontend(results.get(0));
    }

    @GetMapping("/consulta/{numero}")
    public Map<String, Object> consultaPublica(@PathVariable String numero) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT o.num_orden AS numOrden, o.estado, o.fecha_entrega_prometida AS fechaPrometida,
                       o.prioridad, o.diagnostico AS tipoServicio
                FROM ordenes_servicio o WHERE o.num_orden=?
                """, numero);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Orden no encontrada");
        }
        Map<String, Object> result = new java.util.HashMap<>(rows.get(0));
        result.put("equipo", Map.of());
        result.put("cliente", Map.of());
        result.put("responsable", "");
        result.put("subtotal", 0);
        result.put("adelanto", 0);
        result.put("saldo", 0);
        result.put("total", 0);
        result.put("seguimiento", jdbc.queryForList("""
                SELECT estado_nuevo AS estado, fecha
                FROM seguimiento_ordenes
                WHERE id_orden=(SELECT id_orden FROM ordenes_servicio WHERE num_orden=?)
                ORDER BY fecha ASC, id_seguimiento ASC
                """, numero));
        return result;
    }

    @PostMapping("/ordenes")
    @Transactional
    public Map<String, Object> crearOrden(@RequestBody Map<String, Object> body) {
        Map<String, Object> client = map(body.get("cliente"));
        Map<String, Object> device = map(body.get("equipo"));
        String document = required(client, "dni");
        if (!document.matches("[A-Za-z0-9.-]{5,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El documento debe tener entre 5 y 20 caracteres válidos");
        }
        required(client, "nombre");
        required(device, "marca");
        required(device, "modelo");
        String clientEmail = nullable(client, "email");
        if (clientEmail != null && !clientEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El correo electrónico no es válido");
        }
        Integer clientId = jdbc.query("SELECT id_cliente FROM clientes WHERE num_documento=?",
                rs -> rs.next() ? rs.getInt(1) : null, document);
        if (clientId == null) {
            String[] name = splitName(required(client, "nombre"));
            jdbc.update("""
                    INSERT INTO clientes (tipo_documento, num_documento, nombre, apellidos, telefono, email, direccion)
                    VALUES ('DNI', ?, ?, ?, ?, ?, ?)
                    """, document, name[0], name[1], text(client, "telefono"), text(client, "email"),
                    text(client, "direccion"));
            clientId = jdbc.queryForObject("SELECT id_cliente FROM clientes WHERE num_documento=?",
                    Integer.class, document);
        }

        KeyHolder equipmentKey = new GeneratedKeyHolder();
        int selectedClientId = clientId;
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO equipos (id_cliente, tipo, marca, modelo, serial, caracteristicas, accesorios)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, new String[]{"id_equipo"});
            statement.setInt(1, selectedClientId);
            statement.setString(2, tipoEquipo(text(device, "tipo")));
            statement.setString(3, text(device, "marca"));
            statement.setString(4, text(device, "modelo"));
            statement.setString(5, nullable(device, "serie"));
            statement.setString(6, text(device, "descripcion"));
            statement.setString(7, String.join(", ", stringList(body.get("accesorios"))));
            return statement;
        }, equipmentKey);

        String temporaryNumber = "TMP-" + java.util.UUID.randomUUID();
        String state = orderState(required(body, "estado"));
        String priority = priority(text(body, "prioridad"));
        double labor = decimal(body, "manoObra");
        if (labor < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La mano de obra no puede ser negativa");
        }
        double total = labor;
        List<Map<String, Object>> parts = new ArrayList<>();
        for (Map<String, Object> part : maps(body.get("repuestosUsados"))) {
            int partId = integer(part, "repuestoId");
            int quantity = integer(part, "cantidad");
            if (quantity <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La cantidad del repuesto debe ser positiva");
            }
            List<Double> prices = jdbc.query("""
                    SELECT precio_venta FROM repuestos WHERE id_repuesto=? AND cantidad>=? FOR UPDATE
                    """, (rs, row) -> rs.getDouble("precio_venta"), partId, quantity);
            if (prices.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "El repuesto " + partId + " no existe o no tiene stock suficiente");
            }
            double price = prices.get(0);
            double lineTotal = price * quantity;
            total += lineTotal;
            parts.add(Map.of("repuestoId", partId, "cantidad", quantity,
                    "precioUnitario", price, "subtotal", lineTotal));
        }
        double advance = decimal(body, "adelanto");
        if (advance < 0 || advance > total) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El adelanto no puede superar el total de la orden");
        }
        Map<String, Object> metadataBody = new java.util.HashMap<>(body);
        metadataBody.put("adelanto", advance);
        metadataBody.put("saldo", total - advance);
        double orderTotal = total;
        int userId = currentUserId();
        KeyHolder orderKey = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO ordenes_servicio (id_equipo, id_usuario_responsable, num_orden,
                    fecha_entrega_prometida, diagnostico, observaciones, estado, prioridad,
                    costo_mano_obra, costo_total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, new String[]{"id_orden"});
            statement.setInt(1, equipmentKey.getKey().intValue());
            statement.setInt(2, userId);
            statement.setString(3, temporaryNumber);
            statement.setDate(4, nullable(body, "fechaPrometida") == null ? null
                    : java.sql.Date.valueOf(nullable(body, "fechaPrometida")));
            statement.setString(5, text(body, "tipoServicio"));
            statement.setString(6, serializeOrderMetadata(metadataBody));
            statement.setString(7, state);
            statement.setString(8, priority);
            statement.setDouble(9, labor);
            statement.setDouble(10, orderTotal);
            return statement;
        }, orderKey);
        int orderId = orderKey.getKey().intValue();
        String number = "V5-" + String.format("%05d", orderId);
        jdbc.update("UPDATE ordenes_servicio SET num_orden=? WHERE id_orden=?", number, orderId);

        for (Map<String, Object> part : parts) {
            int partId = integer(part, "repuestoId");
            int quantity = integer(part, "cantidad");
            int stockUpdated = jdbc.update("UPDATE repuestos SET cantidad=cantidad-? WHERE id_repuesto=? AND cantidad>=?",
                    quantity, partId, quantity);
            if (stockUpdated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Stock insuficiente para un repuesto");
            }
            jdbc.update("INSERT INTO detalle_ordenes (id_orden, id_repuesto, cantidad, precio_unitario) "
                    + "VALUES (?, ?, ?, ?)", orderId, partId, quantity, decimal(part, "precioUnitario"));
            jdbc.update("""
                    INSERT INTO movimientos_stock (tipo, id_repuesto, id_orden, cantidad, motivo, id_usuario)
                    VALUES ('salida', ?, ?, ?, ?, ?)
                    """, partId, orderId, quantity, "Repuesto usado en orden " + number, userId);
        }

        jdbc.update("""
                INSERT INTO seguimiento_ordenes (id_orden, estado_anterior, estado_nuevo, comentario, id_usuario)
                VALUES (?, NULL, ?, 'Orden creada', ?)
                """, orderId, state, userId);
        return orden(number);
    }

    @PutMapping("/ordenes/{numero}/estado")
    @Transactional
    public Map<String, Object> cambiarEstado(@PathVariable String numero, @RequestBody Map<String, Object> body) {
        Map<String, Object> current = orden(numero);
        String previous = String.valueOf(current.get("estado"));
        String next = orderState(required(body, "estado"));
        String comment = text(body, "comentario");
        if (comment.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El comentario no puede superar 1000 caracteres");
        }
        if (previous.equals(next)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona un estado diferente al actual");
        }
        int orderId = ((Number) current.get("id")).intValue();
        int userId = currentUserId();
        ensureUpdated(jdbc.update("""
                UPDATE ordenes_servicio SET estado=?,
                    fecha_entrega_real=CASE WHEN ?='Entregado' THEN CURRENT_TIMESTAMP ELSE fecha_entrega_real END
                WHERE id_orden=?
                """, next, next, orderId));
        jdbc.update("""
                INSERT INTO seguimiento_ordenes (id_orden, estado_anterior, estado_nuevo, comentario, id_usuario)
                VALUES (?, ?, ?, ?, ?)
                """, orderId, previous, next, comment, userId);
        return orden(numero);
    }

    private String ordenesQuery() {
        return """
                SELECT o.id_orden AS id, o.num_orden AS numOrden, o.fecha_ingreso AS fechaIngreso,
                       o.fecha_entrega_prometida AS fechaPrometida, o.estado, o.prioridad,
                       o.costo_mano_obra AS manoObra, o.costo_total AS total,
                       o.diagnostico AS tipoServicio, o.observaciones AS metadata,
                       c.num_documento AS clienteDni, CONCAT(c.nombre, ' ', c.apellidos) AS clienteNombre,
                       COALESCE(c.telefono, '') AS clienteTelefono, COALESCE(c.email, '') AS clienteEmail,
                       COALESCE(c.direccion, '') AS clienteDireccion, e.tipo AS equipoTipo,
                       COALESCE(e.marca, '') AS equipoMarca, COALESCE(e.modelo, '') AS equipoModelo,
                       COALESCE(e.serial, '') AS equipoSerie, COALESCE(e.caracteristicas, '') AS equipoDescripcion,
                       COALESCE(u.nombre, '') AS responsable
                FROM ordenes_servicio o JOIN equipos e ON e.id_equipo=o.id_equipo
                JOIN clientes c ON c.id_cliente=e.id_cliente
                LEFT JOIN usuarios u ON u.id_usuario=o.id_usuario_responsable
                """;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> ordenFrontend(Map<String, Object> row) {
        Map<String, Object> order = new java.util.HashMap<>();
        order.put("id", row.get("id"));
        order.put("numOrden", row.get("numOrden"));
        order.put("fechaIngreso", row.get("fechaIngreso"));
        order.put("fechaPrometida", row.get("fechaPrometida"));
        order.put("estado", row.get("estado"));
        order.put("prioridad", row.get("prioridad"));
        order.put("responsable", row.get("responsable"));
        order.put("seguimiento", jdbc.queryForList("""
                SELECT s.estado_anterior AS estadoAnterior, s.estado_nuevo AS estado,
                       COALESCE(s.comentario, '') AS comentario, s.fecha,
                       u.nombre AS responsable
                FROM seguimiento_ordenes s
                JOIN usuarios u ON u.id_usuario=s.id_usuario
                WHERE s.id_orden=?
                ORDER BY s.fecha ASC, s.id_seguimiento ASC
                """, row.get("id")));
        order.put("total", row.get("total"));
        order.put("subtotal", row.get("total"));
        order.put("manoObra", row.get("manoObra"));
        order.put("cliente", Map.of(
                "dni", row.get("clienteDni"),
                "nombre", row.get("clienteNombre"),
                "telefono", row.get("clienteTelefono"),
                "email", row.get("clienteEmail"),
                "direccion", row.get("clienteDireccion")));
        order.put("equipo", Map.of(
                "tipo", row.get("equipoTipo"),
                "marca", row.get("equipoMarca"),
                "modelo", row.get("equipoModelo"),
                "serie", row.get("equipoSerie"),
                "descripcion", row.get("equipoDescripcion")));
        try {
            Map<String, Object> metadata = objectMapper.readValue(String.valueOf(row.get("metadata")), Map.class);
            order.put("area", metadata.getOrDefault("area", ""));
            order.put("tipoServicio", metadata.getOrDefault("tipoServicio", ""));
            order.put("observaciones", metadata.getOrDefault("observaciones", ""));
            order.put("accesorios", metadata.getOrDefault("accesorios", List.of()));
            order.put("adelanto", metadata.getOrDefault("adelanto", 0));
            order.put("saldo", metadata.getOrDefault("saldo", row.get("total")));
            order.put("prioridad", metadata.getOrDefault("prioridadFrontend", row.get("prioridad")));
        } catch (Exception exception) {
            order.put("area", "");
            order.put("tipoServicio", row.get("tipoServicio"));
            order.put("observaciones", row.get("metadata"));
            order.put("accesorios", List.of());
            order.put("adelanto", 0);
            order.put("saldo", row.get("total"));
        }
        order.put("repuestosUsados", jdbc.queryForList("""
                SELECT d.id_repuesto AS repuestoId, r.codigo, r.nombre, d.cantidad,
                       d.precio_unitario AS precioUnitario, d.cantidad * d.precio_unitario AS subtotal
                FROM detalle_ordenes d JOIN repuestos r ON r.id_repuesto=d.id_repuesto
                WHERE d.id_orden=?
                """, row.get("id")));
        return order;
    }

    private Map<String, Object> equipoPorSerie(String serie, int clientId) {
        if (serie.isBlank()) {
            return jdbc.queryForMap(equiposQuery() + " WHERE e.id_cliente=? ORDER BY e.id_equipo DESC LIMIT 1", clientId);
        }
        return jdbc.queryForMap(equiposQuery() + " WHERE e.serial=?", serie);
    }

    private Map<String, Object> equipoPorId(int id) {
        return jdbc.queryForMap(equiposQuery() + " WHERE e.id_equipo=?", id);
    }

    private String equiposQuery() {
        return """
                SELECT e.id_equipo AS id, e.id_cliente AS clienteId,
                       CONCAT(c.nombre, ' ', c.apellidos) AS clienteNombre,
                       c.num_documento AS clienteDocumento, e.tipo, COALESCE(e.marca, '') AS marca,
                       COALESCE(e.modelo, '') AS modelo, COALESCE(e.serial, '') AS serie,
                       COALESCE(e.caracteristicas, '') AS caracteristicas,
                       COALESCE(e.contrasena, '') AS contrasena, COALESCE(e.accesorios, '') AS accesorios,
                       e.fecha_registro AS fechaRegistro,
                       (SELECT COUNT(*) FROM ordenes_servicio o WHERE o.id_equipo=e.id_equipo) AS ordenesCount
                FROM equipos e JOIN clientes c ON c.id_cliente=e.id_cliente
                """;
    }

    private String serializeOrderMetadata(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "area", text(body, "area"),
                    "tipoServicio", text(body, "tipoServicio"),
                    "observaciones", text(body, "observaciones"),
                    "accesorios", stringList(body.get("accesorios")),
                    "adelanto", decimal(body, "adelanto"),
                    "saldo", decimal(body, "saldo"),
                    "prioridadFrontend", text(body, "prioridad")));
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo procesar la orden");
        }
    }

    private String[] splitName(String fullName) {
        String[] parts = fullName.trim().split("\\s+", 2);
        return new String[]{parts[0], parts.length > 1 ? parts[1] : "-"};
    }

    private String tipoEquipo(String type) {
        return switch (type.toLowerCase()) {
            case "laptop" -> "Laptop";
            case "pc escritorio", "computadora" -> "PC Escritorio";
            case "all-in-one", "todo en uno" -> "All-in-One";
            case "servidor" -> "Servidor";
            default -> "Otro";
        };
    }

    private String priority(String value) {
        return switch (value.toLowerCase()) {
            case "baja" -> "Baja";
            case "alta" -> "Alta";
            case "urgente", "extrema" -> "Urgente";
            default -> "Media";
        };
    }

    private String orderState(String value) {
        if (!List.of("Pendiente", "En reparación", "Esperando repuesto",
                "Reparado", "Entregado", "No reparable").contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de orden no válido");
        }
        return value;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Objeto inválido");
    }

    private static List<Map<String, Object>> maps(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            result.add(map(item));
        }
        return result;
    }

    private static List<String> stringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        return list.stream().map(String::valueOf).toList();
    }

    private static String required(Map<String, Object> body, String key) {
        String value = text(body, key);
        if (value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " es obligatorio");
        }
        return value;
    }

    private static String text(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private static String nullable(Map<String, Object> body, String key) {
        String value = text(body, key);
        return value.isBlank() ? null : value;
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

    private static double decimal(Map<String, Object> body, String key) {
        Object value = body.get(key);
        try {
            double result = value instanceof Number number ? number.doubleValue()
                    : value == null ? 0 : Double.parseDouble(String.valueOf(value));
            if (!Double.isFinite(result)) {
                throw new NumberFormatException();
            }
            return result;
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " debe ser un número válido");
        }
    }

    private static void ensureUpdated(int updated) {
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado");
        }
    }

    private int currentUserId() {
        String email = String.valueOf(SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        return jdbc.queryForObject("SELECT id_usuario FROM usuarios WHERE email=? AND activo=1",
                Integer.class, email);
    }
}
