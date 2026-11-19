# Integraciones y contratos internos

## API pública de Black Ops
El PDF funcional documenta una API POST que recibe un objeto `{ method: "GET", path }`:
- `/api/public/config`
- `/api/public/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`

El módulo `src/integrations/blackops-api.js` implementa únicamente esas consultas GET encapsuladas en POST. Está deshabilitado por defecto. Para habilitarlo se deben configurar `BLACKOPS_PUBLIC_API_BASE_URL` y `BLACKOPS_API_ENABLED=true`, después de confirmar con el desarrollador del sitio que la URL y el contrato siguen vigentes.

No implementa escritura, autenticación, pagos, inventario ni lectura privada de reservas. No se debe inferir disponibilidad final sin aplicar el margen de 30 minutos entre partidas y validar cierres/bloqueos.

## Respuesta del dueño a una escalación
El dueño debe usar el mismo número configurado en `OWNER_WHATSAPP_NUMBER`. El Secretario solo procesa comandos de ese remitente.

Formato:
```
RESPONDER <UUID_DE_LA_CONSULTA>: texto de respuesta
```

Si la consulta sigue pendiente, el Secretario la marca como respondida y reenvía el texto al cliente. Si venció o ya fue respondida, informa al dueño que no está pendiente. Este flujo necesita que la integración de WhatsApp esté configurada y que el número del dueño esté autorizado.
