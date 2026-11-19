import { classifyCustomerMessage, reviewCustomerAnswer } from "./reviewer.js";

export function createOrchestrator({ support }) {
  if (!support?.answer) throw new TypeError("El orquestador requiere el subagente de atención.");
  return {
    async handleCustomerMessage(message, ownerMemories = []) {
      const classification = classifyCustomerMessage(message);
      if (classification.urgent) {
        return reviewCustomerAnswer(message, {
          text: "Caso urgente detectado.",
          needsOwner: true,
          urgent: true
        });
      }
      let result;
      try {
        result = await support.answer(message, ownerMemories);
      } catch (error) {
        result = {
          text: "No pude verificar esa información en este momento. Para atención directa, escríbenos al 311 334 8774.",
          needsOwner: true,
          urgent: false,
          error: error?.message || "support_error"
        };
      }
      if (classification.needsOwner) result.needsOwner = true;
      return reviewCustomerAnswer(message, result);
    }
  };
}
