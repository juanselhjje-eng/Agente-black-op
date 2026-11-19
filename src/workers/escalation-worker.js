export function startEscalationWorker({ store, whatsapp, config }) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const due = await store.listDueEscalations();
      for (const item of due) {
        const closed = await store.closeEscalation(item.id, "timed_out");
        if (!closed) continue;
        await whatsapp.sendText(item.customer, "Gracias por esperar. No logramos confirmar esa información con el equipo. Para atención directa, escríbenos al WhatsApp 311 334 8774.");
        await store.audit({ type: "owner_escalation_timeout", escalationId: item.id });
      }
    } catch (error) {
      console.error("Error en worker de escalaciones:", error);
    } finally {
      running = false;
    }
  }, 5000);
  timer.unref?.();
  return () => clearInterval(timer);
}
