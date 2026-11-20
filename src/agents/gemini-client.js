const TRANSIENT_STATUS = new Set([500, 502, 503, 504]);

function statusOf(error) {
  const direct = Number(error?.status || error?.statusCode || error?.code);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(error?.message || "").match(/\b(429|500|502|503|504)\b/);
  return match ? Number(match[1]) : 0;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls Gemini with the configured model, retries one transient server error,
 * then falls back to a lower-cost model when the primary is unavailable/quota-limited.
 */
export async function generateContentWithFallback(ai, request, {
  fallbackModel = "gemini-2.5-flash-lite",
  retryDelayMs = 350
} = {}) {
  if (!ai?.models?.generateContent) throw new TypeError("Gemini no está configurado.");
  const primaryModel = request?.model || "gemini-2.5-flash";
  const attempt = (model) => ai.models.generateContent({ ...request, model });

  try {
    return await attempt(primaryModel);
  } catch (firstError) {
    const status = statusOf(firstError);
    if (TRANSIENT_STATUS.has(status)) {
      await wait(retryDelayMs);
      try { return await attempt(primaryModel); }
      catch (retryError) {
        const retryStatus = statusOf(retryError);
        if (fallbackModel && fallbackModel !== primaryModel && (TRANSIENT_STATUS.has(retryStatus) || retryStatus === 429 || retryStatus === 404)) {
          return attempt(fallbackModel);
        }
        throw retryError;
      }
    }
    if (fallbackModel && fallbackModel !== primaryModel && (status === 429 || status === 404)) {
      return attempt(fallbackModel);
    }
    throw firstError;
  }
}
