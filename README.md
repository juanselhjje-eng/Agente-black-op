# Agente Black Ops

Proyecto para construir un **Secretario virtual de Black Ops Paintball**: atiende clientes por WhatsApp, coordina subagentes especializados y ayuda al dueño con alertas, reportes, supervisión e ideas comerciales. Usa Gemini como modelo de IA y Node.js como núcleo de integración.

## Documentación
- [Definición del producto y requisitos](docs/DEFINICION_PRODUCTO_Y_REQUISITOS.md)
- [Operación y despliegue 24/7](docs/OPERACION_Y_DESPLIEGUE.md)
- [Integraciones y contratos](docs/INTEGRACIONES.md)
- [Memoria y aprendizaje del dueño](docs/MEMORIA_DEL_DUENO.md)

## Arquitectura
Un único agente principal, el **Secretario**, coordina seis subagentes: Atención WhatsApp, Supervisor web y agenda, Investigador web, Analista administrativo/comercial, Revisor y Auditor general. Los especialistas entregan sus resultados al Secretario; este conserva el control de la respuesta final.

## Estado del desarrollo
El repositorio contiene el backend inicial, webhook de WhatsApp, cliente de envío, conexión Gemini, adaptador de API pública, worker de escalaciones y memoria persistente local para las guías del dueño.

La memoria del dueño ya tiene flujo de aprendizaje: el dueño autenticado puede enseñar reglas en lenguaje natural; el Secretario las guarda, confirma lo aprendido y las incorpora al contexto de futuras respuestas. También existen comandos para guardar, consultar y desactivar guías.

**No está desplegado ni conectado a servicios reales.** Aún no se ha contratado servidor ni configurado dominio HTTPS, cuenta Meta/WhatsApp o credenciales de producción. La persistencia JSON es para desarrollo de una sola instancia; antes de producción se migrará a una base de datos robusta.

## Reglas fundamentales
1. Todo el desarrollo y la documentación se mantienen directamente en este repositorio de GitHub.
2. No subir secretos, tokens, contraseñas ni datos privados.
3. No inventar precios, disponibilidad, pagos, reservas ni políticas.
4. Las guías del dueño se recuerdan y aplican en futuras conversaciones, siempre subordinadas a seguridad, privacidad y hechos verificados.
5. Los datos de ventas, pagos, inventario y reservas privadas requieren API autenticada.
6. No activar atención real hasta completar pruebas, configuración y autorización del negocio.

## Desarrollo local
Requiere Node.js 20 o superior:
```bash
npm install
npm test
npm run dev
```
Luego consultar `http://127.0.0.1:3000/health`.

## Repositorio
[juanselhjje-eng/Agente-black-op](https://github.com/juanselhjje-eng/Agente-black-op)
