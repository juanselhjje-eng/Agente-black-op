import { createSubagents } from "./subagents.js";

function extractMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const message of change?.value?.messages || []) {
        if (message.type === "text" && message.text?.body) messages.push({ id: message.id, from: message.from, text: message.text.body });
      }
    }
  }
  return messages;
}

const normalizeNumber = value => String(value || "").replace(/\\D/g, "");

export function parseOwnerReply(text) {
  const match = String(text || "").trim().match(/^RESPONDER\\s+([0-9a-f-]{36})\\s*[:|-]\\s*([\\s\\S]+)$/i);
  return match ? { escalationId: match[1], answer: match[2].trim() } : null;
}

export function createSecretary({ config, store, whatsapp }) {
  const subagents = createSubagents(config);
  async function handleWebhook(payload) {
    for (const message of extractMessages(payload)) {
      const fresh = await store.addMessage({ id: message.id, from: message.from, text: message.text });
      if (!fresh) continue;
      await store.audit({ type: "incoming_message", messageId: message.id, from: message.from });
      if (config.ownerWhatsAppNumber && normalizeNumber(message.from) === normalizeNumber(config.ownerWhatsAppNumber)) {
        await handleOwnerMessage(message);
        continue;
      }
      let result;
      try {
        result = await subagents.atendimentoWhatsApp.answer(message.text);
      } catch (error) {
        console.error("Gemini/subagente falló:", error);
        result = { text: "En este momento no puedo verificar esa información. Para atención directa, escríbenos al 311 334 8774.", needsOwner: true, urgent: false };
      }
      if (result.urgent) {
        await notifyOwner(message, "ATENCIÓN INMEDIATA: el cliente reporta una posible emergencia, lesión o queja grave.");
      } else if (result.needsOwner) {
        await createOwnerEscalation(message);
      }
      await whatsapp.sendText(message.from, result.text);
      await store.audit({ type: "outgoing_message", messageId: message.id, to: message.from, escalated: result.needsOwner, urgent: result.urgent });
    }
  }
  async function handleOwnerMessage(message) {
    const reply = parseOwnerReply(message.text);
    if (!reply) {
      await whatsapp.sendText(message.from, "Para responder una consulta pendiente, envía: RESPONDER ID_DE_CONSULTA: tu respuesta. Usa el identificador completo que recibiste.");
      return;
    }
    const escalation = await store.closeEscalation(reply.escalationId, "answered", { ownerAnswer: reply.answer, answeredBy: message.from });
    if (!escalation) {
      await whatsapp.sendText(message.from, "No encontré esa consulta pendiente. Puede haber vencido o haber sido respondida anteriormente.");
      return;
    }
    await whatsapp.sendText(escalation.customer, `El equipo de Black Ops nos confirma: ${reply.answer}`);
    await whatsapp.sendText(message.from, "Respuesta enviada al cliente y consulta cerrada.");
    await store.audit({ type: "owner_escalation_answered", escalationId: reply.escalationId, customer: escalation.customer });
  }
  async function notifyOwner(message, prefix) {
    if (config.ownerAlertsEnabled && config.ownerWhatsAppNumber) {
      await whatsapp.sendText(config.ownerWhatsAppNumber, `${prefix}\\nCliente: ${message.from}\\nMensaje: ${message.text}`);
    } else {
      console.warn("Alerta al dueño no enviada: falta configurar OWNER_WHATSAPP_NUMBER y OWNER_ALERTS_ENABLED.");
    }
  }
  async function createOwnerEscalation(message) {
    const item = await store.createEscalation({ customer: message.from, question: message.text });
    await notifyOwner(message, `Consulta pendiente ${item.id}. Responde antes de 2 minutos con:\\nRESPONDER ${item.id}: tu respuesta\\nCliente: ${message.from}\\nPregunta: ${message.text}`);
    return item;
  }
  return { handleWebhook, handleOwnerMessage, subagents };
}
