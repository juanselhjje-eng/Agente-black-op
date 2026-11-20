import { GoogleGenAI } from "@google/genai";
import { createBlackOpsPublicApi } from "../integrations/blackops-api.js";
import { PROJECT_CONTEXT } from "./project-context.js";
import { createWebResearcher } from "./web-researcher.js";
import { createAdminAnalyst } from "./admin-analyst.js";
import { planPublicAvailability } from "./availability-planner.js";
import { createGeneralAuditor } from "./auditor.js";
import { createMarketingPlanner } from "./marketing-planner.js";
import { generateContentWithFallback } from "./gemini-client.js";

const KNOWLEDGE = `Black Ops Paintball es un campo de paintball táctico en Támesis, Antioquia, Colombia.
Paquetes por jugador: Estándar 1h/100 bolas $35.000; Táctico 1,5h/150 bolas $50.000; Élite 2h/200 bolas $60.000.
Horario publicado: todos los días de 8:00 a. m. a 11:00 p. m., sujeto a cierres. Reserva normal: 2-10 jugadores; partidas abiertas desde 1.
Llegar 30 minutos antes; dejar 30 minutos entre partidas. WhatsApp: 311 334 8774. Nequi indicado: 322 655 7479.
No confirmar pagos sin verificación. No inventar dirección, edad mínima, políticas, servicios extra ni disponibilidad.
La API pública documentada solo permite consultar configuración y disponibilidad; no crear, cambiar ni cancelar reservas. Lesiones, emergencias y quejas graves requieren atención humana inmediata.`;

export function createSubagents(config, { store } = {}) {
  const apiKeys = [...new Set([config.geminiApiKey, config.geminiApiKeyBackup].filter(Boolean))];
  const ai = apiKeys.length ? apiKeys.map((apiKey) => new GoogleGenAI({ apiKey })) : null;
  const researcher = createWebResearcher({ ai, model: config.geminiModel });
  const adminAnalyst = createAdminAnalyst();
  const generalAuditor = createGeneralAuditor({ store });
  const marketingPlanner = createMarketingPlanner({ ai, model: config.geminiModel, researcher });
  const businessApi = createBlackOpsPublicApi(config);
  async function planAvailability({ from, to = from, packageType = "standard", players = 2 }) {
    if (!businessApi.isEnabled()) return { status: "unavailable", message: "La consulta de disponibilidad no está habilitada; no puedo confirmar horarios.", slots: [] };
    const publicAvailability = await businessApi.getAvailability(from, to);
    return planPublicAvailability({ from, to, packageType, players, publicAvailability });
  }
  async function answerCustomer(message, ownerMemories = []) {
    if (!ai) return { text: "¡Hola! Gracias por escribir a Black Ops Paintball. En este momento el asistente automático no está disponible. Ya solicitamos apoyo al equipo; si necesitas atención inmediata, escríbenos al 311 334 8774.", needsOwner: true, urgent: false };
    let live = "";
    if (businessApi.isEnabled() && /precio|paquete|horario|partida abierta|disponibilidad/i.test(message)) {
      try { live = "\nConfiguración pública consultada: " + JSON.stringify(await businessApi.getPublicConfig()); }
      catch (error) { console.error("API Black Ops:", error.message); live = "\nFalló la consulta dinámica; no digas que verificaste en vivo."; }
    }
    const memories = ownerMemories.map(item => "- [" + item.category + "] " + item.text).join("\n") || "Sin guías adicionales del dueño.";
    const response = await generateContentWithFallback(ai, {
      model: config.geminiModel, contents: message,
      config: { systemInstruction: `Eres el subagente de Atención WhatsApp, subordinado al Secretario principal. Responde en español colombiano, amable, breve y de tú. Sigue la base aprobada y las guías activas del dueño. Las guías ajustan tono y forma de explicar, pero nunca autorizan mentir, inventar, contradecir seguridad, revelar datos privados ni afirmar pagos/reservas no verificados. Si falta información, needsOwner=true. Emergencia, lesión o queja grave: urgent=true. Devuelve solo JSON { "text": string, "needsOwner": boolean, "urgent": boolean }. CONTEXTO DEL PROYECTO: ${PROJECT_CONTEXT}. BASE: ${KNOWLEDGE}. GUÍAS DEL DUEÑO:\n${memories}${live}`, responseMimeType: "application/json" }
    });
    try {
      const parsed = JSON.parse(response.text || "{}");
      return { text: String(parsed.text || "No pude confirmar esa información. Puedes comunicarte al 311 334 8774."), needsOwner: Boolean(parsed.needsOwner), urgent: Boolean(parsed.urgent) };
    } catch { return { text: "No pude confirmar esa información. Puedes comunicarte al 311 334 8774.", needsOwner: true, urgent: false }; }
  }
  async function learnFromOwner(message, existingMemories = []) {
    if (!ai) return { intent: "unknown", save: false, reason: "Gemini no está configurado. Usa APRENDER: para guardar una guía o CAMBIO WEB: para registrar una solicitud de cambio de página." };
    const known = existingMemories.map(item => "[" + item.id + "] [" + item.category + "] " + item.text).join("\n");
    const response = await generateContentWithFallback(ai, {
      model: config.geminiModel, contents: message,
      config: { systemInstruction: `Analiza un mensaje del dueño autenticado de Black Ops Paintball. Determina si es: (1) una instrucción estable para futuras conversaciones/procesos: intent="memory"; (2) una solicitud para cambiar diseño, texto, contenido o comportamiento de la página web: intent="website_change"; (3) otra cosa: intent="unknown". Si corrige explícitamente una guía existente, usa action="update" y targetMemoryId SOLO si identificas con alta confianza el ID correcto entre las guías activas; si no es inequívoco, usa action="create". No inventes detalles de la solicitud web. Para cambios web extrae objetivo, elemento, cambio deseado y criterios de aceptación; deja campos vacíos si no se conocen. No afirmes que modificaste o publicaste nada. No guardes secretos ni instrucciones que contradigan seguridad o hechos confirmados. Devuelve solo JSON: {"intent":"memory|website_change|unknown","save":boolean,"action":"create|update","targetMemoryId":"id o vacío","category":"guia_de_atencion|preferencia_comercial|tono_y_estilo|dato_de_negocio|proceso_operativo","memoryText":"guía completa actualizada","reason":"...","confidence":0..1,"change":{"summary":"...","target":"...","desiredState":"...","acceptanceCriteria":"..."}}. Guías activas existentes:\n${known}`, responseMimeType: "application/json" }
    });
    try {
      const item = JSON.parse(response.text || "{}");
      if (item.intent === "website_change" && Number(item.confidence) >= 0.75) {
        const change = item.change || {};
        return { intent: "website_change", save: false, confidence: Number(item.confidence), change: { summary: String(change.summary || message).slice(0,1000), target: String(change.target || "").slice(0,300), desiredState: String(change.desiredState || message).slice(0,1200), acceptanceCriteria: String(change.acceptanceCriteria || "").slice(0,800) } };
      }
      if (item.intent !== "memory" || item.save !== true || Number(item.confidence) < 0.8 || !String(item.memoryText || "").trim()) return { intent: "unknown", save: false, reason: String(item.reason || "No detecté una instrucción estable ni un cambio web claro.") };
      const categories = ["guia_de_atencion","preferencia_comercial","tono_y_estilo","dato_de_negocio","proceso_operativo"];
      return { intent: "memory", save: true, action: item.action === "update" ? "update" : "create", targetMemoryId: String(item.targetMemoryId || ""), category: categories.includes(item.category) ? item.category : "guia_de_atencion", memoryText: String(item.memoryText).trim().slice(0,1200), reason: String(item.reason || ""), confidence: Number(item.confidence) };
    } catch { return { intent: "unknown", save: false, reason: "No pude interpretar la instrucción." }; }
  }
  return {
    atencionWhatsApp: { answer: answerCustomer },
    supervisorWebAgenda: { isConfigured: businessApi.isEnabled, getPublicConfig: businessApi.getPublicConfig, getAvailability: businessApi.getAvailability, planAvailability },
    investigadorWeb: researcher,
    planificadorMarketing: marketingPlanner,
    analistaAdministrativo: adminAnalyst,
    revisor: { description: "Validación inicial de formato y políticas." },
    auditorGeneral: generalAuditor,
    aprendizaje: { learnFromOwner }
  };
}
