# Reglas de trabajo del proyecto Black Ops

## Regla principal: GitHub es la fuente de verdad
- Todo el código fuente, documentación, configuración de ejemplo, pruebas, scripts y cambios de arquitectura se crean y mantienen directamente en este repositorio.
- No considerar archivos locales, fragmentos del chat ni adjuntos como versión oficial del proyecto.
- Antes de modificar un archivo existente, leer su versión actual desde GitHub.
- Cada cambio debe quedar guardado mediante un commit con un mensaje descriptivo.
- Mantener el README y la documentación sincronizados con el estado real del código.
- No afirmar que una función está implementada hasta que exista código y pruebas verificables en el repositorio.
- No introducir secretos, claves API, tokens, contraseñas ni datos privados en commits.
- Usar archivos `.env.example` con nombres de variables y valores ficticios o vacíos.
- Si una tarea requiere ejecutar pruebas o comandos en el servidor, proporcionar los comandos y pedir los resultados; no afirmar que se ejecutaron si no se ejecutaron.

## Arquitectura acordada
- Backend: Node.js + JavaScript.
- IA: Google Gemini API mediante `@google/genai`.
- Canal: WhatsApp Business Cloud API.
- Despliegue objetivo: Windows Server (versión pendiente de identificar).
- Siete responsabilidades de agente coordinadas por un orquestador; inicialmente módulos dentro de una aplicación, no siete servidores separados.
- Base de datos e integraciones administrativas pendientes de confirmar con el cliente.

## Seguridad
- Las claves y tokens se guardan como variables de entorno en el servidor.
- No exponer credenciales en frontend, logs, documentación pública ni repositorio.
- Toda herramienta que consulte o modifique datos debe validar permisos, entradas y registrar auditoría.
