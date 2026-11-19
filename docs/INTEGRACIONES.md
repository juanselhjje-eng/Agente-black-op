# Integraciones y contratos internos

## API pública de Black Ops
El PDF funcional documenta una API POST que recibe `{ method: "GET", path }` para consultar:
- `/api/public/config`
- `/api/public/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`

El módulo `src/integrations/blackops-api.js` implementa únicamente esas consultas GET encapsuladas en POST. Está deshabilitado por defecto. Confirmar con el desarrollador que la URL y el contrato siguen vigentes.

No implementa escritura, autenticación, pagos, inventario ni lectura privada de reservas. No inferir disponibilidad final sin aplicar márgenes y bloqueos.

## Monitor de página
Configurar `WEBSITE_MONITOR_URL` con la URL pública real y `WEBSITE_MONITOR_INTERVAL_MS` (mínimo 30 segundos; por defecto 5 minutos). El monitor hace GET con timeout, registra código HTTP/latencia y detecta cambios de estado. Si se habilitan alertas al dueño, notifica caída y recuperación. No ejecuta transacciones ni comprueba el flujo completo de reservas. Endpoint interno: `GET /health/website`.

## Memoria del dueño
Solo el número autenticado en `OWNER_WHATSAPP_NUMBER` puede enseñar reglas.
- Mensaje natural: el Secretario clasifica la instrucción y guarda una guía.
- `APRENDER: regla`, `MEMORIAS`, `OLVIDAR MEMORIA ID_CORTO`.
- Una corrección actualiza la guía previa solo si su ID se identifica con alta confianza; se conserva historial en `revisions`.
- Las guías se cargan antes de responder clientes. No prevalecen sobre seguridad, privacidad ni hechos verificados.

## Cambios de la página web
El dueño puede pedir un cambio en lenguaje natural. El Secretario lo registra en `webChangeRequests` sin modificar la página.
- `CAMBIO WEB: descripción`: crea una solicitud.
- `CAMBIOS WEB`: lista solicitudes abiertas.
- `APROBAR CAMBIO ID_CORTO`: autoriza la solicitud para implementación controlada; no publica por sí solo.

La implementación real necesita conocer y conectar el repositorio, CMS o constructor de la web, credenciales de mínimo privilegio y un entorno de pruebas. La API pública documentada no permite editar el sitio. El flujo de publicación debe usar rama, diff, vista previa, pruebas, aprobación explícita final, backup/rollback y auditoría.

## Respuesta del dueño a una escalación
Formato:
```
RESPONDER <UUID_DE_LA_CONSULTA>: texto
```
Solo el dueño configurado puede contestar consultas pendientes; el Secretario asocia la respuesta al caso y la reenvía al cliente.

## Seguridad del webhook
En producción se exige `WHATSAPP_APP_SECRET`; sin él el endpoint rechaza los webhooks. Cuando existe, se valida la firma HMAC antes de procesar el cuerpo.

## Estado
No hay conexión de escritura a la web, despliegue productivo ni credenciales reales. No afirmar que cambios o integraciones se han ejecutado hasta verificarlos.


## Investigación web del dueño
El subagente investigador usa Gemini con Google Search grounding. El dueño puede enviar por WhatsApp:
```
INVESTIGAR: competidores de paintball en Antioquia
INVESTIGAR: tendencias recientes de experiencias recreativas y contenido para Instagram
```
La respuesta incluye resumen y enlaces HTTPS que Gemini devuelve como fuentes de grounding. Si no hay fuentes verificables, el resultado lo advierte y no debe tratarse como hecho confirmado. La disponibilidad depende de `GEMINI_API_KEY`, del modelo configurado y de que Google Search grounding esté habilitado para ese modelo/cuenta. No publica contenido ni ejecuta campañas.


## Analista administrativo
El módulo `src/agents/admin-analyst.js` calcula métricas deterministas a partir de un snapshot normalizado:
- Reservas por estado conocido.
- Pagos reportados no verificados separados de pagos confirmados.
- Recaudos confirmados solo con estado `verified`, `paid` o `approved` y `verifiedAt` válido.
- Reembolsos con `refundedAt` se muestran por separado y nunca se suman como recaudo.
- Se evita desbordamiento al sumar importes COP; montos que excederían el entero seguro se excluyen y se cuentan como anomalía.
- Inventario en o por debajo del mínimo configurado.

El proveedor debe inyectar `getSnapshot(range)` y conectarse a una API administrativa autenticada de solo lectura. Actualmente no hay proveedor configurado: el módulo de cálculo y sus pruebas existen, pero no consulta ventas, pagos, reservas privadas ni inventario reales. Los montos deben llegar como enteros en COP; el resumen no calcula utilidad, impuestos ni costos.


## Planificador conservador de disponibilidad
El subagente `supervisorWebAgenda.planAvailability({ from, to, packageType, players })` combina la consulta pública con el planificador puro `src/agents/availability-planner.js`. Reconoce paquetes `standard` (60 min), `tactical` (90 min) y `elite` (120 min), reservas normales de 2 a 10 jugadores, inicios cada 30 minutos, horario base 08:00–23:00 y margen de limpieza de 30 minutos. Lee intervalos explícitos en las listas `busy`, `disabled` y `blocked`; si la API no devuelve un contrato reconocible, responde `unverified` y no genera horarios.

Comando del dueño por WhatsApp:
```
DISPONIBILIDAD: 2026-11-20
DISPONIBILIDAD: 2026-11-20 tactical 4
```
El resultado son candidatos calculados, no reservas bloqueadas ni confirmadas. La API pública documentada es de solo lectura, por lo que la disponibilidad puede cambiar antes de completar la reserva. No usar esta salida como promesa al cliente ni para marcar ventas.

**Pendiente de validación externa:** el documento funcional describe los nombres de las listas de bloqueos, pero no proporciona un ejemplo íntegro de cada objeto. El planificador acepta alias explícitos comunes para inicio/fin y falla cerrado ante campos ausentes, fechas inválidas o estructura desconocida. Antes de habilitar en producción, contrastar con una respuesta real anonimizada del endpoint y probar cierres especiales, partidas abiertas, zonas horarias y reservas que cruzan medianoche.


## Auditor general
El módulo `src/agents/auditor.js` resume los últimos eventos de auditoría sin devolver mensajes, teléfonos ni datos personales. Cuenta tipos de evento e identifica alertas por caídas web, timeouts de escalamiento, fallos de investigación y errores de consulta de disponibilidad. El dueño puede solicitar por WhatsApp `AUDITORIA` o `AUDITORIA HOY`; ambos consultan las últimas 24 horas y presentan conteos/hallazgos. Es auditoría operativa basada en eventos existentes, no una certificación contable, revisión de transacciones privadas ni prueba de que un humano atendió cada caso.


## Planificador de marketing e Instagram
El subagente `planificadorMarketing` combina investigación web fundamentada con generación de un calendario de hasta siete publicaciones. El dueño lo solicita por WhatsApp con `MARKETING: objetivo o tema`. Cada propuesta incluye objetivo, formato, gancho, concepto, caption, CTA, brief visual y métrica sugerida; adjunta fuentes HTTPS si el investigador las obtuvo.

El resultado se etiqueta siempre como borrador y no se publica ni programa. Si no hay fuentes, las propuestas se presentan como ideas creativas, no como tendencias o hechos verificados. Antes de publicar, una persona debe validar precios, promociones, disponibilidad, políticas, derechos de imagen y autorización de uso de contenido. No existe todavía conexión con Instagram Graph API ni permisos para publicar.
