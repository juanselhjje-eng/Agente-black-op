# Ingreso seguro de datos comerciales

El backend expone tres endpoints para que un sistema confiable registre o actualice datos comerciales en PostgreSQL. No son endpoints públicos: requieren la cabecera `x-admin-api-key` y la variable `ADMIN_API_KEY`. Si la clave no está configurada, responden `503`; una clave incorrecta responde `401`.

Configura una clave larga, aleatoria y privada en el entorno del servidor. Nunca la envíes por WhatsApp, no la subas a Git y no la incluyas en el frontend. En producción, publica estos endpoints únicamente detrás de HTTPS. No uses una clave de prueba en producción.

## Reservas

`POST /admin/v1/reservations`

Campos requeridos:
- `reservationDate`: fecha `YYYY-MM-DD`.
- `players`: entero entre 1 y 500.
- `packageType`: texto de máximo 80 caracteres.
- `totalCop`: entero no negativo en pesos colombianos.

Opcionales: `id` (UUID estable del sistema origen), `reservationCode`, `status` (por defecto `pending_payment`) y `startsAt` (fecha/hora ISO). Si se reenvía el mismo `id`, se actualiza ese registro.

## Pagos

`POST /admin/v1/payments`

Campos requeridos: `amountCop` (entero no negativo) y `status`. El estado predeterminado es `reported`. Opcionales: `id` (UUID estable del origen), `reservationId` (UUID de la reserva interna), `verifiedAt` y `refundedAt`.

Los estados `verified`, `paid` y `approved` exigen `verifiedAt`; el estado `refunded` exige `refundedAt`. La API confía en el sistema que posee la clave: solo debe recibir pagos verificados desde una fuente que realmente confirme el recaudo. Un mensaje del cliente o un comprobante no verificado no debe enviarse como pago verificado.

## Inventario

`POST /admin/v1/inventory`

Campos requeridos: `sku`, `name`, `quantity` y `minimum`. Cantidades y mínimos son enteros no negativos. El SKU identifica el artículo; repetirlo actualiza su existencia y mínimo.

## Consultas administrativas

- `GET /admin/v1/snapshot`: devuelve los registros de reservas, pagos e inventario. Admite `start` y `end` como parámetros ISO para filtrar reservas y pagos por fecha de creación.
- `GET /admin/v1/summary`: devuelve el resumen calculado por el analista administrativo. Admite los mismos parámetros y usa la misma clave de autenticación.

Ambas consultas requieren `x-admin-api-key`; no exponen datos sin autenticación.

## Ejemplo de llamada

No guardes la clave en el código fuente. En CMD, define la variable en la sesión segura y úsala en la cabecera:

```http
POST /admin/v1/inventory
Content-Type: application/json
x-admin-api-key: <ADMIN_API_KEY>

{"sku":"EJEMPLO-SKU","name":"Artículo de ejemplo","quantity":10,"minimum":3}
```

El ejemplo es ilustrativo y no crea datos reales. No cargues inventario, reservas ni pagos ficticios para probar reportes de negocio. Usa registros reales de una fuente autorizada.

## Límites actuales

Estos endpoints son una puerta de entrada autenticada; no conectan por sí solos un POS, agenda, pasarela de pagos ni inventario. La integración de origen debe mapear sus eventos a estos contratos y enviar identificadores estables para evitar duplicados. Las tablas permanecen vacías hasta recibir datos reales.
