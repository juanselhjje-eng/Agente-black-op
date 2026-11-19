# Estado real del proyecto Black Ops Paintball

**Corte:** 19 de noviembre de 2026  
**Estimación global corregida:** aproximadamente **40%** de alcance funcional.  
**Estado:** prototipo backend en desarrollo; no está listo para producción.

## Cómo se calcula el avance

El porcentaje mide capacidades del producto final que están implementadas, integradas y probadas, no cantidad de archivos, commits ni módulos con nombre. Una capacidad que solo tiene una interfaz inicial o un stub no se considera terminada. Las integraciones que dependen de credenciales, APIs privadas o infraestructura del negocio permanecen pendientes aunque exista código de preparación.

La estimación es orientativa y debe revisarse al cerrar cada bloque de aceptación. No equivale a disponibilidad productiva.

## Matriz de capacidades

| Capacidad comprometida | Estado comprobable | Avance estimado |
|---|---|---:|
| Backend Node.js y arquitectura modular | Servidor, configuración, módulos y CI; falta endurecimiento y validación productiva | 65% |
| Atención por WhatsApp | Webhook, cliente Cloud API y lógica básica; falta conectar número/Meta y pruebas reales de extremo a extremo | 45% |
| Gemini y atención inteligente | SDK y generación JSON; sin pruebas con credenciales reales, function calling y orquestación aún limitada | 35% |
| Secretario y coordinación de subagentes | Orquestador central integrado a la atención; varios subagentes administrativos siguen siendo descripciones o dependen de APIs externas | 40% |
| Memoria del dueño | Guardar, listar, corregir y desactivar; falta validación de seguridad y pruebas productivas | 70% |
| Escalamiento al dueño | Caso, respuesta y timeout de dos minutos; falta resolver robustez multiinstancia y respuestas tardías | 60% |
| Supervisión web | Comprobación HTTP, historial, alertas y consulta ESTADO WEB; no valida el proceso de reserva completo | 60% |
| Reportes al dueño | Reportes manuales y programación diaria/semanal opt-in; métricas solo del propio agente | 65% |
| Consulta de configuración y disponibilidad | Adaptador a dos endpoints públicos documentados; contrato real aún por validar | 20% |
| Reservas privadas y calendario operativo | Sin API autenticada ni flujo transaccional implementado | 0% |
| Ventas, ingresos y pagos | Analista determinista implementado para snapshots normalizados; falta proveedor autenticado y conciliación real | 25% |
| Inventario y alertas de reposición | Cálculo de mínimos implementado sobre snapshot; falta conectar fuente real de existencias y movimientos | 25% |
| Investigación de competencia y tendencias | Subagente Gemini con Google Search grounding, enlaces HTTPS y advertencia si faltan fuentes; falta validar cuenta/uso real y mejorar trazabilidad | 45% |
| Marketing e Instagram | Investigación fundamentada disponible como insumo; sin generador de campañas ni Instagram Graph API | 10% |
| Revisor y auditor general | Revisor determinista integrado a respuestas de clientes para urgencias, pagos y datos privados; auditoría de eventos existente, falta revisión de acciones y anomalías | 30% |
| Despliegue Windows Server | Docker y guías iniciales; no hay servidor, dominio, HTTPS, instalación ni restauración probada | 15% |
| Seguridad, operación y continuidad | HMAC opcional/obligatorio en producción, secretos por entorno, PostgreSQL y scripts; faltan pruebas de seguridad, backups reales y carga | 30% |

## Por qué no corresponde reportar 80%

El 80% no está respaldado por la planeación. Las capacidades centrales que convierten el prototipo en administrador del negocio siguen sin implementarse: reservas privadas, ventas, pagos, inventario, investigación, marketing/Instagram, revisión independiente y despliegue real. Además, los subagentes investigador, analista, revisor y auditor todavía son en parte estructuras descriptivas.

El proyecto tiene una base técnica útil, pero la mayor parte de las funciones administrativas depende de APIs privadas, permisos y datos del negocio que aún no se han entregado.

## Avances comprobados en el repositorio

- Backend Node.js con webhook y cliente de WhatsApp.
- Integración inicial de Gemini.
- Almacenamiento JSON y adaptador PostgreSQL.
- Memoria del dueño y flujo de escalamiento.
- Monitor HTTP con historial, alertas y consulta de estado.
- Reportes operativos manuales y envío automático diario/semanal configurable, desactivado por defecto.\n- Orquestador central conectado al flujo de atención y revisor determinista de respuestas con pruebas automatizadas.\n- Investigador web con Gemini Google Search grounding, extracción/deduplicación de fuentes HTTPS y comando del dueño `INVESTIGAR:`.\n- Analista administrativo determinista para snapshots normalizados: reservas por estado, pagos verificados vs reportados e inventario bajo mínimo; sin fuente privada conectada.
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

1. Completar scheduler y validación de reportes programados.
2. Implementar herramientas administrativas con contratos y permisos explícitos cuando el negocio entregue la API.
3. Conectar el proveedor administrativo autenticado y validar su contrato.\n4. Mejorar investigación de mercado con fechas y trazabilidad adicional.
4. Ampliar revisor para verificar disponibilidad y operaciones autorizadas; completar auditoría de acciones y anomalías.
5. Completar pruebas de integración, seguridad y despliegue.
