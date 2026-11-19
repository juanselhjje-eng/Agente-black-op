import { createSubagents } from "./subagents.js";
import { createOrchestrator } from "./orchestrator.js";
import { buildOwnerReport } from "../reports/owner-report.js";
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
  const orchestrator = createOrchestrator({ support: subagents.atencionWhatsApp });
  async function handleWebhook(payload) {
    for (const message of extractMessages(payload)) {
      if (!await store.addMessage({ id: message.id, from: message.from, text: message.text })) continue;
      await store.audit({ type: "incoming_message", messageId: message.id, from: message.from });
      if (config.ownerWhatsAppNumber && normalizeNumber(message.from) === normalizeNumber(config.ownerWhatsAppNumber)) {
        await handleOwnerMessage(message); continue;
      }
      let result;
      try { result = await orchestrator.handleCustomerMessage(message.text, await store.listOwnerMemories()); }
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
    const reply = parseOwnerReply(text);
    if (reply) {
      const closed = await store.closeEscalation(reply.escalationId, "answered", { ownerAnswer: reply.answer });
      if (!closed) { await whatsapp.sendText(message.from, "No encontré una consulta pendiente con ese ID. Puede haber vencido o ya fue respondida."); return; }
      await whatsapp.sendText(closed.customer, reply.answer);
      await whatsapp.sendText(message.from, "Respuesta enviada al cliente.");
      await store.audit({ type: "owner_escalation_answered", escalationId: reply.escalationId });
      return;
    }
    if (/^INVESTIGAR\\s*:/i.test(text)) {
      const query = text.replace(/^INVESTIGAR\\s*:/i, "").trim();
      if (!query) {
        await whatsapp.sendText(message.from, "Después de INVESTIGAR: escribe el tema o competidor que quieres analizar.");
        return;
      }
      try {
        const report = await subagents.investigadorWeb.research(query);
        const sourceLines = (report.sources || []).map((source, index) => (index + 1) + ". " + source.title + "\\n" + source.url);
        const response = [
          "INVESTIGACIÓN: " + report.topic,
          report.status === "completed" ? report.summary : report.note,
          sourceLines.length ? "FUENTES:\\n" + sourceLines.join("\\n") : "",
          report.note
        ].filter(Boolean).join("\\n\\n").slice(0, 6000);
        await whatsapp.sendText(message.from, response);
        await store.audit({ type: "owner_web_research_completed", topic: report.topic, sourceCount: report.sources?.length || 0, status: report.status });
      } catch (error) {
        await whatsapp.sendText(message.from, "No pude completar la investigación. " + (error?.message || "Intenta de nuevo más tarde."));
        await store.audit({ type: "owner_web_research_failed", topic: query.slice(0, 300), reason: String(error?.message || "unknown").slice(0, 300) });
      }
      return;
    }
    if (/^ESTADO WEB$/i.test(text)) {
      const latest = await store.getLatestWebsiteCheck();
      if (!latest) {
        await whatsapp.sendText(message.from, "Aún no hay comprobaciones de la página. Verifica que WEBSITE_MONITOR_URL esté configurada y que el monitor esté activo.");
      } else {
        const details = [
          "ESTADO DE LA PÁGINA BLACK OPS",
          "• Estado: " + (latest.ok ? "RESPONDE" : "PRESENTA FALLAS"),
          "• Última comprobación: " + latest.checkedAt,
          "• Motivo: " + latest.reason,
          latest.status ? "• HTTP: " + latest.status : "",
          Number.isFinite(latest.latencyMs) ? "• Latencia: " + latest.latencyMs + " ms" : ""
        ].filter(Boolean);
        await whatsapp.sendText(message.from, details.join("\\n"));
      }
      await store.audit({ type: "owner_website_status_requested", hasCheck: Boolean(latest), ok: latest?.ok ?? null });
      return;
    }
    if (/^RESUMEN (HOY|SEMANA)$/i.test(text)) {
      const period = /SEMANA$/i.test(text) ? "weekly" : "daily";
      const report = await buildOwnerReport(store, { period, timeZone: config.reportTimeZone });
      await whatsapp.sendText(message.from, report.text);
      await store.audit({ type: "owner_operational_report_sent", period, start: report.start.toISOString(), end: report.end.toISOString() });
      return;
    }
    if (/^MEMORIAS$/i.test(text)) {
      const memories = await store.listOwnerMemories();
      const lines = memories.slice(-15).map(item => item.id.slice(0,8) + " — " + item.text);
      await whatsapp.sendText(message.from, lines.length ? "Guías que tengo guardadas:\n" + lines.join("\n") + "\nPara desactivar una: OLVIDAR MEMORIA ID_CORTO." : "Aún no tengo guías guardadas.");
      return;
    }
    if (/^CAMBIOS WEB$/i.test(text)) {
      const requests = await store.listWebChangeRequests();
      const lines = requests.slice(-10).map(item => item.id.slice(0,8) + " [" + item.status + "] " + item.summary);
      await whatsapp.sendText(message.from, lines.length ? "Solicitudes de la página:\n" + lines.join("\n") + "\nPara aprobar una solicitud: APROBAR CAMBIO ID_CORTO." : "No hay solicitudes de cambio web pendientes.");
      return;
    }
    const approve = text.match(/^APROBAR CAMBIO\s+([0-9a-f-]{8,36})$/i);
    if (approve) {
      const requests = await store.listWebChangeRequests();
      const item = requests.find(entry => entry.id.startsWith(approve[1]));
      const approved = item ? await store.approveWebChangeRequest(item.id, message.from) : null;
      await whatsapp.sendText(message.from, approved ? "Aprobé la solicitud " + approved.id.slice(0,8) + ". Queda autorizada para que el conector de la página la implemente; todavía no está publicada porque esa integración aún debe configurarse y probarse." : "No encontré una solicitud pendiente con ese ID.");
      await store.audit({ type: "web_change_approved", changeId: item?.id || "", success: Boolean(approved) });
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
    if (/^CAMBIO WEB\s*:/i.test(text)) {
      const instruction = text.replace(/^CAMBIO WEB\s*:/i, "").trim();
      if (!instruction) { await whatsapp.sendText(message.from, "Después de CAMBIO WEB: describe qué elemento de la página quieres cambiar y cómo debería quedar."); return; }
      const item = await store.createWebChangeRequest({ summary: instruction.slice(0,1000), target: "", desiredState: instruction.slice(0,1200), acceptanceCriteria: "", sourceMessage: message.id });
      await store.audit({ type: "web_change_requested", changeId: item.id });
      await whatsapp.sendText(message.from, "Registré tu solicitud de cambio web " + item.id.slice(0,8) + ": “" + item.summary + "”. Queda pendiente de revisión. Cuando quieras autorizarla, escribe APROBAR CAMBIO " + item.id.slice(0,8) + ". Aún no se modifica la página: falta conectar su repositorio/constructor y el entorno de pruebas.");
      return;
    }
    const learned = await subagents.aprendizaje.learnFromOwner(text, await store.listOwnerMemories());
    if (learned.intent === "website_change") {
      const item = await store.createWebChangeRequest({ ...learned.change, sourceMessage: message.id });
      await store.audit({ type: "web_change_requested", changeId: item.id, source: "natural_language" });
      await whatsapp.sendText(message.from, "Entendí que quieres este cambio en la página: “" + item.summary + "”. Lo registré como solicitud " + item.id.slice(0,8) + " para revisar. No he tocado la web ni publicado nada. Cuando esté conectado el repositorio y las pruebas, podrás aprobar su implementación con APROBAR CAMBIO " + item.id.slice(0,8) + ".");
      return;
    }
    if (learned.save) {
      let saved;
      if (learned.action === "update" && learned.targetMemoryId) {
        const active = await store.listOwnerMemories();
        if (active.some(item => item.id === learned.targetMemoryId)) saved = await store.updateOwnerMemory(learned.targetMemoryId, { text: learned.memoryText, category: learned.category, sourceMessage: message.id });
      }
      if (!saved) saved = await store.saveOwnerMemory({ text: learned.memoryText, category: learned.category, sourceMessage: message.id });
      await store.audit({ type: saved.revisions?.length ? "owner_memory_updated" : "owner_memory_saved", memoryId: saved.id, category: saved.category, source: "natural_language" });
      await whatsapp.sendText(message.from, saved.duplicate ? "Esa guía ya estaba guardada y la seguiré aplicando." : (saved.revisions?.length ? "Corregí la guía anterior y conservé su versión previa en el historial. La nueva regla es:\n“" : "Entendido. Aprendí y guardé esta indicación para futuras conversaciones con clientes:\n“") + saved.text + "”\nPuedes revisar mis guías con MEMORIAS.");
      return;
    }
    await whatsapp.sendText(message.from, learned.reason || "Te escucho. Puedes enseñarme una regla o pedirme un cambio en la página describiéndolo normalmente.");
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
  return { handleWebhook, handleOwnerMessage, subagents, orchestrator };
}
