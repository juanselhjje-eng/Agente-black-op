# Operación 24/7 y despliegue

## Estado
El proyecto está preparado para desarrollar y probar localmente. Todavía no existe un servidor contratado, dominio, HTTPS público, aplicación de Meta configurada ni credenciales de producción. No se ha desplegado el agente.

## Arquitectura
Un único proceso Node.js aloja el Secretario principal y sus subagentes especializados. El proceso recibe webhooks de WhatsApp, procesa mensajes, llama a Gemini y envía respuestas mediante WhatsApp Cloud API. Un worker revisa consultas al dueño y aplica el vencimiento de dos minutos.

## Requisitos antes de producción
- Servidor Windows o Linux contratado, con recursos suficientes y acceso administrativo.
- Dominio o subdominio y certificado HTTPS válido.
- Aplicación de Meta Business, WhatsApp Business Platform, número habilitado, token y webhook.
- Clave Gemini API y modelo habilitado.
- Número del dueño para escalaciones y autorización de notificaciones.
- Base de datos persistente con copias de seguridad. El almacenamiento JSON actual es solo una base inicial para desarrollo de una instancia; no es apropiado para producción multiinstancia.
- API autenticada y documentada del sistema web para reservas privadas, ventas, pagos e inventario si se desean esos reportes.

## Desarrollo local
1. Instalar Node.js 20 o superior.
2. Clonar el repositorio.
3. Copiar `.env.example` a `.env` y completar las credenciales de desarrollo.
4. Ejecutar `npm install`.
5. Ejecutar `npm test`.
6. Ejecutar `npm run dev`.
7. Abrir `http://127.0.0.1:3000/health`.

El webhook real de Meta requiere una URL HTTPS pública; para pruebas locales se necesitará un túnel HTTPS temporal o un entorno de pruebas publicado.

## Despliegue Windows previsto
Cuando el usuario cree/provisione el servidor y confirme la versión de Windows:
1. Instalar Git y Node.js LTS.
2. Clonar el repositorio en `C:\Apps\Agente-black-op`.
3. Configurar secretos como variables de entorno fuera de GitHub.
4. Configurar un servicio de Windows (WinSW o NSSM) con inicio automático y recuperación ante fallos.
5. Publicar el webhook por HTTPS mediante IIS como proxy inverso u otra solución revisada.
6. Configurar firewall, logs, sincronización horaria, backups y monitoreo.
7. Verificar arranque tras reinicio y recuperación ante desconexión.
8. Activar tráfico real solo después de pruebas de seguridad y aceptación.

## Limitaciones actuales
- Sin credenciales, no se envían ni reciben mensajes reales de WhatsApp.
- Sin GEMINI_API_KEY, se usa respuesta de contingencia.
- El dueño autenticado puede responder una escalación con `RESPONDER UUID: respuesta`; el Secretario asocia la respuesta al caso y la reenvía al cliente.
- El dueño puede enseñar instrucciones en lenguaje natural; Gemini las clasifica y las guarda como memoria persistente local. `APRENDER:` permite guardado explícito sin Gemini. `MEMORIAS` consulta y `OLVIDAR MEMORIA ID_CORTO` desactiva.
- Los reportes de ventas, pagos, inventario y reservas privadas no están implementados por falta de API autenticada.
- La investigación web, publicación en Instagram, revisión real del sitio y sincronización de calendario aún requieren integraciones y permisos.
- Los reportes proactivos diarios/semanales no están implementados.
