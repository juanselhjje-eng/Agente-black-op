# Estado real del proyecto Black Ops Paintball

**Corte:** 19 de noviembre de 2026  
**Estimación global corregida:** aproximadamente **46%** de alcance funcional.  
**Estado:** prototipo backend en desarrollo; no está listo para producción.

## Cómo se calcula el avance

El porcentaje mide capacidades del producto final que están implementadas, integradas y probadas, no cantidad de archivos, commits ni módulos con nombre. Una capacidad que solo tiene una interfaz inicial o un stub no se considera terminada. Las integraciones que dependen de credenciales, APIs privadas o infraestructura del negocio permanecen pendientes aunque exista código de preparación.

La estimación es orientativa y debe revisarse al cerrar cada bloque de aceptación. No equivale a disponibilidad productiva.

## Matriz de capacidades

| Capacidad comprometida | Estado comprobable | Avance estimado |
|---|---|---:|
| Backend Node.js y arquitectura modular | Servidor, configuración, módulos y CI; falta endurecimiento y validación productiva | 65% |
| Atención por WhatsApp | Webhook y Cloud API; solicitudes estructuradas de disponibilidad consultan candidatos con validación y fallback humano; falta conectar número/Meta y pruebas reales de extremo a extremo | 50% |
| Gemini y atención inteligente | SDK y generación JSON; sin pruebas con credenciales reales, function calling y orquestación aún limitada | 35% |
| Secretario y coordinación de subagentes | Orquestador conectado; supervisor de agenda y auditor general ejecutan lógica determinista, pero faltan integraciones privadas | 50% |
| Memoria del dueño | Guardar, listar, corregir y desactivar; falta validación de seguridad y pruebas productivas | 70% |
| Escalamiento al dueño | Caso, respuesta y timeout de dos minutos; falta resolver robustez multiinstancia y respuestas tardías | 60% |
| Supervisión web | Comprobación HTTP, historial y alertas; planificador de candidatos con bloqueos públicos, márgenes y comando del dueño, pendiente validar respuesta real de la API | 65% |
| Reportes al dueño | Reportes manuales y programación diaria/semanal opt-in; métricas solo del propio agente | 65% |
| Consulta de configuración y disponibilidad | Cliente público con HTTPS, timeout, validación de fechas/respuestas y errores controlados; planificador de candidatos y pruebas; contrato real aún por validar y sin escritura de reservas | 50% |
| Reservas privadas y calendario operativo | Intake persistente de solicitudes y cola del dueño en JSON/PostgreSQL; sin escritura autenticada, bloqueo ni confirmación de reservas | 10% |
| Ventas, ingresos y pagos | Analista determinista separa recaudos verificados de reembolsos y protege sumas COP contra desbordamiento; falta proveedor autenticado y conciliación real | 35% |
| Inventario y alertas de reposición | Cálculo de mínimos implementado sobre snapshot; falta conectar fuente real de existencias y movimientos | 25% |
| Investigación de competencia y tendencias | Subagente Gemini con Google Search grounding, enlaces HTTPS y advertencia si faltan fuentes; falta validar cuenta/uso real y mejorar trazabilidad | 45% |
| Marketing e Instagram | Planificador genera calendario de hasta 7 piezas con fuentes, CTA, métrica y controles de publicación; no publica ni conecta Instagram Graph API | 30% |
| Revisor y auditor general | Revisor determinista más auditor de eventos con alertas por caídas, consultas fallidas, urgencias y timeouts; resumen no expone datos personales | 50% |
| Despliegue Windows Server | Docker y guías iniciales; no hay servidor, dominio, HTTPS, instalación ni restauración probada | 15% |
| Seguridad, operación y continuidad | HMAC opcional/obligatorio en producción, secretos por entorno, PostgreSQL y scripts; faltan pruebas de seguridad, backups reales y carga | 30% |

## Por qué no corresponde reportar 80%

El 80% no está respaldado por la planeación. Las capacidades centrales que convierten el prototipo en administrador del negocio siguen sin implementarse: reservas privadas, ventas, pagos, inventario, investigación, marketing/Instagram, revisión independiente y despliegue real. Además, investigación y analítica administrativa aún dependen de la configuración real de Gemini y de proveedores privados; el marketing y la integración de Instagram siguen pendientes.

El proyecto tiene una base técnica útil, pero la mayor parte de las funciones administrativas depende de APIs privadas, permisos y datos del negocio que aún no se han entregado.

## Avances comprobados en el repositorio

- Backend Node.js con webhook y cliente de WhatsApp.
- Integración inicial de Gemini.
- Almacenamiento JSON y adaptador PostgreSQL.
- Memoria del dueño y flujo de escalamiento.
- Monitor HTTP con historial, alertas y consulta de estado.
- Reportes operativos manuales y envío automático diario/semanal configurable, desactivado por defecto.
- Orquestador central conectado al flujo de atención y revisor determinista de respuestas con pruebas automatizadas.
- Investigador web con Gemini Google Search grounding, extracción/deduplicación de fuentes HTTPS y comando del dueño `INVESTIGAR:`.
- Analista administrativo determinista para snapshots normalizados: reservas por estado, pagos reportados, recaudos confirmados y reembolsos separados; protege sumas COP contra desbordamiento e inventario bajo mínimo; sin fuente privada conectada.
- Cliente de API pública endurecido con validación de URL HTTPS, fechas reales, rango máximo, timeout, errores seguros y pruebas.\n- Planificador conservador de disponibilidad pública con paquetes, jugadores, bloqueos, márgenes de limpieza y parser validado del comando del dueño; no confirma ni bloquea reservas.\n- Atención al cliente reconoce consultas estructuradas de horarios, valida fecha y cantidad de jugadores, muestra candidatos y deriva al equipo si faltan datos o falla la API; no confirma reservas.
- Flujo de solicitud asistida: valida fecha, hora, paquete y jugadores; persiste la solicitud en JSON/PostgreSQL, notifica al dueño y permite consultar la cola y marcar contacto; nunca bloquea ni confirma cupos.
- Auditor general determinista, con resumen de eventos, hallazgos operativos y protección contra exposición de mensajes/teléfonos; comando `AUDITORIA`.
- Planificador de marketing fundamentado con investigación previa, calendario de hasta siete piezas y borradores de captions/CTA/briefs visuales; comando `MARKETING:` sin publicación automática.
- Dockerfile, Compose, CI y documentación inicial.
- Pruebas automatizadas ejecutadas por GitHub Actions; esto no sustituye pruebas de integración contra Meta, Gemini, PostgreSQL real ni el sitio de reservas.

## Bloqueos externos para cerrar el producto

1. Credenciales y configuración de Meta WhatsApp Business, Gemini y servidor.
2. Confirmar si la URL y API descritas en el PDF son producción, demo o prototipo.
3. Contrato y credenciales de lectura para reservas privadas, pagos, ventas e inventario.
4. Definir frecuencia y umbrales de alertas comerciales e inventario.
5. Acceso al repositorio/CMS de la página y entorno de pruebas para cambios controlados.
6. Cuenta/permisos de Instagram Graph API, si se aprueba publicación asistida.
7. Versión exacta de Windows Server, dominio y certificado HTTPS.

## Criterio para declarar 80%

No se declarará 80% hasta que estén funcionales y probadas en entorno de integración: atención WhatsApp, orquestación real, consultas de disponibilidad y reservas autorizadas, reportes administrativos conectados a datos verdaderos, alertas y programación, revisión/auditoría, investigación/marketing básica y un despliegue reproducible con pruebas de recuperación. Lo que dependa de permisos externos debe estar conectado o explícitamente excluido del alcance aprobado.

## Próxima secuencia de desarrollo

1. Validar el contrato de disponibilidad con una respuesta real anonimizada del endpoint y probar cierres especiales/partidas abiertas.
2. Completar scheduler y validación de reportes programados.
3. Implementar herramientas administrativas con contratos y permisos explícitos cuando el negocio entregue la API.
4. Conectar el proveedor administrativo autenticado y validar su contrato.
5. Mejorar investigación de mercado con fechas y trazabilidad adicional.
6. Ampliar revisor para verificar disponibilidad y operaciones autorizadas; completar auditoría de acciones y anomalías.
7. Completar pruebas de integración, seguridad y despliegue.
