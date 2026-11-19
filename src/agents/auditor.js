const ALERT_TYPES = new Set(["owner_web_research_failed","owner_availability_query_failed","owner_escalation_timeout"]);
const FAILURE_TYPES = new Set(["website_status_changed","owner_web_research_failed","owner_availability_query_failed","owner_escalation_timeout","subagent_error","webhook_processing_failed"]);

export function summarizeAuditEvents(events = []) {
  const safeEvents = Array.isArray(events) ? events.filter(item => item && typeof item === "object" && typeof item.type === "string") : [];
  const counts = Object.create(null);
  for (const event of safeEvents) counts[event.type] = (counts[event.type] || 0) + 1;
  const failures = safeEvents.filter(event =>
    FAILURE_TYPES.has(event.type) && (
      event.type !== "website_status_changed" || event.ok === false
    )
  );
  const urgent = safeEvents.filter(event => event.urgent === true || event.type === "urgent_customer_escalation");
  const timeouts = safeEvents.filter(event => event.type === "owner_escalation_timeout");
  const findings = [];
  if (timeouts.length) findings.push({ severity: "warning", code: "owner_response_timeout", count: timeouts.length, message: "Consultas de clientes vencieron sin respuesta del dueño." });
  const websiteDown = failures.filter(event => event.type === "website_status_changed" && event.ok === false);
  if (websiteDown.length) findings.push({ severity: "critical", code: "website_down_event", count: websiteDown.length, message: "Se registraron eventos de caída de la página; revisar el último chequeo y la recuperación." });
  const researchFailed = failures.filter(event => event.type === "owner_web_research_failed");
  if (researchFailed.length) findings.push({ severity: "warning", code: "research_failures", count: researchFailed.length, message: "Fallaron investigaciones web; revisar disponibilidad de Gemini y grounding." });
  const availabilityFailed = failures.filter(event => event.type === "owner_availability_query_failed");
  if (availabilityFailed.length) findings.push({ severity: "warning", code: "availability_query_failures", count: availabilityFailed.length, message: "Fallaron consultas públicas de disponibilidad; no comunicar horarios como verificados." });
  if (urgent.length) findings.push({ severity: "critical", code: "urgent_escalations", count: urgent.length, message: "Se registraron eventos de atención urgente; verificar que el equipo humano los haya atendido." });
  return {
    eventCount: safeEvents.length,
    eventTypes: Object.fromEntries(Object.entries(counts).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))),
    findings,
    counts: { failures: failures.length, urgent: urgent.length, ownerTimeouts: timeouts.length },
    privacy: "El resumen muestra tipos y conteos; no reproduce teléfonos, nombres, mensajes ni datos personales."
  };
}

export function createGeneralAuditor({ store } = {}) {
  return {
    isConfigured: () => typeof store?.listAudit === "function",
    async getReport({ since = new Date(Date.now() - 86400000).toISOString(), limit = 1000 } = {}) {
      if (!store?.listAudit) return { status: "unavailable", message: "El almacenamiento no expone el registro de auditoría." };
      const events = await store.listAudit(Math.max(1, Math.min(1000, Number(limit) || 1000)));
      const filtered = events.filter(event => event.at && new Date(event.at).toString() !== "Invalid Date" && new Date(event.at) >= new Date(since));
      return { status: "completed", since, summary: summarizeAuditEvents(filtered) };
    }
  };
}
