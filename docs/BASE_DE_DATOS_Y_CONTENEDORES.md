# Base de datos PostgreSQL y despliegue con contenedores

## Selección automática de almacenamiento
- Sin `DATABASE_URL`: se usa JSON local para desarrollo de una instancia.
- Con `DATABASE_URL`: el servidor usa PostgreSQL y crea las tablas/índices de la aplicación al iniciar.
- El adaptador PostgreSQL conserva la interfaz del almacén existente: mensajes idempotentes, escalaciones, memorias versionadas, solicitudes web, verificaciones de página y auditoría.
- Para operaciones de cierre de escalaciones y escritura de memorias se usan transacciones y bloqueos de fila para evitar respuestas duplicadas y pérdida de revisiones.

## Tablas
`blackops_messages`, `blackops_escalations`, `blackops_owner_memories`, `blackops_web_changes`, `blackops_website_checks`, `blackops_audit`. Índices cubren fechas, estados y consultas del worker.

## Despliegue con Docker Compose
1. Instalar Docker Engine/Desktop en el servidor compatible.
2. Copiar el repositorio y `.env.production.example` como `.env` fuera del repositorio.
3. Definir una contraseña PostgreSQL larga y aleatoria, y los secretos de los proveedores.
4. Ejecutar `docker compose up -d --build`.
5. Comprobar `docker compose ps` y `http://127.0.0.1:3000/health`.
6. Configurar HTTPS y proxy inverso (IIS/Nginx) antes de registrar el webhook público de Meta.
7. Configurar backups cifrados del volumen PostgreSQL y probar restauración.

El compose publica la aplicación solo en loopback; no expone PostgreSQL ni el puerto de aplicación a Internet. Un proxy HTTPS debe ejecutarse en el host o en una red protegida.

## Seguridad operativa
- No introducir secretos en Git. El archivo `.env.production.example` solo contiene nombres y valores de ejemplo.
- El usuario de la aplicación no es root en el contenedor.
- La base de datos no publica puertos externos.
- Mantener Docker, imagen base, Node y dependencias actualizados.
- La base de datos requiere backup y prueba de recuperación; un volumen persistente no sustituye los backups.

## Límites
El esquema y adaptador son una base inicial de producción, pero antes de tráfico real se requieren pruebas con la instancia PostgreSQL del cliente, estrategia de backup, retención, monitorización de pool y revisión de seguridad. La integración no activa por sí sola credenciales ni servicios externos.
