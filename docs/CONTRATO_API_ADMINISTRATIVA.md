# Contrato de API administrativa de Black Ops

## Objetivo

Permitir que el Secretario de Black Ops consulte información administrativa para generar reportes de reservas, pagos e inventario. Este documento define lo que necesita el agente; **no afirma que estos endpoints ya existan**.

La API pública actualmente documentada en `DEFINICION_PRODUCTO_Y_REQUISITOS.md` solo expone configuración pública y disponibilidad. No documenta acceso a reservas privadas, pagos ni existencias. Por eso, el proveedor administrativo seguirá deshabilitado hasta que el responsable del sitio confirme o implemente una API autenticada.

## Requisitos de seguridad

- Acceso exclusivamente de solo lectura para el agente.
- HTTPS obligatorio.
- Autenticación servidor a servidor (token/API key en variable secreta del servidor, nunca en frontend ni Git).
- El token debe tener permisos mínimos para consultar reservas, pagos e inventario; no crear, modificar ni cancelar registros.
- No devolver números completos de tarjetas, datos bancarios sensibles, contraseñas ni documentos personales si no son necesarios.
- Registrar auditoría de consultas sin almacenar secretos.
- Respuestas JSON con fechas ISO 8601 y montos en pesos colombianos como enteros COP.
- El backend debe aplicar paginación o límites y rangos de fechas.

## Endpoints requeridos

El desarrollador puede implementar estas rutas o indicar las rutas equivalentes que ya existan. No se deben inventar rutas en producción.

### 1. Reservas

`GET /api/admin/reservations?from=YYYY-MM-DD&to=YYYY-MM-DD`

Respuesta esperada:

```json
{
  "source": "blackops-admin-api",
  "asOf": "2026-11-20T15:00:00Z",
  "reservations": [
    {
      "id": "identificador-interno",
      "status": "scheduled",
      "createdAt": "2026-11-20T12:00:00Z",
      "updatedAt": "2026-11-20T12:30:00Z",
      "date": "2026-11-25",
      "players": 4,
      "packageType": "tactical",
      "totalCop": 200000
    }
  ],
  "nextCursor": null
}
```

Estados admitidos por el analista: `pending_payment`, `payment_reported`, `scheduled`, `completed`, `cancelled`, `expired`, `overdue`. El backend debe entregar el estado real y no transformarlo para el reporte.

### 2. Pagos

`GET /api/admin/payments?from=YYYY-MM-DD&to=YYYY-MM-DD`

Respuesta esperada:

```json
{
  "source": "blackops-admin-api",
  "asOf": "2026-11-20T15:00:00Z",
  "payments": [
    {
      "id": "identificador-interno",
      "reservationId": "identificador-reserva",
      "status": "verified",
      "amountCop": 200000,
      "verifiedAt": "2026-11-20T14:00:00Z",
      "refundedAt": null
    }
  ],
  "nextCursor": null
}
```

Estados de recaudo reconocidos: `verified`, `paid`, `approved`, siempre con `verifiedAt` válido. Los pagos `reported` deben permanecer separados y nunca contarse como dinero recibido. Los reembolsos deben identificarse con `status: "refunded"` y `refundedAt`.

### 3. Inventario

`GET /api/admin/inventory`

Respuesta esperada:

```json
{
  "source": "blackops-admin-api",
  "asOf": "2026-11-20T15:00:00Z",
  "inventory": [
    {
      "sku": "BALLS",
      "name": "Bolas de paintball",
      "quantity": 1200,
      "minimum": 500
    }
  ]
}
```

`quantity` y `minimum` deben ser números no negativos. El mínimo debe corresponder al umbral de reposición definido por el negocio.

## Alternativa: endpoint agregado

Si el backend prefiere una sola ruta, puede exponer:

`GET /api/admin/analytics-snapshot?from=YYYY-MM-DD&to=YYYY-MM-DD`

Con un objeto que incluya `source`, `asOf`, `reservations[]`, `payments[]` e `inventory[]`, respetando exactamente los campos y reglas anteriores.

## Criterios de aceptación

1. Las rutas requieren autenticación y solo lectura.
2. Un usuario sin token recibe HTTP 401/403.
3. La respuesta incluye `source` y `asOf`.
4. Los estados y montos corresponden a los registros reales del sistema.
5. Los pagos reportados no se presentan como verificados.
6. Los reembolsos se separan del recaudo.
7. El inventario entrega cantidad y mínimo de reposición.
8. Se documentan límites de rango, paginación y zona horaria.
9. El responsable entrega URL base, rutas, método de autenticación y ejemplos de respuesta; los secretos se configuran directamente en el servidor y no se envían por chat.

## Estado de integración

**Pendiente de confirmación del desarrollador/administrador del sitio.** Hasta validar la API real y probar autenticación y respuestas, el Secretario debe indicar que los datos privados de reservas, pagos e inventario no están disponibles. No debe usar la API pública de disponibilidad como sustituto de los registros administrativos.
