# Memoria y aprendizaje del Secretario

## Aprender y corregir guías
Solo el número autenticado en `OWNER_WHATSAPP_NUMBER` puede enseñar reglas y preferencias. Gemini identifica instrucciones estables en lenguaje natural y las guarda en `ownerMemories`.

- `APRENDER: regla`: guarda una guía explícita.
- `MEMORIAS`: consulta las guías activas.
- `OLVIDAR MEMORIA ID_CORTO`: desactiva una guía sin borrar el historial.

Cuando el dueño corrige una regla anterior, el clasificador puede actualizarla si identifica el ID de la guía con alta confianza. La versión anterior se conserva en `revisions`, con fecha y texto. Si no puede identificar inequívocamente la guía, no debe sobrescribirla; debe pedir precisión o guardar una guía nueva.

## Solicitudes de cambios en la página
El dueño también puede pedir cambios de la web en lenguaje natural, por ejemplo: "No me gusta el botón principal; quiero que sea más visible y diga Reservar ahora". El Secretario registra el pedido en `webChangeRequests`, con resumen, elemento objetivo, resultado esperado y criterios de aceptación cuando se puedan identificar.

Comandos:
- `CAMBIO WEB: descripción del cambio`: registra una solicitud sin Gemini.
- `CAMBIOS WEB`: muestra solicitudes pendientes.
- `APROBAR CAMBIO ID_CORTO`: aprueba la solicitud para implementación controlada.

**Importante:** el flujo actual registra y aprueba solicitudes, pero todavía no edita la página. No existe conexión al repositorio/constructor real del sitio ni entorno de staging. La URL/API pública documentada solo consulta configuración y disponibilidad; no concede permisos de escritura.

## Cómo se implementará la edición real
Antes de conectar la web, se debe identificar dónde vive el código (repositorio Git, constructor visual o CMS) y obtener permisos específicos. El flujo esperado será:
1. Interpretar el cambio y aclarar ambigüedades.
2. Crear una rama de trabajo y modificar solo los componentes necesarios.
3. Mostrar diff y vista previa en staging.
4. Ejecutar pruebas de interfaz, enlaces, formularios, accesibilidad y regresión.
5. Pedir aprobación explícita final para publicar en producción.
6. Publicar, comprobar el resultado y mantener rollback/respaldo.
7. Guardar la decisión de diseño como preferencia si el dueño la expresa como regla general.

No se debe permitir que una instrucción ambigua cambie precios, pagos, reservas, términos, privacidad o seguridad. Estos cambios requieren revisión reforzada.

## Aplicación y límites
Las guías activas se incorporan a futuras respuestas de clientes. No pueden autorizar mentiras, estados de pago/reserva falsos, divulgación de datos privados ni acciones sin permisos.
No guardar contraseñas, tokens, claves ni datos bancarios secretos.

## Persistencia
El almacenamiento actual es JSON local para desarrollo de una instancia. Antes de operar 24/7, migrar a base de datos persistente, con backups, control de acceso y auditoría.
