package pe.tecrob.backend.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final JdbcTemplate jdbc;

    public DashboardController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Map<String, Object> resumen() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("clientes", count("SELECT COUNT(*) FROM clientes"));
        stats.put("ordenesPendientes", count("""
                SELECT COUNT(*) FROM ordenes_servicio
                WHERE estado IN ('Pendiente', 'En reparación', 'Esperando repuesto')
                """));
        stats.put("ordenesReparadas", count("""
                SELECT COUNT(*) FROM ordenes_servicio WHERE estado IN ('Reparado', 'Entregado')
                """));

        List<Map<String, Object>> stockBajo = jdbc.queryForList("""
                SELECT tipo, id, codigo, nombre, stock, stockMinimo
                FROM (
                    SELECT 'Producto' AS tipo, id_producto AS id, codigo, nombre,
                           cantidad AS stock, COALESCE(stock_minimo, 0) AS stockMinimo
                    FROM productos WHERE activo=1 AND cantidad <= COALESCE(stock_minimo, 0)
                    UNION ALL
                    SELECT 'Repuesto' AS tipo, id_repuesto AS id, codigo, nombre,
                           cantidad AS stock, COALESCE(stock_minimo, 0) AS stockMinimo
                    FROM repuestos WHERE cantidad <= COALESCE(stock_minimo, 0)
                ) AS inventario_bajo
                ORDER BY stock ASC, nombre ASC
                """);

        List<Map<String, Object>> ultimasOrdenes = jdbc.queryForList("""
                SELECT o.num_orden AS numOrden, o.estado, o.fecha_ingreso AS fechaIngreso,
                       CONCAT(c.nombre, ' ', c.apellidos) AS cliente,
                       CONCAT(COALESCE(e.marca, ''), ' ', COALESCE(e.modelo, '')) AS equipo
                FROM ordenes_servicio o
                JOIN equipos e ON e.id_equipo=o.id_equipo
                JOIN clientes c ON c.id_cliente=e.id_cliente
                ORDER BY o.id_orden DESC
                LIMIT 5
                """);

        return Map.of(
                "estadisticas", stats,
                "stockBajo", stockBajo,
                "ultimasOrdenes", ultimasOrdenes);
    }

    private Number count(String sql) {
        return jdbc.queryForObject(sql, Long.class);
    }
}
