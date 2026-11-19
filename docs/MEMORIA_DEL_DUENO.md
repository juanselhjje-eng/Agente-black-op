# Memoria y aprendizaje del Secretario

## Cómo aprende del dueño
Solo el número autenticado en `OWNER_WHATSAPP_NUMBER` puede enseñar reglas y preferencias. Cuando el dueño escribe una instrucción en lenguaje natural, el módulo de aprendizaje de Gemini identifica si es una regla estable para futuras conversaciones. Si la instrucción es clara y tiene confianza suficiente, el Secretario la guarda en `ownerMemories` y confirma qué entendió.

Ejemplo de conversación:
- Dueño: "Quiero que cuando un cliente pregunte por una actividad para cumpleaños, le expliques primero cómo funciona la experiencia y luego le presentes los paquetes disponibles."
- Secretario: "Entendido. Guardé esta guía para futuras conversaciones con clientes..."

También se puede guardar de forma explícita sin interpretación de IA:
```
APRENDER: Cuando pregunten por cumpleaños, explica primero la experiencia y luego presenta los paquetes.
```

## Consultar y corregir
- `MEMORIAS`: muestra las últimas guías activas guardadas.
- `OLVIDAR MEMORIA ID_CORTO`: desactiva una guía; no elimina el registro histórico.
- Si el dueño expresa una corrección, el módulo debe guardar la regla corregida como una guía nueva. No borra otras reglas automáticamente.

## Aplicación en conversaciones
Antes de responder a cada cliente, el Secretario carga las guías activas y se las pasa al subagente de Atención WhatsApp. Las guías orientan tono, forma de explicar, prioridades comerciales y procesos. Se aplican en cada nueva conversación mientras estén activas.

## Límites y seguridad
- El aprendizaje automático depende de Gemini y de que el dueño esté correctamente autenticado por número.
- Si Gemini no está configurado, el comando explícito `APRENDER:` sigue funcionando.
- Las instrucciones del dueño no pueden autorizar invenciones, falsos estados de pago/reserva, divulgación de datos privados ni acciones sin permisos.
- El almacenamiento actual es un JSON local de desarrollo. Antes de operar 24/7 en producción, migrar a base de datos persistente con copias de seguridad.
- No guardar contraseñas, tokens, claves, datos bancarios secretos ni datos personales sensibles.
