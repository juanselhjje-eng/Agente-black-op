# Agente Black Ops

Proyecto para construir un **Secretario virtual de Black Ops Paintball**: atiende clientes por WhatsApp, coordina subagentes y ayuda al dueño con alertas, reportes, supervisión e ideas comerciales. Usa Gemini y Node.js.

## Documentación
- [Definición del producto y requisitos](docs/DEFINICION_PRODUCTO_Y_REQUISITOS.md)
- [Operación y despliegue 24/7](docs/OPERACION_Y_DESPLIEGUE.md)
- [Integraciones](docs/INTEGRACIONES.md)
- [Memoria y aprendizaje del dueño](docs/MEMORIA_DEL_DUENO.md)
- [PostgreSQL y Docker](docs/BASE_DE_DATOS_Y_CONTENEDORES.md)
- [Respaldos y recuperación](docs/RESPALDOS_Y_RECUPERACION.md)

## Estado del desarrollo
Incluye backend, webhook WhatsApp, Gemini, consulta de API pública, escalamiento, memoria correctiva, solicitudes de cambios web y monitor HTTP. El almacenamiento selecciona JSON local o PostgreSQL mediante `DATABASE_URL`. Se añadió esquema relacional, índices, transacciones para escrituras críticas y despliegue Docker Compose con healthchecks. Hay scripts PowerShell para backup y restauración de PostgreSQL.

**Aún no está conectado a servicios reales ni desplegado.** WhatsApp requiere credenciales Meta; Gemini requiere API key; el monitor requiere URL. La página no se modifica todavía: falta conectar el repositorio/CMS real y staging. Los reportes de ventas, pagos, inventario y reservas privadas requieren API autenticada del negocio.

## Reportes operativos
El dueño puede enviar por WhatsApp `RESUMEN HOY` o `RESUMEN SEMANA` para recibir métricas registradas de mensajes, escalaciones, disponibilidad HTTP y solicitudes de cambios web. El reporte no estima ventas, pagos, inventario ni reservas privadas: esos datos requieren una API autenticada del negocio. La zona horaria predeterminada es `America/Bogota` (`REPORT_TIMEZONE`).

## Almacenamiento y despliegue
- Desarrollo local: JSON con `DATA_DIR`.
- PostgreSQL: definir `DATABASE_URL`; el esquema se inicializa al arrancar.
- Docker: revisar `docker-compose.yml` y [la guía de despliegue](docs/BASE_DE_DATOS_Y_CONTENEDORES.md).
- Respaldos: scripts de `scripts/`; revisar [la guía](docs/RESPALDOS_Y_RECUPERACION.md).

## Reglas
1. Todo el código y la documentación se mantienen en este repositorio.
2. Nunca subir secretos.
3. No inventar precios, disponibilidad, pagos, reservas ni políticas.
4. Las guías del dueño se recuerdan con historial de correcciones.
5. No ejecutar cambios de producción sin vista previa, pruebas y aprobación explícita.
6. Los datos privados y operaciones requieren APIs autenticadas.

## Desarrollo
Requiere Node.js 20 o superior:
```bash
npm install
npm test
npm run dev
```
Consulta `http://127.0.0.1:3000/health` y `/health/website`.

Repositorio: https://github.com/juanselhjje-eng/Agente-black-op
