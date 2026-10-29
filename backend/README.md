API REST de TecRob con Java 17, Spring Boot y MariaDB. El backend usa la estructura del volcado `tienda_reparacion.sql`; no ejecuta migraciones ni importa datos al arrancar.

El frontend consume esta API para iniciar sesión, clientes, equipos, productos, repuestos, órdenes y ventas. Los cambios de venta y el descuento de inventario se realizan juntos en una transacción de base de datos. El carrito sigue local en el navegador hasta confirmar una venta; al confirmarla, la API valida stock y registra la venta. La información antigua de `localStorage` no se importa ni se elimina.

## Preparar una base nueva con phpMyAdmin

1. Inicia MariaDB/MySQL y abre phpMyAdmin.
2. Crea una base de datos vacía llamada `tienda_reparacion`, con cotejamiento `utf8mb4_unicode_ci`.
3. Selecciona esa base vacía, abre **Importar**, elige el archivo `tienda_reparacion.sql` original y ejecuta la importación.
4. Comprueba que aparezcan las tablas `clientes`, `productos`, `repuestos`, `equipos`, `ordenes_servicio` y `ventas`, entre otras.

No importes este volcado sobre una base que ya tenga esas tablas o datos: puede insertar registros duplicados y fallar en claves primarias. El backend nunca importa ni altera el esquema por sí mismo.

## Configuración

Configura estas variables de entorno antes de iniciar la aplicación:

| Variable | Valor predeterminado | Descripción |
|---|---|---|
| `DB_URL` | `jdbc:mariadb://localhost:3306/tienda_reparacion` | URL JDBC |
| `DB_USERNAME` | vacío | Usuario de la base |
| `DB_PASSWORD` | vacío | Contraseña de la base |
| `SERVER_PORT` | `8080` | Puerto de la API |
| `CORS_ALLOWED_ORIGIN` | `http://localhost:4200` | Origen del frontend |
| `DB_CONNECTION_TIMEOUT` | `3000` | Tiempo máximo en milisegundos para una conexión |
| `TECROB_UPLOAD_DIR` | `uploads/products` | Directorio persistente donde se guardan las imágenes |

No guardes contraseñas en archivos versionados ni las compartas por chat. El endpoint `GET /api/health` devuelve `200` si la base responde y `503` si no está disponible.

Los administradores pueden cargar imágenes de productos JPG, PNG o WebP de hasta 5 MB desde el formulario de productos. Los archivos se guardan en `backend\uploads\products` cuando el backend se ejecuta desde la carpeta `backend`; la base conserva la ruta de cada archivo. En producción, configura `TECROB_UPLOAD_DIR` en un volumen persistente y accesible por el backend.

Los endpoints de administración requieren una sesión iniciada. El catálogo público solo recibe datos de venta; la consulta pública de reparaciones solo muestra estado e información general y no expone datos personales ni importes. La primera autenticación válida de usuarios cuya contraseña siga en texto plano la cambia a un hash BCrypt.

### Permisos por rol

- **Administrador:** acceso completo a clientes, inventario, ventas y órdenes.
- **Técnico:** puede consultar clientes e inventario, gestionar equipos y órdenes de servicio, y registrar el uso de repuestos desde una orden. No puede administrar clientes o inventario, eliminar equipos ni acceder a ventas.
- Estos permisos se verifican en el backend; ocultar opciones en el menú solo mejora la interfaz y no sustituye la autorización de la API.
- El panel obtiene sus estadísticas, las últimas órdenes y las alertas de stock bajo desde `GET /api/dashboard`, que requiere iniciar sesión.
- El historial privado de cada orden registra estado, comentario, fecha y responsable; los clientes solo ven el estado y la fecha al consultar públicamente su orden.

En PowerShell, configura las credenciales para la sesión actual (reemplaza el usuario por el que creaste en MariaDB; la contraseña se solicita sin mostrarla):

```powershell
$env:DB_USERNAME = "root"
$securePassword = Read-Host "Contraseña de MariaDB" -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
.\mvnw.cmd spring-boot:run
```

Si tu usuario de MariaDB no tiene contraseña, establece explícitamente `$env:DB_PASSWORD = ""` en lugar de solicitarla. Estas variables duran solo mientras esa ventana de PowerShell esté abierta.

## Copias de seguridad

Se incluye un script para exportar la base sin guardar ni mostrar la contraseña. Requiere que MariaDB esté iniciado y que `mysqldump.exe` o `mariadb-dump.exe` esté en el `PATH`; también detecta la ubicación predeterminada de XAMPP (`C:\xampp\mysql\bin\mysqldump.exe`).

Desde PowerShell, en la carpeta `backend`, ejecuta:

```powershell
.\backup-database.ps1
```

El script usa `DB_USERNAME` si está configurado; si no, pregunta el usuario. MariaDB solicita la contraseña de forma interactiva. La copia se guarda con fecha y hora en `backend\backups`; esa carpeta está excluida de Git porque el respaldo contiene datos privados. Respalda también el directorio configurado en `TECROB_UPLOAD_DIR`: el SQL conserva las rutas, no los archivos de imagen. Conserva otra copia fuera de la computadora, en un medio protegido.

Para restaurar:

1. Verifica primero que tienes una copia reciente de la base actual.
2. En phpMyAdmin, crea una **base de datos vacía** para restaurar y selecciónala.
3. Abre **Importar**, selecciona el archivo `.sql` de `backend\backups` y ejecuta la importación.
4. Comprueba las tablas y algunos registros antes de apuntar el sistema a esa base.

No importes un respaldo sobre tablas existentes: la operación puede fallar por claves duplicadas o mezclar datos. No borres ni reemplaces la base en uso para hacer una prueba. El backend no crea respaldos automáticamente; ejecuta el script periódicamente y verifica que el archivo resultante no esté vacío.

## Ejecutar

Desde esta carpeta:

```powershell
.\mvnw.cmd spring-boot:run
```

La primera ejecución necesita conexión a internet para descargar Maven y las dependencias. Inicia también el frontend en otra terminal desde `frontend\tecrob-app` con `npm start`.

El cliente Angular apunta a `http://localhost:8080/api`; cambia esa URL en `src/app/core/services/api.service.ts` si despliegas la API en otra dirección. Para producción, sirve la aplicación por HTTPS y ajusta `CORS_ALLOWED_ORIGIN` al dominio real del frontend.

## Nota de seguridad

El volcado contiene usuarios de muestra con contraseñas en texto plano. Cambia esas credenciales antes de usar la base en producción. No uses las cuentas de muestra en un entorno público.
# Backend TecRob
