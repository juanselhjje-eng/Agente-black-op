# Agente Black Ops

Proyecto para construir un **administrador virtual de Black Ops Paintball**: atiende clientes por WhatsApp, coordina subagentes especializados y escribe proactivamente al dueño con el estado de la página, calendario y reservas, ventas, pagos, inventario, alertas e ideas de publicidad. Usa Gemini como modelo de IA y Node.js como núcleo de integración.

## Documentación

- [Definición del producto y requisitos](docs/DEFINICION_PRODUCTO_Y_REQUISITOS.md): alcance consolidado, contexto del negocio, Secretario principal y subagentes, arquitectura, reglas de seguridad, escalamiento al dueño, fases, criterios de aceptación y decisiones pendientes.

## Estado actual

Este repositorio contiene la definición funcional inicial. Todavía no representa una integración desplegada ni significa que WhatsApp, Gemini, Supabase o Instagram ya estén conectados.

## Principios del proyecto

1. Responder únicamente con información respaldada por la base de conocimiento, fuentes autorizadas o el dueño.
2. No inventar precios, disponibilidad, políticas ni confirmaciones de pago o reserva.
3. Escalar al dueño las preguntas que no se puedan resolver; esperar 2 minutos y luego informar al cliente si no hubo respuesta.
4. El Secretario es el agente principal; coordina los subagentes especializados y controla la respuesta final. El MVP puede implementarlos como módulos de una sola aplicación Node.js.
5. Enviar reportes y alertas proactivas al dueño; mostrar como no disponibles los datos para los que aún no exista una integración.
6. Ejecutar acciones externas solo cuando existan APIs, permisos y autorizaciones suficientes.

## Próximo paso recomendado

Cerrar las preguntas de la sección **“Preguntas que el cliente/desarrollador debe cerrar”** de la especificación antes de implementar integraciones y automatizaciones.


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
