import { createSubagents } from "./subagents.js";
import { createOrchestrator } from "./orchestrator.js";
import { buildOwnerReport } from "../reports/owner-report.js";
import { parseCustomerPaymentReport, customerPaymentReportMessage, ownerPaymentReportMessage, isCustomerPaymentInfoRequest, customerPaymentInstructionsMessage } from "./reservation-policy.js";
import { parseCustomerReservationRequest, parseCustomerReservationCancellation, parseOwnerReservationRejection, parseOwnerReservationClosure, reservationRequestCustomerMessage, reservationRequestOwnerMessage, reservationRequestStatusMessage } from "./reservation-workflow.js";
function extractMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry || []) for (const change of entry?.changes || []) for (const message of change?.value?.messages || []) {
    if (message.type === "text" && message.text?.body) messages.push({ id: message.id, from: message.from, text: message.text.body });
  }
  return messages;
}
const normalizeNumber = value => String(value || "").replace(/\D/g, "");
export function parseAvailabilityCommand(text) {
  const match = String(text || "").trim().match(/^DISPONIBILIDAD:\s*(\d{4}-\d{2}-\d{2})(?:\s+(standard|tactical|elite))?(?:\s+(\d{1,2}))?$/i);
  if (!match) return null;
  const players = Number(match[3] || 2);
  if (!Number.isInteger(players) || players < 2 || players > 10) return null;
  return { date: match[1], packageType: (match[2] || "standard").toLowerCase(), players };
}
export function parseCustomerAvailabilityRequest(value) {
  const input = String(value || "").trim();
  const match = input.match(/(?:disponibilidad|horarios|reservar|reserva)\s+(?:para\s+(?:el\s+)?)?(\d{4}-\d{2}-\d{2})(?:\s+(?:para\s+)?(\d{1,2})(?:\s*(?:personas|jugadores))?)?(?:\s+(standard|tactical|elite))?/i);
  if (!match) return null;
  const date = match[1];
  const time = Date.parse(date + "T00:00:00.000Z");
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== date) return null;
  const players = Number(match[2] || 2);
  if (!Number.isInteger(players) || players < 2 || players > 10) return null;
  return { date, players, packageType: (match[3] || "standard").toLowerCase() };
}
export function parseOwnerReply(text) {
  const match = String(text || "").trim().match(/^RESPONDER\s+([0-9a-f-]{36})\s*[:|-]\s*([\s\S]+)$/i);
  return match ? { escalationId: match[1], answer: match[2].trim() } : null;
}
export function createSecretary({ config, store, whatsapp }) {
  const subagents = createSubagents(config, { store });
  const orchestrator = createOrchestrator({ support: subagents.atencionWhatsApp });
  async function handleWebhook(payload) {
    for (const message of extractMessages(payload)) {
      if (!await store.addMessage({ id: message.id, from: message.from, text: message.text })) continue;
      await store.audit({ type: "incoming_message", messageId: message.id, from: message.from });
      if (config.ownerWhatsAppNumber && normalizeNumber(message.from) === normalizeNumber(config.ownerWhatsAppNumber)) {
        await handleOwnerMessage(message); continue;
      }
      const paymentReport = parseCustomerPaymentReport(message.text);
      if (paymentReport) {
        await whatsapp.sendText(message.from, customerPaymentReportMessage());
        if (config.ownerAlertsEnabled && config.ownerWhatsAppNumber) {
          await whatsapp.sendText(config.ownerWhatsAppNumber, ownerPaymentReportMessage({
            customer: message.from,
            reportedAmountCop: paymentReport.reportedAmountCop
          }));
        }
        await store.audit({
          type: "customer_payment_reported_unverified",
          messageId: message.id,
          evidenceType: paymentReport.evidenceType,
          amountMentioned: paymentReport.reportedAmountCop !== null
        });
        continue;
      }
      if (isCustomerPaymentInfoRequest(message.text)) {\n        await whatsapp.sendText(message.from, customerPaymentInstructionsMessage());\n        await store.audit({ type: "customer_payment_instructions_sent" });\n        continue;\n      }\n      const cancellationId = parseCustomerReservationCancellation(message.text);
      if (cancellationId) {
        const requests = await store.listReservationRequests({ activeOnly: false });
        const matches = requests.filter(item => item.id.startsWith(cancellationId));
        const item = matches.length === 1 ? matches[0] : null;
        const updated = item && normalizeNumber(item.customer) === normalizeNumber(message.from)
          ? await store.updateReservationRequest(item.id, "cancelled_by_customer", { resolutionNote: "Cancelada por el cliente." })
          : null;
        await whatsapp.sendText(message.from, updated ? reservationRequestStatusMessage(updated) : "No encontré una solicitud activa con ese código asociada a este número. Si necesitas ayuda, escríbenos al 311 334 8774.");
        if (updated) await store.audit({ type: "customer_reservation_request_cancelled", requestId: updated.id });
        continue;
      }
      const reservationRequest = parseCustomerReservationRequest(message.text);
      if (reservationRequest) {
        const item = await store.createReservationRequest({ customer: message.from, ...reservationRequest, sourceMessage: message.id, confirmation: "request_only" });
        await store.audit({ type: "customer_reservation_request_created", requestId: item.id, date: item.date, packageType: item.packageType, players: item.players });
        await whatsapp.sendText(message.from, reservationRequestCustomerMessage(item));
        if (config.ownerAlertsEnabled && config.ownerWhatsAppNumber) await whatsapp.sendText(config.ownerWhatsAppNumber, reservationRequestOwnerMessage(item));
        continue;
      }
      if (/\b(solicitar reserva|confirmar reserva)\b/i.test(message.text)) {
        await whatsapp.sendText(message.from, "Para registrar tu solicitud escribe: SOLICITAR RESERVA AAAA-MM-DD HH:MM JUGADORES PAQUETE. Ejemplo: SOLICITAR RESERVA 2026-11-20 10:30 4 tactical. La solicitud no confirma ni bloquea el horario.");
        continue;
      }
      const availabilityRequest = parseCustomerAvailabilityRequest(message.text);
      const availabilityIntent = /\b(disponibilidad|horarios|reservar|reserva)\b/i.test(message.text);
      if (availabilityIntent && !availabilityRequest) {
        await whatsapp.sendText(message.from, "Para revisar horarios, envíanos la fecha exacta en formato AAAA-MM-DD y la cantidad de jugadores (de 2 a 10). Ejemplo: disponibilidad 2026-11-20 para 4 personas tactical. Los horarios se confirman con el equipo.");
        await store.audit({ type:"customer_availability_details_requested" });
        continue;
      }
      if (availabilityRequest) {
        try {
          const plan = await subagents.supervisorWebAgenda.planAvailability({
            from: availabilityRequest.date,
            packageType: availabilityRequest.packageType,
            players: availabilityRequest.players
          });
          if (plan.status !== "verified_against_public_blocks") {
            await whatsapp.sendText(message.from, "¡Con gusto te ayudamos! En este momento no puedo verificar horarios automáticamente. Escríbenos al 311 334 8774 para confirmar disponibilidad con el equipo.");
            await store.audit({ type:"customer_availability_unverified", date:availabilityRequest.date, status:plan.status });
          } else {
            const slots = plan.slots.slice(0,8).map(slot => "• " + slot.time + " a " + slot.endsAt);
            const reply = slots.length
              ? "Para el " + availabilityRequest.date + ", paquete " + availabilityRequest.packageType + " y " + availabilityRequest.players + " jugadores, estos son horarios candidatos:\n" + slots.join("\n") + "\n\nSon opciones orientativas, no reservas confirmadas. El cupo puede cambiar; para formalizarlo, escríbenos al 311 334 8774."
              : "No encontré horarios candidatos para esa fecha con los bloqueos públicos consultados. El equipo puede revisar alternativas en el 311 334 8774.";
            await whatsapp.sendText(message.from, reply);
            await store.audit({ type:"customer_availability_candidates_sent", date:availabilityRequest.date, packageType:availabilityRequest.packageType, players:availabilityRequest.players, candidateCount:plan.slots.length });
          }
        } catch (error) {
          await whatsapp.sendText(message.from, "No pude verificar los horarios en este momento. Para confirmarlos, escríbenos al 311 334 8774.");
          await store.audit({ type:"customer_availability_query_failed", date:availabilityRequest.date, reason:String(error?.message || "unknown").slice(0,200) });
        }
        continue;
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
    if (/^INVESTIGAR\s*:/i.test(text)) {
      const query = text.replace(/^INVESTIGAR\s*:/i, "").trim();
      if (!query) {
        await whatsapp.sendText(message.from, "Después de INVESTIGAR: escribe el tema o competidor que quieres analizar.");
        return;
      }
      try {
        const report = await subagents.investigadorWeb.research(query);
        const sourceLines = (report.sources || []).map((source, index) => (index + 1) + ". " + source.title + "\n" + source.url);
        const response = [
          "INVESTIGACIÓN: " + report.topic,
          report.status === "completed" ? report.summary : report.note,
          sourceLines.length ? "FUENTES:\n" + sourceLines.join("\n") : "",
          report.note
        ].filter(Boolean).join("\n\n").slice(0, 6000);
        await whatsapp.sendText(message.from, response);
        await store.audit({ type: "owner_web_research_completed", topic: report.topic, sourceCount: report.sources?.length || 0, status: report.status });
      } catch (error) {
        await whatsapp.sendText(message.from, "No pude completar la investigación. " + (error?.message || "Intenta de nuevo más tarde."));
        await store.audit({ type: "owner_web_research_failed", topic: query.slice(0, 300), reason: String(error?.message || "unknown").slice(0, 300) });
      }
      return;
    }
    const availabilityCommand = parseAvailabilityCommand(text);
    if (availabilityCommand) {
      const { date, packageType, players } = availabilityCommand;
      const playersText = String(players);
      try {
        const result = await subagents.supervisorWebAgenda.planAvailability({ from: date, packageType: packageType.toLowerCase(), players });
        if (result.status !== "verified_against_public_blocks") {
          await whatsapp.sendText(message.from, "DISPONIBILIDAD NO VERIFICADA: " + result.message);
        } else {
          const lines = result.slots.slice(0, 24).map(slot => "• " + slot.date + " " + slot.time + "–" + slot.endsAt);
          const suffix = result.slots.length > 24 ? "\n... y " + (result.slots.length - 24) + " candidatos más." : "";
          await whatsapp.sendText(message.from, ["CANDIDATOS DE DISPONIBILIDAD (no son reservas confirmadas)", result.message, "Fecha: " + date + " | Paquete: " + packageType + " | Jugadores: " + playersText, lines.length ? lines.join("\n") + suffix : "Sin candidatos en ese día.", "La API pública no bloquea ni confirma cupos. Verifica y formaliza en el sistema oficial antes de prometer disponibilidad."].join("\n\n"));
        }
        await store.audit({ type: "owner_availability_planned", date, packageType, players: Number(playersText), status: result.status, candidateCount: result.slots?.length || 0 });
      } catch (error) {
        await whatsapp.sendText(message.from, "No pude consultar la disponibilidad pública: " + String(error?.message || "error").slice(0, 240));
        await store.audit({ type: "owner_availability_query_failed", date, reason: String(error?.message || "unknown").slice(0, 240) });
      }
      return;
    }
    const closure = parseOwnerReservationClosure(text);
    if (closure) {
      const requests = await store.listReservationRequests({ activeOnly: false });
      const matches = requests.filter(item => item.id.startsWith(closure.idPrefix));
      const item = matches.length === 1 ? matches[0] : null;
      const updated = item ? await store.updateReservationRequest(item.id, "closed", { resolutionNote: closure.note, resolvedBy: message.from }) : null;
      if (updated) {
        await whatsapp.sendText(updated.customer, reservationRequestStatusMessage(updated) + " Motivo: " + closure.note);
        await store.audit({ type: "reservation_request_closed", requestId: updated.id });
      }
      await whatsapp.sendText(message.from, updated ? "Solicitud " + updated.id.slice(0,8) + " cerrada y notificada al cliente. No se modificó ninguna reserva confirmada." : "No encontré una solicitud abierta única con ese código.");
      return;
    }
    const rejection = parseOwnerReservationRejection(text);
    if (rejection) {
      const requests = await store.listReservationRequests({ activeOnly: false });
      const matches = requests.filter(item => item.id.startsWith(rejection.idPrefix));
      const item = matches.length === 1 ? matches[0] : null;
      const updated = item ? await store.updateReservationRequest(item.id, "rejected", { resolutionNote: rejection.reason, resolvedBy: message.from }) : null;
      if (updated) {
        await whatsapp.sendText(updated.customer, reservationRequestStatusMessage(updated));
        await store.audit({ type: "reservation_request_rejected", requestId: updated.id });
      }
      await whatsapp.sendText(message.from, updated ? "Solicitud " + updated.id.slice(0,8) + " rechazada y notificada al cliente. No se modificó ninguna reserva confirmada." : "No encontré una solicitud abierta única con ese código.");
      return;
    }
    if (/^RESERVAS PENDIENTES$/i.test(text)) {
      const items = await store.listReservationRequests();
      const lines = items.slice(0,15).map(item => item.id.slice(0,8) + " — " + item.date + " " + item.time + " — " + item.players + " jugadores — " + item.packageType + " — " + item.status);
      await whatsapp.sendText(message.from, lines.length ? "SOLICITUDES (no son reservas confirmadas):\n" + lines.join("\n") + "\nUsa CONTACTADO RESERVA ID, RECHAZAR SOLICITUD ID: motivo, CERRAR SOLICITUD ID: nota o el cliente puede cancelar con CANCELAR SOLICITUD ID." : "No hay solicitudes de reserva pendientes.");
      return;
    }
    const contacted = text.match(/^CONTACTADO RESERVA\s+([0-9a-f-]{8,36})$/i);
    if (contacted) {
      const items = await store.listReservationRequests({ activeOnly: false });
      const item = items.find(entry => entry.id.startsWith(contacted[1]));
      const updated = item ? await store.updateReservationRequest(item.id, "owner_contacted") : null;
      await whatsapp.sendText(message.from, updated ? "Solicitud marcada como contactada. Esto no confirma ni registra una reserva en el calendario oficial." : "No encontré una solicitud activa con ese código.");
      if (updated) await store.audit({ type: "reservation_request_owner_contacted", requestId: updated.id });
      return;
    }
    if (/^AUDITORIA(?: HOY)?$/i.test(text)) {
      try {
        const since = new Date(Date.now() - 86400000).toISOString();
        const report = await subagents.auditorGeneral.getReport({ since, limit: 1000 });
        if (report.status !== "completed") {
          await whatsapp.sendText(message.from, report.message);
        } else {
          const summary = report.summary;
          const findings = summary.findings.map(item => "• [" + item.severity.toUpperCase() + "] " + item.message + " (" + item.count + ")");
          const types = Object.entries(summary.eventTypes).slice(0, 8).map(([type,count]) => "• " + type + ": " + count);
          await whatsapp.sendText(message.from, ["AUDITORÍA OPERATIVA — ÚLTIMAS 24 HORAS", "Eventos analizados: " + summary.eventCount, "Fallos registrados: " + summary.counts.failures, "Escalamientos urgentes: " + summary.counts.urgent, "Consultas vencidas: " + summary.counts.ownerTimeouts, "Reportes de pago pendientes de verificación: " + (summary.counts.paymentReportsPending || 0), findings.length ? "HALLAZGOS:\n" + findings.join("\n") : "Sin hallazgos de alerta en los eventos consultados.", types.length ? "ACTIVIDAD PRINCIPAL:\n" + types.join("\n") : "", summary.privacy].filter(Boolean).join("\n\n"));
        }
        await store.audit({ type: "owner_audit_report_requested", eventCount: report.summary?.eventCount || 0, findings: report.summary?.findings?.length || 0 });
      } catch (error) {
        await whatsapp.sendText(message.from, "No pude generar la auditoría: " + String(error?.message || "error").slice(0, 200));
      }
      return;
    }
    if (/^MARKETING\s*:/i.test(text)) {
      const brief = text.replace(/^MARKETING\s*:/i, "").trim();
      if (!brief) {
        await whatsapp.sendText(message.from, "Después de MARKETING: describe qué quieres lograr, por ejemplo: atraer grupos, aumentar consultas o mostrar la experiencia.");
        return;
      }
      try {
        const plan = await subagents.planificadorMarketing.createCalendar(brief);
        if (plan.status !== "draft") {
          await whatsapp.sendText(message.from, plan.message || "El planificador de marketing no está disponible.");
        } else {
          const posts = plan.posts.map((post,index) => [
            (index+1) + ". " + post.day + " — " + post.format.toUpperCase() + " / " + post.objective,
            "Gancho: " + post.hook,
            "Concepto: " + post.concept,
            "Caption: " + post.caption,
            "CTA: " + post.callToAction,
            "Visual: " + post.visualBrief,
            "Métrica: " + post.metric,
            "Base: " + post.evidence
          ].join("\n")).join("\n\n");
          const sources = (plan.sources || []).map((source,index)=>(index+1)+". "+source.title+"\n"+source.url).join("\n");
          const response = ["BORRADOR DE MARKETING — NO PUBLICADO", plan.campaign, "Audiencia: "+plan.audience, "Enfoque: "+plan.strategicAngle, posts, sources ? "FUENTES DE INVESTIGACIÓN:\n"+sources : "Sin fuentes verificables; las propuestas son ideas creativas.", plan.safeguards.join("\n")].filter(Boolean).join("\n\n").slice(0,6000);
          await whatsapp.sendText(message.from,response);
        }
        await store.audit({ type:"owner_marketing_calendar_created", brief:brief.slice(0,300), status:plan.status, postCount:plan.posts?.length || 0, sourceCount:plan.sources?.length || 0 });
      } catch (error) {
        await whatsapp.sendText(message.from,"No pude crear el calendario: "+String(error?.message || "error").slice(0,220));
        await store.audit({ type:"owner_marketing_calendar_failed", reason:String(error?.message || "unknown").slice(0,220) });
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
        await whatsapp.sendText(message.from, details.join("\n"));
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
