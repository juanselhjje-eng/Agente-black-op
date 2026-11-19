import { GoogleGenAI } from "@google/genai";
import { createBlackOpsPublicApi } from "../integrations/blackops-api.js";

const KNOWLEDGE = `Black Ops Paintball es un campo de paintball táctico en Támesis, Antioquia, Colombia.
Paquetes por jugador: Estándar 1 hora/100 bolas $35.000; Táctico 1,5 horas/150 bolas $50.000; Élite 2 horas/200 bolas $60.000.
Horario publicado: todos los días de 8:00 a. m. a 11:00 p. m.; sujeto a cierres y disponibilidad real.
Reserva normal: 2 a 10 jugadores. Partidas abiertas: desde 1 jugador.
Llegar 30 minutos antes. Se deja un margen de 30 minutos entre partidas.
WhatsApp de atención directa: 311 334 8774.
Nequi indicado en el material del negocio: 322 655 7479. No confirmar pagos sin verificación del equipo.
No inventar dirección exacta, edad mínima, políticas no documentadas, servicios adicionales ni disponibilidad.
El agente no crea, cambia ni cancela reservas mediante la API pública documentada.
En lesiones, emergencias o quejas graves, derivar inmediatamente al equipo.`;

export function createSubagents(config) {
  const ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
  const businessApi = createBlackOpsPublicApi(config);

  async function answerCustomer(message) {
    if (!ai) return { text: "¡Hola! Gracias por escribir a Black Ops Paintball. En este momento no puedo consultar el asistente automático. Para atención directa, escríbenos al 311 334 8774.", needsOwner: false, urgent: false };
    let liveBusinessContext = "";
    if (businessApi.isEnabled() && /precio|paquete|horario|partida abierta|disponibilidad/i.test(message)) {
      try {
        const data = await businessApi.getPublicConfig();
        liveBusinessContext = `\\nDatos dinámicos consultados en la API pública (úsalos solo si están presentes): ${JSON.stringify(data)}`;
      } catch (error) {
        console.error("No fue posible consultar la API pública de Black Ops:", error.message);
        liveBusinessContext = "\\nLa consulta dinámica falló; no afirmes que los datos fueron verificados en vivo.";
      }
    }
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: message,
      config: {
        systemInstruction: `Eres el subagente de Atención WhatsApp del Secretario de Black Ops. Responde en español colombiano, amable, breve y de tú. Usa exclusivamente la base aprobada y el contexto dinámico adjunto. Si falta un dato, no lo inventes: indica que requiere confirmación del equipo y marca needsOwner=true. No afirmes que una reserva está creada ni que un pago está confirmado. Si hay lesión, emergencia o queja grave, indica atención humana inmediata y marca urgent=true. Devuelve solo JSON válido con text (string), needsOwner (boolean), urgent (boolean). Base: ${KNOWLEDGE}${liveBusinessContext}`,
        responseMimeType: "application/json"
      }
    });
    try {
      const parsed = JSON.parse(response.text || "{}");
      return {
        text: String(parsed.text || "No pude confirmar esa información. Puedes comunicarte directamente al 311 334 8774."),
        needsOwner: Boolean(parsed.needsOwner),
        urgent: Boolean(parsed.urgent)
      };
    } catch {
      return { text: "No pude confirmar esa información. Puedes comunicarte directamente al 311 334 8774.", needsOwner: true, urgent: false };
    }
  }

  return {
    atendimentoWhatsApp: { answer: answerCustomer },
    supervisorWebAgenda: {
      isConfigured: businessApi.isEnabled,
      getPublicConfig: businessApi.getPublicConfig,
      getAvailability: businessApi.getAvailability
    },
    investigadorWeb: { description: "Pendiente de integrar búsqueda web y fuentes verificables." },
    analistaAdministrativo: { description: "Pendiente de API autenticada para ventas, pagos, reservas privadas e inventario." },
    revisor: { description: "Validación inicial de formato y políticas; requiere ampliar verificadores por tipo de dato." },
    auditorGeneral: { description: "Auditoría de eventos y errores; requiere ampliar métricas y reportes." }
  };
}
