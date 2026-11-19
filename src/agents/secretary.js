import { createSubagents } from "./subagents.js";
function extractMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry || []) for (const change of entry?.changes || []) for (const message of change?.value?.messages || []) {
    if (message.type === "text" && message.text?.body) messages.push({ id: message.id, from: message.from, text: message.text.body });
  }
  return messages;
}
const normalizeNumber = value => String(value || "").replace(/\D/g, "");
export function parseOwnerReply(text) {
  const match = String(text || "").trim().match(/^RESPONDER\s+([0-9a-f-]{36})\s*[:|-]\s*([\s\S]+)$/i);
  return match ? { escalationId: match[1], answer: match[2].trim() } : null;
}
export function createSecretary({ config, store, whatsapp }) {
  const subagents = createSubagents(config);
  async function handleWebhook(payload) {
    for (const message of extractMessages(payload)) {
      if (!await store.addMessage({ id: message.id, from: message.from, text: message.text })) continue;
      await store.audit({ type: "incoming_message", messageId: message.id, from: message.from });
      if (config.ownerWhatsAppNumber && normalizeNumber(message.from) === normalizeNumber(config.ownerWhatsAppNumber)) {
        await handleOwnerMessage(message); continue;
      }
      let result;
      try { result = await subagents.atencionWhatsApp.answer(message.text, await store.listOwnerMemories()); }
      catch (error) {
        console.error("Subagente atención falló:", error);
        result = { text: "En este momento no puedo verificar esa información. Para atención directa, escríbenos al 311 334 8774.", needsOwner: true, urgent: false };
      }
      if (result.urgent) await notifyOwner(message, "ATENCIÓN INMEDIATA: posible emergencia, lesión o queja grave.");
      else if (result.needsOwner) await createOwnerEscalation(message);
      await whatsapp.sendText(message.from, result.text);
      await store.audit({ type: "outgoing_message", messageId: message.id, to: message.from, escalated: result.needsOwner, urgent: result.urgent });
    }
  }
  async function handleOwnerMessage(message) {
    const text = message.text.trim();
    if (/^MEMORIAS$/i.test(text)) {
      const memories = await store.listOwnerMemories();
      const lines = memories.slice(-15).map(item => item.id.slice(0,8) + " — " + item.text);
      await whatsapp.sendText(message.from, lines.length ? "Guías que tengo guardadas:\n" + lines.join("\n") + "\nPara desactivar una: OLVIDAR MEMORIA ID_CORTO." : "Aún no tengo guías guardadas.");
      return;
    }
    const forget = text.match(/^OLVIDAR MEMORIA\s+([0-9a-f-]{8,36})$/i);
    if (forget) {
      const memories = await store.listOwnerMemories();
      const item = memories.find(entry => entry.id.startsWith(forget[1]));
      const removed = item ? await store.deactivateOwnerMemory(item.id) : null;
      await whatsapp.sendText(message.from, removed ? "Dejé de aplicar esta guía: " + removed.text : "No encontré esa memoria activa.");
      return;
    }
    if (/^APRENDER\s*:/i.test(text)) {
      const instruction = text.replace(/^APRENDER\s*:/i, "").trim();
      if (!instruction) { await whatsapp.sendText(message.from, "Después de APRENDER: escribe la guía que quieres que recuerde."); return; }
      const saved = await store.saveOwnerMemory({ text: instruction, category: "guia_de_atencion", sourceMessage: message.id });
      await store.audit({ type: "owner_memory_saved", memoryId: saved.id, category: saved.category });
      await whatsapp.sendText(message.from, saved.duplicate ? "Ya tenía guardada esa guía y la seguiré aplicando." : "Entendido. Guardé esta guía para futuras conversaciones: “" + saved.text + "”. Puedes consultarla con MEMORIAS.");
      return;
    }
    const learned = await subagents.aprendizaje.learnFromOwner(text, await store.listOwnerMemories());
    if (learned.save) {
      const saved = await store.saveOwnerMemory({ text: learned.memoryText, category: learned.category, sourceMessage: message.id });
      await store.audit({ type: "owner_memory_saved", memoryId: saved.id, category: saved.category, source: "natural_language" });
      await whatsapp.sendText(message.from, saved.duplicate ? "Esa guía ya estaba guardada y la seguiré aplicando." : "Entendido. Aprendí y guardé esta indicación para futuras conversaciones con clientes:\n“" + saved.text + "”\nPuedes revisar mis guías con MEMORIAS.");
      return;
    }
    await whatsapp.sendText(message.from, learned.reason || "Te escucho. Si quieres enseñarme una regla, explícame qué debo recordar o usa APRENDER: seguido de la instrucción.");
  }
  async function notifyOwner(message, prefix) {
    if (config.ownerAlertsEnabled && config.ownerWhatsAppNumber) await whatsapp.sendText(config.ownerWhatsAppNumber, prefix + "\nCliente: " + message.from + "\nMensaje: " + message.text);
    else console.warn("Alerta al dueño no enviada: configura OWNER_WHATSAPP_NUMBER y OWNER_ALERTS_ENABLED.");
  }
  async function createOwnerEscalation(message) {
    const item = await store.createEscalation({ customer: message.from, question: message.text });
    await notifyOwner(message, "Consulta pendiente " + item.id + ". Responde antes de 2 minutos con:\nRESPONDER " + item.id + ": tu respuesta\nCliente: " + message.from + "\nPregunta: " + message.text);
    return item;
  }
  return { handleWebhook, handleOwnerMessage, subagents };
}
