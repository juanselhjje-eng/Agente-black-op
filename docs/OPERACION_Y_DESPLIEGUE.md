# Operación 24/7 y despliegue

## Estado
Hay una ruta de despliegue Docker Compose con PostgreSQL, pero todavía no se ha instalado en el servidor del cliente. No existe dominio, HTTPS público ni credenciales reales verificadas.

## Arquitectura
Un proceso Node.js aloja el Secretario y subagentes. PostgreSQL es el almacenamiento persistente recomendado; JSON queda para desarrollo local. Workers gestionan escalaciones y monitoreo HTTP.

## Requisitos para producción
- Servidor Windows o Linux compatible con Docker, o instalación nativa revisada.
- Dominio/subdominio y certificado HTTPS.
- Meta Business/WhatsApp Business Platform y número habilitado.
- Clave Gemini API y modelo habilitado.
- Número del dueño para escalaciones y alertas.
- PostgreSQL con backups cifrados y restauración probada.
- API autenticada para reservas privadas, ventas, pagos e inventario.
- URL real de la web y repositorio/CMS con staging para cambios controlados.

## Desarrollo local
1. Instalar Node.js 20 o superior.
2. Clonar el repositorio.
3. Copiar `.env.example` a `.env`.
4. Ejecutar `npm install`, `npm test` y `npm run dev`.
5. Consultar `/health` y `/health/website`.
6. Si se configura `DATABASE_URL`, instalar/usar PostgreSQL y revisar el esquema.

## Despliegue Docker
Seguir [Base de datos y contenedores](BASE_DE_DATOS_Y_CONTENEDORES.md). En Windows Server se requiere confirmar compatibilidad de Docker Engine/containers con la versión concreta antes de elegir este camino. No exponer el puerto 3000 directamente a Internet; usar HTTPS y proxy inverso.

## Funciones implementadas en el repositorio
- Webhook WhatsApp y cliente Cloud API.
- Verificación HMAC del webhook cuando App Secret está configurado; producción rechaza si falta.
- Gemini para respuestas y aprendizaje natural.
- Escalamiento al dueño con timeout de dos minutos.
- Memoria versionada y solicitudes de cambios web.
- Monitor HTTP, historial y alertas de caída/recuperación.
- Adaptador PostgreSQL con índices, transacciones y pool; JSON para desarrollo.
- Dockerfile no-root, Compose con base de datos privada y healthcheck de PostgreSQL.

## Limitaciones
- Las credenciales Meta/Gemini y la URL real no están configuradas.
- El monitor HTTP no comprueba el flujo completo de reservas.
- No hay escritura de la web hasta conectar el repositorio/CMS y staging.
- Reportes de ventas, pagos, inventario y reservas privadas necesitan API autenticada.
- Faltan pruebas de integración contra PostgreSQL real, backups/restauración, observabilidad, control de acceso, pruebas de carga y revisión de seguridad.
