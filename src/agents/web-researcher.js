import { generateContentWithFallback } from "./gemini-client.js";

const MAX_QUERY = 500;
const MAX_SOURCES = 8;

function clean(value, max = 1000) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function extractSources(response) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];
  for (const chunk of chunks) {
    const web = chunk?.web;
    const url = clean(web?.uri, 2000);
    const title = clean(web?.title, 300);
    if (!url || !/^https:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: title || url, url });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}

export function createWebResearcher({ ai, model = "gemini-2.5-flash" } = {}) {
  return {
    isConfigured: () => Boolean(ai),
    async research(query) {
      const topic = clean(query, MAX_QUERY);
      if (!topic) throw new TypeError("Escribe un tema concreto para investigar.");
      if (!ai) return { status: "unavailable", topic, summary: "", findings: [], sources: [], note: "Configura GEMINI_API_KEY para habilitar investigación con búsqueda fundamentada." };
      const response = await generateContentWithFallback(ai, {
        model,
        contents: topic,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: [
            "Eres el investigador de mercado de Black Ops Paintball, un campo de paintball táctico en Támesis, Antioquia, Colombia.",
            "Investiga con Google Search. Separa hechos encontrados de hipótesis e ideas sugeridas.",
            "Prioriza fuentes oficiales, páginas de competidores, medios reconocidos y fuentes recientes.",
            "No inventes competidores, precios, fechas, cifras ni enlaces. Si la búsqueda no aporta evidencia, dilo.",
            "No afirmes que una tendencia aplica a Támesis o Antioquia si la fuente no lo demuestra.",
            "Responde en español con resumen ejecutivo, hallazgos verificables y oportunidades sugeridas."
          ].join(" ")
        }
      });
      const summary = clean(response?.text, 7000);
      const sources = extractSources(response);
      return {
        status: summary ? "completed" : "no_results",
        topic,
        summary,
        sources,
        findings: [],
        generatedAt: new Date().toISOString(),
        note: sources.length ? "Los enlaces corresponden a fuentes devueltas por la búsqueda fundamentada. Verifica vigencia y contexto antes de tomar decisiones." : "La respuesta no incluyó fuentes web verificables; no uses sus afirmaciones como hechos confirmados."
      };
    }
  };
}
