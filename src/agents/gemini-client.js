const TRANSIENT_STATUS = new Set([500, 502, 503, 504]);

function statusOf(error) {
  const direct = Number(error?.status || error?.statusCode || error?.code);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(error?.message || "").match(/\b(429|500|502|503|504)\b/);
  return match ? Number(match[1]) : 0;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tries configured Gemini projects in order. Each project gets one retry for
 * transient server errors and a lower-cost model fallback before moving on.
 * Pass one client for backwards compatibility or an array of clients.
 */
export async function generateContentWithFallback(aiClients, request, {
  fallbackModel = "gemini-3.5-flash-lite",
  retryDelayMs = 350
} = {}) {
  const clients = (Array.isArray(aiClients) ? aiClients : [aiClients]).filter((client) => client?.models?.generateContent);
  if (!clients.length) throw new TypeError("Gemini no está configurado.");
  const primaryModel = request?.model || "gemini-2.5-flash";
  let lastError;

  for (const client of clients) {
    const attempt = (model) => client.models.generateContent({ ...request, model });
    try {
      return await attempt(primaryModel);
    } catch (firstError) {
      lastError = firstError;
      let error = firstError;
      let status = statusOf(error);

      if (TRANSIENT_STATUS.has(status)) {
        await wait(retryDelayMs);
        try { return await attempt(primaryModel); }
        catch (retryError) { error = retryError; status = statusOf(error); lastError = error; }
      }

      if (fallbackModel && fallbackModel !== primaryModel && (TRANSIENT_STATUS.has(status) || status === 429 || status === 404)) {
        try { return await attempt(fallbackModel); }
        catch (fallbackError) { error = fallbackError; status = statusOf(error); lastError = error; }
      }

      // Quota, unavailable model, or service overload: try the next project.
      if (status === 429 || status === 404 || TRANSIENT_STATUS.has(status)) continue;
      throw error;
    }
  }
  throw lastError || new Error("No fue posible completar la solicitud con los proyectos Gemini configurados.");
}
