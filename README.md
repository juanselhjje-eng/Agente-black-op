# Agente Black Ops

Proyecto para construir un **administrador virtual de Black Ops Paintball**: atiende clientes por WhatsApp, coordina subagentes especializados y escribe proactivamente al dueño con el estado de la página, calendario y reservas, ventas, pagos, inventario, alertas e ideas de publicidad. Usa Gemini como modelo de IA y Node.js como núcleo de integración.

## Documentación

- [Definición del producto y requisitos](docs/DEFINICION_PRODUCTO_Y_REQUISITOS.md): alcance consolidado, contexto del negocio, Secretario principal y subagentes, arquitectura, reglas de seguridad, escalamiento al dueño, fases, criterios de aceptación y decisiones pendientes.

## Estado actual

Se ha creado la primera base de backend en Node.js: servidor HTTP, Secretario principal, módulos de subagentes, cliente de WhatsApp Cloud API, validación de firma, almacenamiento JSON inicial, worker de vencimiento de escalaciones y una prueba automatizada.

**Aún no está desplegado ni conectado a servicios reales.** No se ha contratado servidor, configurado dominio/HTTPS, creado la aplicación de Meta ni agregado credenciales de Gemini o WhatsApp. Las integraciones administrativas, reportes, investigación web e Instagram siguen pendientes.

Consulta [Operación y despliegue](docs/OPERACION_Y_DESPLIEGUE.md) para conocer el estado y los pasos cuando se cree el servidor.

## Principios del proyecto

1. Responder únicamente con información respaldada por la base de conocimiento, fuentes autorizadas o el dueño.
2. No inventar precios, disponibilidad, políticas ni confirmaciones de pago o reserva.
3. Escalar al dueño las preguntas que no se puedan resolver; esperar 2 minutos y luego informar al cliente si no hubo respuesta.
4. El Secretario es el agente principal; coordina los subagentes especializados y controla la respuesta final. El MVP puede implementarlos como módulos de una sola aplicación Node.js.
5. Enviar reportes y alertas proactivas al dueño; mostrar como no disponibles los datos para los que aún no exista una integración.
6. Ejecutar acciones externas solo cuando existan APIs, permisos y autorizaciones suficientes.

## Próximos pasos técnicos

1. Completar las pruebas y endurecer el manejo de errores/seguridad.
2. Añadir persistencia de producción y el flujo seguro para que el dueño responda consultas pendientes.
3. Completar herramientas de consulta para disponibilidad y configuración del negocio, validando la API documentada.
4. Incorporar informes y supervisión cuando existan fuentes administrativas autorizadas.
5. Conectar Gemini y WhatsApp cuando estén creadas las cuentas y credenciales.
6. Preparar y desplegar el servicio 24/7 cuando el usuario contrate/provisione el servidor.

No se debe activar atención real hasta completar configuración, pruebas y autorización del negocio.


## Regla de trabajo

**Todo el desarrollo se realiza directamente en este repositorio de GitHub.** Código, documentación, pruebas, scripts y archivos de configuración de ejemplo deben quedar versionados aquí. La fuente de verdad del proyecto es la rama principal del repositorio. No se guardan claves ni tokens en GitHub.

Consulta [PROJECT_RULES.md](PROJECT_RULES.md) antes de realizar cambios.

## Primer scaffold de backend

Se creó una base inicial de Node.js:
- `package.json`: scripts y dependencias iniciales.
- `src/server.js`: servidor Express con endpoint `/health`.
- `.env.example`: variables necesarias, sin secretos.
- `.gitignore`: exclusión de secretos y archivos locales.

Este scaffold aún no conecta WhatsApp ni Gemini; es la base para implementar y probar las integraciones por etapas.
