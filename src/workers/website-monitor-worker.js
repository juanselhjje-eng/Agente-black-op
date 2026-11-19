export function startWebsiteMonitorWorker({ monitor, store, whatsapp, config }) {
  let running = false;
  let stopped = false;
  async function runCheck() {
    if (running || stopped || !monitor.isConfigured()) return;
    running = true;
    try {
      const result = await monitor.check();
      const previous = await store.getLatestWebsiteCheck();
      await store.saveWebsiteCheck(result);
      const firstFailure = !previous && !result.ok;
      const statusChanged = previous && previous.ok !== result.ok;
      if (firstFailure || statusChanged) {
        await store.audit({ type: "website_status_changed", ok: result.ok, reason: result.reason, status: result.status || null, firstFailure, alertSent: Boolean(config.ownerAlertsEnabled && config.ownerWhatsAppNumber) });
        if (config.ownerAlertsEnabled && config.ownerWhatsAppNumber) {
          const message = result.ok
            ? "RECUPERACIÓN: la página de Black Ops vuelve a responder. HTTP " + result.status + ", " + result.latencyMs + " ms."
            : "ALERTA: la página de Black Ops no responde correctamente. Motivo: " + result.reason + (result.status ? ", HTTP " + result.status : "") + ".";
          await whatsapp.sendText(config.ownerWhatsAppNumber, message);
        } else {
          console.warn("Cambio de estado web registrado, pero no se notificó: configura OWNER_WHATSAPP_NUMBER y OWNER_ALERTS_ENABLED=true.");
        }
      }
      return result;
    } catch (error) {
      console.error("Error en monitor de página:", error);
      return null;
    } finally { running = false; }
  }
  const timer = setInterval(runCheck, config.websiteMonitorIntervalMs);
  timer.unref?.();
  void runCheck();
  return () => { stopped = true; clearInterval(timer); };
}
