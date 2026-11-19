# Operación 24/7 y despliegue

## Estado
El proyecto está preparado para desarrollo y pruebas. Todavía no existe servidor contratado, dominio, HTTPS público, aplicación Meta configurada ni credenciales de producción. No se ha desplegado.

## Arquitectura
Un proceso Node.js aloja el Secretario y subagentes. Recibe webhooks WhatsApp, procesa mensajes, consulta Gemini y envía respuestas. Workers separados gestionan el timeout de consultas al dueño y el monitoreo HTTP de la página.

## Requisitos antes de producción
- Servidor Windows o Linux contratado, con recursos y acceso administrativo.
- Dominio/subdominio y certificado HTTPS válido.
- Aplicación Meta Business, WhatsApp Business Platform, número habilitado, token y webhook.
- Clave Gemini API y modelo habilitado.
- Número del dueño para escalaciones y alertas.
- Base de datos persistente con backups; JSON es solo desarrollo de una instancia.
- API autenticada/documentada para reservas privadas, ventas, pagos e inventario.
- URL real de la página para `WEBSITE_MONITOR_URL`.
- Repositorio/CMS de la web y credenciales de mínimo privilegio para habilitar cambios mediante ramas y pull requests.

## Desarrollo local
1. Instalar Node.js 20 o superior.
2. Clonar el repositorio.
3. Copiar `.env.example` a `.env` y completar credenciales de desarrollo.
4. Ejecutar `npm install`.
5. Ejecutar `npm test`.
6. Ejecutar `npm run dev`.
7. Abrir `http://127.0.0.1:3000/health`.
8. Configurar `WEBSITE_MONITOR_URL` para probar el monitor y consultar `/health/website`.

El webhook de Meta requiere HTTPS público. Para pruebas locales se necesita un túnel HTTPS temporal o un entorno de pruebas publicado.

## Despliegue Windows
Cuando se confirme la versión de Windows:
1. Instalar Git y Node.js LTS.
2. Clonar el repositorio en `C:\Apps\Agente-black-op`.
3. Configurar secretos fuera de Git.
4. Ejecutar Node.js como servicio de Windows con inicio automático y recuperación.
5. Publicar webhook por HTTPS mediante IIS como proxy inverso u otra solución revisada.
6. Configurar firewall, logs, sincronización horaria, backups y monitoreo.
7. Verificar arranque tras reinicio y recuperación ante desconexión.
8. Activar tráfico real después de pruebas y aceptación.

## Funciones implementadas en el repositorio
- Webhook de WhatsApp y cliente Cloud API.
- Verificación de firma cuando se configura App Secret; en producción el webhook rechaza solicitudes si no existe el secreto.
- Gemini para respuestas y aprendizaje natural del dueño.
- Escalamiento al dueño y vencimiento de dos minutos.
- Memoria local con correcciones versionadas.
- Solicitudes de cambio web con registro y aprobación preliminar; no ejecutan cambios hasta conectar el repositorio/CMS.
- Monitor HTTP configurable: consulta periódica, código de respuesta, latencia, historial y alertas de caída/recuperación si las alertas del dueño están habilitadas.

## Limitaciones pendientes
- Sin credenciales, no hay mensajes reales de WhatsApp ni respuestas generativas de Gemini.
- Monitor HTTP solo prueba que una URL responde; no comprueba el recorrido completo de reserva ni la salud interna del proveedor.
- No hay escritura en la web hasta conocer su repositorio/CMS y preparar un flujo de rama, revisión, pruebas y despliegue.
- Reportes de ventas, pagos, inventario y reservas privadas necesitan API autenticada.
- Investigación web, Instagram, calendario administrativo y reportes proactivos requieren integraciones y permisos.
- Antes de producción: migrar a base de datos, añadir backups probados, observabilidad, control de acceso, límites y pruebas de carga/seguridad.
