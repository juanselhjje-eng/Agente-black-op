# Base de datos PostgreSQL y despliegue con contenedores

## Selección automática de almacenamiento
- Sin `DATABASE_URL`: JSON local para desarrollo de una instancia.
- Con `DATABASE_URL`: PostgreSQL, con tablas e índices inicializados al arrancar.
- El adaptador conserva la interfaz del almacenamiento: mensajes idempotentes, escalaciones, memorias versionadas, solicitudes web, verificaciones de página y auditoría.
- El cierre de escalaciones y las escrituras/actualizaciones de memorias usan transacciones y bloqueos de fila.
- `PG_POOL_MAX` limita conexiones del pool; `PGSSL=true` activa TLS con validación de certificado.

## Tablas
`blackops_messages`, `blackops_escalations`, `blackops_owner_memories`, `blackops_web_changes`, `blackops_website_checks`, `blackops_audit`. Índices cubren fechas, estados y consultas frecuentes. El SQL versionado está en `src/storage/migrations/001-initial.sql`.

## Despliegue Docker Compose
1. Instalar Docker Engine/Desktop en el servidor compatible.
2. Copiar el repositorio y `.env.production.example` como `.env` en carpeta protegida.
3. Definir `POSTGRES_PASSWORD` con al menos 64 caracteres hexadecimales aleatorios (para evitar caracteres que rompan la URL de conexión) y los secretos reales fuera de Git.
4. Ejecutar `docker compose up -d --build`.
5. Comprobar `docker compose ps` y `http://127.0.0.1:3000/health`.
6. Configurar HTTPS y proxy inverso (IIS/Nginx) antes del webhook público de Meta.
7. Configurar backups cifrados del volumen PostgreSQL y probar restauración.

La aplicación solo se publica en loopback; PostgreSQL no publica puertos. Ambos servicios tienen healthcheck. El proxy HTTPS debe ejecutarse en el host o red protegida.

## Seguridad
- Nunca introducir secretos en Git. `.env.production.example` solo tiene marcadores.
- El contenedor ejecuta Node como usuario no root.
- La base de datos no se expone a Internet.
- Mantener imágenes y dependencias actualizadas.
- Un volumen persistente no sustituye backups; probar restauraciones.

## Validación pendiente antes de producción
El adaptador tiene pruebas unitarias iniciales, pero se debe probar contra PostgreSQL real del cliente, probar concurrencia y recuperación, definir retención/backup, revisar pool y hacer revisión de seguridad. La integración no activa credenciales ni servicios externos.
