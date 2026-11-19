# Integraciones y contratos internos

## API pública de Black Ops
El PDF funcional documenta una API POST que recibe `{ method: "GET", path }` para consultar:
- `/api/public/config`
- `/api/public/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`

El módulo `src/integrations/blackops-api.js` implementa únicamente esas consultas GET encapsuladas en POST. Está deshabilitado por defecto. Confirmar con el desarrollador que la URL y el contrato siguen vigentes.

No implementa escritura, autenticación, pagos, inventario ni lectura privada de reservas. No inferir disponibilidad final sin aplicar márgenes y bloqueos.

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
RESPONDER <UUID_DE_LA_CONSULTA>: texto de respuesta
```
Solo el dueño configurado puede contestar consultas pendientes; el Secretario asocia la respuesta al caso y la reenvía al cliente.

## Estado
No hay conexión de escritura a la web, despliegue productivo ni credenciales reales. No afirmar que cambios o integraciones se han ejecutado hasta verificarlos.
