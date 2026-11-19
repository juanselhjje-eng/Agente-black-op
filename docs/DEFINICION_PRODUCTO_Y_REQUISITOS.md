# Black Ops Paintball — definición del producto y requisitos

**Estado:** especificación inicial consolidada  
**Fuente funcional principal:** `blackops-base-conocimiento-chatbot.pdf` (versión 18 de noviembre de 2026)  
**Repositorio:** `juanselhjje-eng/Agente-black-op`

## 1. Qué está pidiendo realmente el cliente

El cliente no está pidiendo solamente un chatbot de preguntas frecuentes. Está describiendo un **agente administrativo conversacional para Black Ops Paintball**, cuyo canal principal de interacción es WhatsApp y cuyo núcleo debe coordinar varias capacidades especializadas.

El sistema debe:
- atender a clientes por WhatsApp con información confiable del negocio;
- actuar proactivamente como administrador virtual: enviar al dueño reportes, alertas y novedades sin esperar a que este los solicite;
- vigilar el estado técnico y funcional de la página y sus flujos, dentro de lo que pueda comprobar;
- investigar tendencias, competencia e ideas de publicidad, y proponer contenido/campañas para Instagram;
- informar el estado del calendario y las reservas;
- informar ventas, ingresos, pagos pendientes/reportados/verificados y evolución comercial, siempre que el sistema exponga esos datos;
- consultar inventario, detectar niveles bajos y alertar sobre necesidades de reposición, siempre que el sitio registre existencias y movimientos;
- apoyar la preparación y, sujeto a permisos oficiales, algunas acciones de Instagram;
- coordinar y revisar las tareas mediante una arquitectura lógica de siete agentes;
- escalar preguntas que no pueda resolver al dueño, esperar dos minutos y, si no hay respuesta, informar al cliente sin inventar.

**Distinción importante:** siete agentes son siete responsabilidades lógicas. No significa que deban desplegarse como siete servidores, modelos o procesos separados. La primera versión puede implementarlos como módulos/agentes dentro de una sola aplicación Node.js, coordinados por un orquestador. Se separarán físicamente solo si escala, seguridad o operación lo justifican.

## 2. Contexto del negocio confirmado por el PDF

Black Ops Paintball es un campo de paintball táctico en Támesis, Antioquia, Colombia. Incluye equipo de protección y árbitros por partida. La reserva es en línea y el campo es privado para cada grupo, excepto las partidas abiertas.

### 2.1 Paquetes y precios (por jugador)
| Paquete | Duración | Bolas | Precio |
|---|---:|---:|---:|
| Estándar | 1 hora | 100 | $35.000 |
| Táctico | 1,5 horas | 150 | $50.000 |
| Élite | 2 horas | 200 | $60.000 |
| Personalizado | 1 a 4 horas, pasos de 30 min | 100 a 5.000, pasos de 50 | Calculado |

Personalizado: parte de $35.000 (1 hora, 100 bolas); suma $10.000 por cada 30 minutos extra y $5.000 por cada 50 bolas extra. Total = precio por jugador × número de jugadores, menos descuentos. Estos datos pueden cambiar: se debe preferir consulta en vivo a la API pública.

### 2.2 Horario y disponibilidad
- Horario publicado: todos los días de 8:00 a. m. a 11:00 p. m., sujeto a cierres del dueño.
- Inicios cada 30 minutos.
- Deben quedar 30 minutos libres entre partidas para alistamiento.
- Reserva para hoy (si la hora no pasó) y hasta seis meses adelante.
- Llegar 30 minutos antes.
- Reserva normal: mínimo 2 y máximo 10 jugadores.
- Partidas abiertas: desde un jugador, hasta llenar cupos.

No prometer disponibilidad basándose solamente en el horario general. Consultar la API de disponibilidad desde el servidor, y respetar reservas activas, cierres y bloqueos más el margen de 30 minutos.

### 2.3 Flujo de reserva y pago
La página requiere crear cuenta/iniciar sesión, ingresar datos del responsable, elegir paquete, jugadores, fecha y hora, aceptar términos y política, y efectuar el pago. El código de reserva tiene ocho caracteres y se activa una vez el equipo verifica el pago.

Pagos indicados:
- Transferencia desde la página: total por Nequi y comprobante adjunto.
- Efectivo en el campo: anticipo mínimo del 20% por Nequi y saldo en efectivo.
- Por WhatsApp: horario apartado 30 minutos; si no se confirma el pago, se libera.
- Nequi: 322 655 7479, a nombre de Black Ops Paintball.

Estados: Pendiente de pago, Pago reportado, Agendada, Concretada, Cancelada, Expirada y Vencida. El bot no debe afirmar que una reserva está confirmada ni que un pago fue verificado salvo que una fuente autorizada lo confirme.

### 2.4 Cambios, cancelaciones y reglas
- El cliente puede cancelar desde Mis reservas cuando está Pendiente de pago o Pago reportado.
- Una reserva Agendada se cambia/cancela por WhatsApp al 311 334 8774.
- Anticipo del 20%: reembolsable únicamente si se cancela dentro de las 24 horas siguientes a reservar.
- Reembolsos de pagos completos: los revisa el equipo por WhatsApp.
- Por lluvia fuerte, tormenta o fuerza mayor, se ofrece reprogramar sin costo.
- Códigos de descuento: un uso, no canjeables por dinero, no acumulables.
- Fidelización: diez partidas validadas equivalen a una entrada Estándar gratis para un jugador.

### 2.5 Seguridad y atención
- Careta obligatoria en zonas de juego y obedecer al personal.
- No jugar bajo efectos de alcohol u otras sustancias.
- Menores acompañados o autorizados por padre, madre o acudiente.
- Puede haber marcas o moretones; informar condiciones de salud antes de jugar.
- Daños intencionales o por mal uso evidente pueden cobrarse.
- PQRS desde cuenta o WhatsApp; plazo indicado: máximo 15 días hábiles.
- Emergencias, lesiones y quejas serias: derivación inmediata al equipo y al canal PQRS.

### 2.6 Información pendiente del negocio
El PDF señala explícitamente que no se debe inventar:
- dirección exacta y cómo llegar;
- edad mínima;
- política completa de reembolsos para pagos completos y ausencias;
- correo y redes sociales;
- servicios adicionales (parqueadero, alimentación, cumpleaños o eventos empresariales).

Hasta confirmación, responder: **“Escríbenos por WhatsApp y te confirmamos”**.

## 3. Arquitectura funcional solicitada: siete agentes

| Agente | Responsabilidad | Entradas principales | Resultado |
|---|---|---|---|
| Orquestador | Recibir tarea, clasificar intención, asignar agente, coordinar y controlar el flujo | Mensajes, eventos, tareas programadas | Plan y respuesta/acción coordinada |
| Revisor | Validar exactitud, consistencia, políticas y resultados antes de responder o actuar | Borrador, fuentes, acción propuesta | Aprobación, corrección o bloqueo |
| Investigador web | Investigar tendencias, competidores, referencias e ideas publicitarias | Consultas del dueño, temas, contexto comercial | Hallazgos con fuentes, fecha e ideas |
| Atención WhatsApp | Entender al cliente, responder con base verificada, orientar reserva y escalar | Mensajes entrantes y base/API pública | Respuesta, derivación o pregunta pendiente |
| Secretario del dueño | Mantener informado proactivamente al dueño: preguntas, alertas, novedades, resúmenes y reportes programados | Incidentes, preguntas, eventos, métricas de reservas/ventas/pagos/inventario y hallazgos de otros agentes | Notificaciones, alertas e informes por WhatsApp |
| Analista administrativo/comercial (capacidad coordinada por Orquestador y Auditor, no un octavo agente) | Consolidar calendario, reservas, ventas, pagos e inventario; calcular indicadores y detectar variaciones | Datos administrativos autorizados del sistema de reservas, pagos y stock | Resumen operativo y comercial, alertas y tendencias |
| Supervisor web y agenda | Vigilar disponibilidad y funcionamiento de la página; revisar calendario, reservas y, si hay acceso, inventario | URL, API pública, APIs autenticadas y fuentes administrativas autorizadas | Alertas de errores/cambios, agenda, reservas e inventario |
| Investigador web | Investigar mercado, tendencias y competidores para proponer oportunidades de publicidad | Fuentes públicas web, redes y contexto comercial | Informe con enlaces, fecha, hallazgos e ideas accionables |
| Auditor general | Revisar trazabilidad y desempeño de todos los agentes | Logs, eventos, respuestas, errores | Informe de funcionamiento y hallazgos |

### Reglas transversales
1. El Revisor debe verificar afirmaciones con base de conocimiento o fuentes autorizadas; no convierte una suposición del modelo en un hecho.
2. El Secretario del dueño debe iniciar comunicaciones proactivas: reportes programados (por ejemplo, diario y semanal) y alertas inmediatas cuando se detecten incidentes o condiciones importantes. La frecuencia y los umbrales exactos deben acordarse.
3. El informe administrativo debe separar claramente reservas, ventas, pagos e inventario. No asumir que una reserva equivale a una venta cobrada ni que un comprobante reportado equivale a un pago verificado.
4. Las recomendaciones publicitarias deben incluir fuentes/enlaces, fecha de consulta, por qué pueden servirle al negocio y una propuesta concreta. Distinguir hallazgos verificables de ideas generadas por IA.
5. No afirmar que la página, el calendario, los pagos o el inventario están supervisados si no existe una fuente técnica disponible y autorizada para consultarlos.
2. Ningún agente puede inventar disponibilidad, precios, confirmaciones de pago o políticas.
3. Acciones externas (publicar en Instagram, modificar agenda, cancelar/crear reservas) requieren API, permisos y autorización expresa. Una capacidad conversacional no implica permiso para ejecutar la acción.
4. Las consultas al dueño deben registrar la pregunta, cliente/conversación relacionada, hora de inicio, vencimiento, estado y respuesta recibida.
5. El Auditor debe generar trazabilidad sin exponer datos de clientes innecesarios.

## 4. Flujo de escalamiento al dueño: regla de dos minutos

Cuando Atención WhatsApp no encuentre una respuesta respaldada:
1. Crear un caso de consulta pendiente con identificador y marca de tiempo.
2. El Secretario del dueño envía la pregunta al número administrativo configurado, incluyendo contexto mínimo y una forma sencilla de responder.
3. El sistema espera hasta **2 minutos** por respuesta del dueño.
4. Si llega respuesta dentro del plazo, se valida y se contesta al cliente.
5. Si no llega respuesta en 2 minutos, contestar al cliente que no se pudo confirmar la información y ofrecer atención directa por WhatsApp al **311 334 8774**.
6. Registrar el caso como vencido/no resuelto para seguimiento e informe.

Consideraciones técnicas:
- El temporizador debe persistir en base de datos/cola; no depender de mantener una petición HTTP abierta.
- Evitar consultas duplicadas para el mismo mensaje/caso.
- Manejar respuestas tardías: registrarlas y permitir seguimiento, pero no enviar mensajes contradictorios automáticamente.
- Definir cómo autenticar la respuesta del dueño y cómo asociarla al caso.
- La regla de dos minutos aplica a preguntas sin respuesta segura; lesiones/emergencias y quejas graves se derivan de inmediato.

## 5. Arquitectura técnica recomendada

### Componentes
- **WhatsApp Business Platform / Cloud API:** entrada de mensajes por webhook y envío de respuestas. Requiere número, cuenta de Meta Business, aplicación, token y configuración de webhook.
- **Node.js + JavaScript:** servidor, webhooks, lógica conversacional, orquestación y módulos de agentes.
- **Gemini API:** interpretación, clasificación, generación y apoyo a agentes. La salida del modelo debe estar limitada por herramientas y fuentes autorizadas.
- **Base de datos:** negocio/configuración, conversaciones, casos pendientes, reservas consultadas, tareas, logs y auditoría. El PDF menciona Supabase; confirmar si se reutilizará el proyecto Supabase existente.
- **Cola/worker y scheduler:** vencimiento de 2 minutos, tareas periódicas, resúmenes y vigilancia. Puede implementarse con un worker persistente/cola compatible con el hosting.
- **API pública del sitio/Supabase:** según el PDF, expone configuración pública y disponibilidad. No se documenta acceso público a ventas, pagos, inventario ni detalles privados de reservas.
- **Conectores administrativos autenticados:** serán necesarios para consultar información privada de reservas, calendario, ventas, pagos e inventario. Deben ser APIs/endpoints oficiales del sitio o acceso backend autorizado, con permisos de solo lectura para el MVP.
- **Instagram Graph API:** integración posterior, únicamente con permisos, activos y revisión/configuración oficial aplicable.
- **Panel administrativo:** opcional. El proyecto puede funcionar sin interfaz web de clientes; un panel interno sería útil para revisar casos, estado de agentes y auditoría.

### ¿Hace falta una página web?
No hace falta crear una página web propia para que los clientes conversen con el agente si el canal será exclusivamente WhatsApp.

**Discrepancia que debe aclararse:** la indicación más reciente del proyecto dice que la página web aún no se ha creado, pero el PDF referencia una URL de reservas (`https://blackops.visualdigital.workers.dev`) y un endpoint Supabase que describe como configuración real de la página. Hay que confirmar si esa URL corresponde a un prototipo, una demo, un entorno temporal o una página operativa. Hasta confirmarlo, tratar la URL y la API como referencias documentales pendientes de validación, no como una integración garantizada ni como dependencia de producción.

El chatbot de WhatsApp puede construirse y probarse sin una web pública. Puede comenzar con la base de conocimiento aprobada y, cuando el negocio confirme el estado de la página y entregue los accesos, integrar las consultas que estén autorizadas.

### Flujo técnico general
WhatsApp webhook → validación del evento → Orquestador → Atención WhatsApp/otro agente → fuentes autorizadas y herramientas → Revisor → respuesta WhatsApp.  
Para casos sin respuesta: Orquestador → Secretario del dueño → espera persistente de 2 minutos → respuesta del dueño o cierre por timeout.  
Los eventos, acciones y resultados → Auditor general.

## 6. Integración referenciada en el PDF y brecha de datos administrativos

El PDF documenta este endpoint como API pública de la página. **Su vigencia y disponibilidad deben verificarse con el cliente antes de integrarlo.**

Endpoint base: `https://yxldniscfjmzuvikgwaf.supabase.co/functions/v1/api`  
Método: POST; encabezado `Content-Type: application/json`.

Consulta pública de configuración:
```json
{ "method": "GET", "path": "/api/public/config" }
```

Incluye precios, horario, máximo de jugadores, teléfonos y partidas abiertas. Campos citados:
- `settings.price_standard`, `settings.price_tactical`, `settings.price_elite`
- `settings.price_extra_half_hour`, `settings.price_extra_50_balls`
- `settings.open_time`, `settings.close_time`, `settings.max_players`
- `openMatches`: `booking_date`, `time_slot`, `package_name`, `spots_left`

Consulta de disponibilidad:
```
/api/public/availability?from=2026-11-20&to=2026-11-27
```
Devuelve `busy`, `disabled` y `blocked`. Al evaluar horas libres, incluir margen de 30 minutos tras cada reserva.

Restricciones documentadas:
- Consultar desde el servidor del chatbot; otro dominio en navegador puede ser rechazado por CORS.
- Estas dos son las únicas consultas disponibles sin iniciar sesión.
- El bot no puede crear, modificar ni borrar datos mediante esta API pública.

### Datos que el dueño quiere recibir y acceso que falta confirmar

El alcance ampliado requiere que el agente envíe al dueño información periódica y alertas sobre:

| Información | Qué debería reportar | Fuente técnica necesaria |
|---|---|---|
| Estado de la página | Disponibilidad, errores HTTP, formularios/flujo de reserva y fallos observables | URL operativa, chequeos sintéticos y acceso a logs/monitorización si se requiere diagnóstico interno |
| Calendario y reservas | Reservas próximas, estados, cancelaciones, ocupación y disponibilidad | API autenticada o vistas administrativas autorizadas; la API pública solo expone disponibilidad agregada/ocupación según el PDF |
| Ventas | Total vendido por día/semana/mes, paquetes y comparación de períodos | Datos administrativos de órdenes/reservas y reglas contables acordadas |
| Pagos | Pendientes, reportados, verificados, valores y conciliación | API/tabla de pagos con estados y permisos de lectura; no inferir verificación desde un comprobante |
| Inventario | Existencias, mínimos, agotados, entradas/salidas y consumo | Módulo de inventario y registro de movimientos; confirmar que realmente existe en la página |
| Publicidad | Tendencias, competencia, oportunidades y calendario de contenido | Investigación web y fuentes públicas; cuentas sociales si se requiere analítica privada |

**Brecha importante:** el PDF solo documenta dos consultas públicas: configuración (`/api/public/config`) y disponibilidad (`/api/public/availability`). No documenta endpoints para ventas, pagos, inventario ni lectura completa de reservas privadas. Por tanto, no se debe prometer que el agente puede leer esos datos solo porque aparezcan en un panel de la página. El desarrollador del sitio debe proporcionar APIs autenticadas, documentación o vistas de backend autorizadas. El acceso debe ser de solo lectura para los informes, salvo que el cliente apruebe expresamente otras acciones.

Si la página todavía no está construida, estos módulos deben contemplarse desde el diseño de su base de datos y API para no tener que reconstruir la integración después.

**Seguridad:** no colocar credenciales o secretos en frontend, repositorio ni prompts. Aunque el endpoint es descrito como público, validar formato, disponibilidad y errores; no consultar datos privados ni inventar endpoints de escritura.

## 7. Límites de alcance y fases

### Fase 0 — Aclaración y accesos
- Confirmar número de WhatsApp y acceso a Meta Business/Cloud API.
- Confirmar credenciales y proyecto Supabase/API de la página.
- Definir número del dueño y método seguro de respuesta a preguntas pendientes.
- Confirmar hosting, base de datos, retención y responsables.
- Obtener datos pendientes del negocio listados en 2.6.
- Definir activos/permisos de Instagram.

### Fase 1 — MVP de atención WhatsApp
- Webhook WhatsApp y respuestas.
- Gemini conectado con instrucciones y recuperación desde la base de conocimiento.
- Consulta en vivo de configuración y disponibilidad pública.
- Revisor de respuestas y política de no inventar.
- Escalamiento al dueño con timeout persistente de dos minutos.
- Registro de conversaciones y auditoría básica.

### Fase 2 — Asistencia administrativa y gerencial proactiva
- Secretario del dueño con mensajes proactivos, alertas y resúmenes programados por WhatsApp.
- Supervisor de disponibilidad, chequeos de página/API y calendario.
- Integración administrativa de solo lectura para reservas, ventas, pagos e inventario, cuando el sitio exponga APIs autorizadas.
- Informes diarios/semanales y alertas por umbrales acordados.
- Auditor general, informes de funcionamiento y métricas.

### Fase 3 — Investigación y marketing
- Investigador web con resultados fechados y fuentes.
- Generación de ideas, copies, calendarios y piezas sugeridas para Instagram.
- Integración de Instagram para acciones permitidas tras permisos oficiales y aprobación humana.

### Fase 4 — Expansión
- Panel administrativo opcional.
- Más integraciones o automatizaciones únicamente con interfaces autorizadas y alcance acordado.

## 8. Requisitos no funcionales y controles
- Secretos en variables de entorno/gestor de secretos; nunca commitearlos.
- Validación de firma/autenticidad de webhooks y control de acceso del dueño.
- Idempotencia para no responder dos veces al mismo evento.
- Límites de tasa, reintentos y manejo de fallos de WhatsApp/Gemini/API.
- Logs estructurados, correlación por conversación/caso y auditoría de acciones.
- Minimización de datos personales; no almacenar información que no sea necesaria.
- El bot no debe pedir contraseñas, tarjetas, claves bancarias ni códigos internos.
- No revelar datos de otros clientes.
- Emergencias, lesiones y quejas graves: derivación inmediata.
- Diferenciar información fija, información dinámica y datos aún no confirmados.
- Respuestas en español, cercanas, claras, breves y de tú.

## 9. Preguntas que el cliente/desarrollador debe cerrar

1. ¿El número de WhatsApp ya está registrado en WhatsApp Business Platform o se debe hacer el alta?
2. ¿Cuál es el número de WhatsApp del dueño para recibir escalaciones y reportes? ¿Es distinto del número público 311 334 8774?
3. ¿Cómo contestará el dueño la consulta: texto libre, comando con ID o botón/respuesta estructurada?
4. ¿Qué hacer con respuestas del dueño que lleguen después de los dos minutos?
5. ¿Dónde se desplegará el servidor y el worker persistente? ¿Qué disponibilidad se espera?
6. ¿Se usará el mismo proyecto Supabase del sitio? ¿Quién entrega credenciales/contratos de API?
7. ¿Qué frecuencia y criterios tendrá la vigilancia de la web? ¿Qué URLs además de la API deben observarse?
8. ¿Qué activos de Instagram existen y qué acciones quiere automatizar exactamente: leer comentarios/mensajes, programar publicaciones, publicar, responder o solo generar borradores?
9. ¿El dueño debe aprobar siempre el contenido o las publicaciones antes de publicarse?
10. ¿Qué debe incluir el informe diario y a qué hora se envía? ¿También quiere informe semanal o mensual?
11. ¿Qué indicadores de ventas quiere ver (ingresos brutos/netos, ventas por paquete, reservas, ticket promedio, comparación con períodos anteriores)?
12. ¿Qué estados de pago existen en el sistema y cuál se considera pago efectivamente verificado?
13. ¿Qué información y movimientos registra el inventario (bolas, máscaras, marcadoras, uniformes, repuestos, consumibles)? ¿Hay stock mínimo por elemento?
14. ¿Qué alertas quiere recibir inmediatamente (web caída, error al reservar, pago pendiente, inventario bajo, cancelación, sobreventa)?
15. ¿Qué datos administrativos expone la página y qué API autenticada/documentación entregará el desarrollador?
16. ¿El dueño autoriza acceso de solo lectura a reservas, ventas, pagos e inventario? ¿Qué campos deben ocultarse por privacidad?
17. ¿Qué indicadores de marketing le interesan (alcance, interacciones, mensajes, clics, reservas atribuidas)?
18. ¿Qué activos de Instagram existen y qué acciones quiere automatizar exactamente: leer comentarios/mensajes, programar publicaciones, publicar, responder o solo generar borradores?
19. ¿El dueño debe aprobar siempre el contenido o las publicaciones antes de publicarse?
20. ¿Qué datos pendientes del PDF ya fueron definidos por el negocio?
21. ¿Qué se espera que haga el agente con las reservas: solo orientar y consultar disponibilidad, o se negociará una API autenticada para operaciones? El PDF actual prohíbe al bot crear, modificar o borrar reservas desde la API pública?
11. ¿Qué datos pendientes del PDF ya fueron definidos por el negocio?
12. ¿Qué se espera que haga el agente con las reservas: solo orientar y consultar disponibilidad, o se negociará una API autenticada para operaciones? El PDF actual prohíbe al bot crear, modificar o borrar reservas desde la API pública.

## 10. Criterios de aceptación iniciales

- Un cliente escribe al número de WhatsApp y recibe respuesta en español basada en datos del negocio.
- El bot consulta precios/configuración actuales cuando corresponda y no presenta la disponibilidad como confirmada sin consultar la API.
- El bot orienta al cliente hacia la página de reservas y no afirma haber creado/cancelado/modificado reservas o confirmado pagos.
- Ante una pregunta desconocida, notifica al dueño y espera exactamente el plazo operativo configurado de 2 minutos.
- Sin respuesta del dueño, avisa que no pudo confirmar y comparte el contacto directo 311 334 8774.
- Emergencias, lesiones y quejas graves se derivan inmediatamente.
- Las respuestas y decisiones quedan registradas para auditoría.
- El dueño recibe un informe programado que separa estado de la página, agenda/reservas, ventas, pagos, inventario y recomendaciones de publicidad, mostrando solo métricas respaldadas por fuentes conectadas.
- Se generan alertas cuando se incumplen umbrales acordados y se identifica la fuente y hora de detección.
- Si no hay acceso a ventas, pagos o inventario, el informe lo indica explícitamente como dato no disponible, sin estimarlo ni inventarlo.
- El fallo de Gemini, WhatsApp o la API no provoca que el sistema invente datos; genera respuesta de contingencia y registro.
- Los agentes tienen responsabilidades separadas y el Orquestador coordina el flujo.

## 11. Fuente y jerarquía de información

1. Configuración/API en vivo del negocio para los datos dinámicos que expone.
2. Base de conocimiento aprobada por el negocio para políticas e información estable.
3. Respuesta autenticada del dueño para datos todavía no documentados.
4. Si no hay fuente suficiente, escalar o declarar que no se puede confirmar.

Este documento consolida los requisitos expresados en la conversación y el PDF adjunto. Los puntos marcados como preguntas siguen siendo decisiones pendientes; no deben tratarse como requisitos aprobados.
