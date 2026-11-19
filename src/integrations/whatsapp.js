export function createWhatsAppClient(config) {
  const configured = Boolean(config.whatsappAccessToken && config.whatsappPhoneNumberId);
  return {
    isConfigured: () => configured,
    async sendText(to, body) {
      if (!configured) {
        console.warn("WhatsApp no configurado; mensaje no enviado.");
        return { sent: false, reason: "not_configured" };
      }
      const response = await fetch(`https://graph.facebook.com/${config.whatsappApiVersion}/${config.whatsappPhoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.whatsappAccessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`WhatsApp API ${response.status}: ${JSON.stringify(data)}`);
      return { sent: true, data };
    }
  };
}
