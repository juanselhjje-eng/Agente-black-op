import test from "node:test";
import assert from "node:assert/strict";
import { createWebResearcher } from "../src/agents/web-researcher.js";

test("la investigación queda deshabilitada sin Gemini", async () => {
  const researcher = createWebResearcher();
  assert.equal(researcher.isConfigured(), false);
  const result = await researcher.research("Tendencias de paintball");
  assert.equal(result.status, "unavailable");
  assert.equal(result.sources.length, 0);
});

test("rechaza consultas vacías", async () => {
  const researcher = createWebResearcher({ ai: { models: { generateContent: async () => ({}) } } });
  await assert.rejects(() => researcher.research(" "), /tema concreto/);
});

test("devuelve fuentes HTTPS deduplicadas de grounding", async () => {
  const ai = { models: { generateContent: async () => ({
    text: "Hallazgo: una fuente reporta una actividad local.",
    candidates: [{ groundingMetadata: { groundingChunks: [
      { web: { uri: "https://example.com/a", title: "Fuente A" } },
      { web: { uri: "http://unsafe.example", title: "No segura" } },
      { web: { uri: "https://example.com/a", title: "Duplicada" } },
      { web: { uri: "https://example.org/b", title: "Fuente B" } }
    ] } }]
  }) } };
  const result = await createWebResearcher({ ai }).research("Competidores de paintball en Antioquia");
  assert.equal(result.status, "completed");
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].title, "Fuente A");
  assert.match(result.note, /fuentes devueltas/);
});

test("advierte si Gemini no entrega fuentes verificables", async () => {
  const ai = { models: { generateContent: async () => ({ text: "Texto sin grounding." }) } };
  const result = await createWebResearcher({ ai }).research("Ideas para redes sociales");
  assert.equal(result.sources.length, 0);
  assert.match(result.note, /no incluyó fuentes/);
});
