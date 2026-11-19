# Agente Black Ops

Proyecto para construir un **Secretario virtual de Black Ops Paintball**: atiende clientes por WhatsApp, coordina subagentes y ayuda al dueño con alertas, reportes, supervisión e ideas comerciales. Usa Gemini y Node.js.

## Documentación
- [Definición del producto y requisitos](docs/DEFINICION_PRODUCTO_Y_REQUISITOS.md)
- [Operación y despliegue 24/7](docs/OPERACION_Y_DESPLIEGUE.md)
- [Integraciones](docs/INTEGRACIONES.md)
- [Memoria y aprendizaje del dueño](docs/MEMORIA_DEL_DUENO.md)

## Estado
El repositorio incluye backend inicial, webhook WhatsApp, conexión Gemini, consulta de API pública, escalaciones y memoria local del dueño. La memoria admite instrucciones naturales y correcciones versionadas.

También existe un registro de solicitudes de cambios web: el dueño puede describir qué quiere cambiar y el Secretario lo registra para revisión y aprobación. **Todavía no modifica la web**: falta conectar el repositorio/CMS real, permisos y staging. La aprobación registrada no publica automáticamente.

No está conectado a servicios reales ni desplegado. JSON es almacenamiento de desarrollo de una instancia; producción requiere base de datos, copias de seguridad y controles de acceso.

## Reglas
1. Todo el código y la documentación se mantienen en este repositorio GitHub.
2. Nunca subir secretos.
3. No inventar precios, disponibilidad, pagos, reservas ni políticas.
4. Las guías del dueño se recuerdan, con historial de correcciones.
5. No ejecutar cambios de producción sin vista previa, pruebas y aprobación explícita.
6. Los datos privados y operaciones requieren APIs autenticadas.

## Desarrollo
Requiere Node.js 20 o superior:
```bash
npm install
npm test
npm run dev
```
Consulta `http://127.0.0.1:3000/health`.

Repositorio: https://github.com/juanselhjje-eng/Agente-black-op
