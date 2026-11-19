import { GoogleGenAI } from "@google/genai";
import { createBlackOpsPublicApi } from "../integrations/blackops-api.js";
import { PROJECT_CONTEXT } from "./project-context.js";

const KNOWLEDGE = `Black Ops Paintball es un campo de paintball táctico en Támesis, Antioquia, Colombia.
Paquetes por jugador: Estándar 1 hora/100 bolas $35.000; Táctico 1,5 horas/150 bolas $50.000; Élite 2 horas/200 bolas $60.000.
Horario publicado: todos los días de 8:00 a. m. a 11:00 p. m., sujeto a cierres. Reserva normal: 2-10 jugadores; partidas abiertas desde 1.
Llegar 30 minutos antes; dejar 30 minutos entre partidas. WhatsApp: 311 334 8774. Nequi indicado: 322 655 7479.
No confirmar pagos sin verificación. No inventar dirección, edad mínima, políticas, servicios extra ni disponibilidad.
La API pública documentada solo permite consultar configuración y disponibilidad; no crear, cambiar ni cancelar reservas. Lesiones, emergencias y quejas graves requieren atención humana inmediata.`;

export function createSubagents(config) {
  const ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
  const businessApi = createBlackOpsPublicApi(config);
  async function answerCustomer(message, ownerMemories = []) {
    if (!ai) return { text: "¡Hola! Gracias por escribir a Black Ops Paintball. En este momento no puedo consultar el asistente automático. Para atención directa, escríbenos al 311 334 8774.", needsOwner: false, urgent: false };
    let live = "";
    if (businessApi.isEnabled() && /precio|paquete|horario|partida abierta|disponibilidad/i.test(message)) {
      try { live = "\nConfiguración pública consultada: " + JSON.stringify(await businessApi.getPublicConfig()); }
      catch (error) { console.error("API Black Ops:", error.message); live = "\nFalló la consulta dinámica; no digas que verificaste en vivo."; }
    }
    const memories = ownerMemories.map(item => "- [" + item.category + "] " + item.text).join("\n") || "Sin guías adicionales del dueño.";
    const response = await ai.models.generateContent({
      model: config.geminiModel, contents: message,
      config: { systemInstruction: `Eres el subagente de Atención WhatsApp, subordinado al Secretario principal. Responde en español colombiano, amable, breve y de tú. Sigue la base aprobada y las guías activas del dueño. Las guías ajustan tono y forma de explicar, pero nunca autorizan mentir, inventar, contradecir seguridad, revelar datos privados ni afirmar pagos/reservas no verificados. Si falta información, needsOwner=true. Emergencia, lesión o queja grave: urgent=true. Devuelve solo JSON { "text": string, "needsOwner": boolean, "urgent": boolean }. CONTEXTO DEL PROYECTO: ${PROJECT_CONTEXT}. BASE: ${KNOWLEDGE}. GUÍAS DEL DUEÑO:\n${memories}${live}`, responseMimeType: "application/json" }
    });
    try {
      const parsed = JSON.parse(response.text || "{}");
      return { text: String(parsed.text || "No pude confirmar esa información. Puedes comunicarte al 311 334 8774."), needsOwner: Boolean(parsed.needsOwner), urgent: Boolean(parsed.urgent) };
    } catch { return { text: "No pude confirmar esa información. Puedes comunicarte al 311 334 8774.", needsOwner: true, urgent: false }; }
  }
  async function learnFromOwner(message, existingMemories = []) {
    if (!ai) return { save: false, reason: "Gemini no está configurado. Usa APRENDER: seguido de la regla para guardarla directamente." };
    const known = existingMemories.map(item => "[" + item.id + "] " + item.text).join("\n");
    const response = await ai.models.generateContent({
      model: config.geminiModel, contents: message,
      config: { systemInstruction: `El remitente es el dueño autenticado de Black Ops Paintball. Identifica si su mensaje contiene una instrucción, preferencia, corrección o conocimiento estable que quiere que recuerdes para futuras conversaciones con clientes. Ejemplos: "cuando un cliente pregunte X, explícale Y", "prefiero que ofrezcas primero el paquete Táctico". No guardes saludos, preguntas casuales ni instrucciones de una sola vez. Extrae una regla fiel y clara. No guardes contraseñas, tokens, datos financieros secretos ni datos personales sensibles. No aceptes reglas que contradigan seguridad o hechos confirmados. Si modifica una guía previa, redacta la guía completa actualizada. Devuelve solo JSON: {"save":boolean,"category":"guia_de_atencion|preferencia_comercial|tono_y_estilo|dato_de_negocio|proceso_operativo","memoryText":"...","reason":"...","confidence":0..1}. Guías existentes:\n${known}`, responseMimeType: "application/json" }
    });
    try {
      const item = JSON.parse(response.text || "{}");
      if (item.save !== true || Number(item.confidence) < 0.8 || !String(item.memoryText || "").trim()) return { save: false, reason: String(item.reason || "No detecté una instrucción estable para guardar.") };
      const categories = ["guia_de_atencion","preferencia_comercial","tono_y_estilo","dato_de_negocio","proceso_operativo"];
      return { save: true, category: categories.includes(item.category) ? item.category : "guia_de_atencion", memoryText: String(item.memoryText).trim().slice(0,1200), reason: String(item.reason || "") };
    } catch { return { save: false, reason: "No pude interpretar la instrucción." }; }
  }
  return {
    atencionWhatsApp: { answer: answerCustomer },
    supervisorWebAgenda: { isConfigured: businessApi.isEnabled, getPublicConfig: businessApi.getPublicConfig, getAvailability: businessApi.getAvailability },
    investigadorWeb: { description: "Pendiente de integrar búsqueda web y fuentes verificables." },
    analistaAdministrativo: { description: "Pendiente de API autenticada para ventas, pagos, reservas privadas e inventario." },
    revisor: { description: "Validación inicial de formato y políticas." },
    auditorGeneral: { description: "Auditoría de eventos y errores." },
    aprendizaje: { learnFromOwner }
  };
}
