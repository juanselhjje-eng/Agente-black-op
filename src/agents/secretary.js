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

export function createSecretary({ config, store, whatsapp }) {
  const subagents = createSubagents(config);
  async function handleWebhook(payload) {
    for (const message of extractMessages(payload)) {
      const fresh = await store.addMessage({ id: message.id, from: message.from, text: message.text });
      if (!fresh) continue;
      await store.audit({ type: "incoming_message", messageId: message.id, from: message.from });
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
  async function notifyOwner(message, prefix) {
    if (config.ownerAlertsEnabled && config.ownerWhatsAppNumber) {
      await whatsapp.sendText(config.ownerWhatsAppNumber, `${prefix}\nCliente: ${message.from}\nMensaje: ${message.text}`);
    } else {
      console.warn("Alerta al dueño no enviada: falta configurar OWNER_WHATSAPP_NUMBER y OWNER_ALERTS_ENABLED.");
    }
  }
  async function createOwnerEscalation(message) {
    const item = await store.createEscalation({ customer: message.from, question: message.text });
    await notifyOwner(message, `Consulta pendiente ${item.id}. Responde antes de 2 minutos si tienes la información. Cliente: ${message.from}\nPregunta: ${message.text}`);
    return item;
  }
  return { handleWebhook, subagents };
}
