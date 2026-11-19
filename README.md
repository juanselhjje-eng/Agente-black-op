# Agente Black Ops

Proyecto para construir un **Secretario virtual de Black Ops Paintball**: atiende clientes por WhatsApp, coordina subagentes y ayuda al dueño con alertas, reportes, supervisión e ideas comerciales. Usa Gemini y Node.js.

## Documentación
- [Definición del producto y requisitos](docs/DEFINICION_PRODUCTO_Y_REQUISITOS.md)
- [Operación y despliegue 24/7](docs/OPERACION_Y_DESPLIEGUE.md)
- [Integraciones](docs/INTEGRACIONES.md)
- [Memoria y aprendizaje del dueño](docs/MEMORIA_DEL_DUENO.md)

## Estado del desarrollo
Incluye backend inicial, webhook de WhatsApp, integración Gemini, consulta de API pública, escalamiento con espera de dos minutos, memoria correctiva del dueño, registro de solicitudes de cambio web y monitor HTTP periódico configurable para la página.

El monitor registra disponibilidad, estado HTTP y latencia, conserva historial local y puede avisar al dueño cuando detecta caída o recuperación. Endpoint de consulta: `GET /health/website`.

**No está conectado a servicios reales ni desplegado.** El monitor requiere `WEBSITE_MONITOR_URL`; WhatsApp requiere credenciales Meta; Gemini requiere API key. JSON es almacenamiento de desarrollo de una instancia, no producción multiinstancia.

El Secretario todavía no modifica la página: hace falta conectar el repositorio/CMS real de la web, permisos y staging. La aprobación de una solicitud no publica automáticamente.

## Reglas
1. Todo el código y la documentación se mantienen en este repositorio GitHub.
2. Nunca subir secretos.
3. No inventar precios, disponibilidad, pagos, reservas ni políticas.
4. Las guías del dueño se recuerdan, con historial de correcciones.
5. No ejecutar cambios de producción sin vista previa, pruebas y aprobación explícita.
6. Los datos privados y operaciones requieren APIs autenticadas.

## Desarrollo
Requiere Node.js 20 o superior:
```bash
npm install
npm test
npm run dev
```
Consulta `http://127.0.0.1:3000/health` y, cuando el monitor esté configurado, `http://127.0.0.1:3000/health/website`.

Repositorio: https://github.com/juanselhjje-eng/Agente-black-op
