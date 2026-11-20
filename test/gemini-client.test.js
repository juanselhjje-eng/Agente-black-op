import test from "node:test";
import assert from "node:assert/strict";
import { generateContentWithFallback } from "../src/agents/gemini-client.js";

test("usa el modelo principal cuando responde", async () => {
  const calls = [];
  const ai = { models: { generateContent: async (request) => { calls.push(request.model); return { text: "ok" }; } } };
  const result = await generateContentWithFallback(ai, { model: "gemini-2.5-flash", contents: "hola" }, { retryDelayMs: 0 });
  assert.equal(result.text, "ok");
  assert.deepEqual(calls, ["gemini-2.5-flash"]);
});

test("cambia al modelo alternativo cuando el principal agota cuota", async () => {
  const calls = [];
  const ai = { models: { generateContent: async (request) => {
    calls.push(request.model);
    if (request.model === "gemini-2.5-flash") throw Object.assign(new Error("quota"), { status: 429 });
    return { text: "fallback" };
  } } };
  const result = await generateContentWithFallback(ai, { model: "gemini-2.5-flash", contents: "hola" }, { retryDelayMs: 0 });
  assert.equal(result.text, "fallback");
  assert.deepEqual(calls, ["gemini-2.5-flash", "gemini-2.5-flash-lite"]);
});

test("reintenta una vez un error temporal y luego usa alternativa", async () => {
  const calls = [];
  const ai = { models: { generateContent: async (request) => {
    calls.push(request.model);
    if (request.model === "gemini-2.5-flash") throw Object.assign(new Error("busy"), { status: 503 });
    return { text: "fallback" };
  } } };
  const result = await generateContentWithFallback(ai, { model: "gemini-2.5-flash", contents: "hola" }, { retryDelayMs: 0 });
  assert.equal(result.text, "fallback");
  assert.deepEqual(calls, ["gemini-2.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"]);
});

test("no oculta errores no recuperables", async () => {
  const error = Object.assign(new Error("bad request"), { status: 400 });
  const ai = { models: { generateContent: async () => { throw error; } } };
  await assert.rejects(
    generateContentWithFallback(ai, { model: "gemini-2.5-flash", contents: "hola" }, { retryDelayMs: 0 }),
    (actual) => actual === error
  );
});

test("usa el segundo proyecto cuando el primero agota su cuota", async () => {
  const calls = [];
  const first = { models: { generateContent: async (request) => {
    calls.push("cuenta1:" + request.model);
    throw Object.assign(new Error("quota"), { status: 429 });
  } } };
  const second = { models: { generateContent: async (request) => {
    calls.push("cuenta2:" + request.model);
    return { text: "segunda cuenta" };
  } } };
  const result = await generateContentWithFallback([first, second], { model: "gemini-2.5-flash", contents: "hola" }, { retryDelayMs: 0 });
  assert.equal(result.text, "segunda cuenta");
  assert.deepEqual(calls, ["cuenta1:gemini-2.5-flash", "cuenta1:gemini-2.5-flash-lite", "cuenta2:gemini-2.5-flash"]);
});

test("acepta clientes de Gemini como arreglo y omite duplicados de claves en config", async () => {
  const first = { models: { generateContent: async () => { throw Object.assign(new Error("quota"), { status: 429 }); } } };
  const second = { models: { generateContent: async () => ({ text: "ok" }) } };
  const result = await generateContentWithFallback([first, second], { model: "gemini-2.5-flash" }, { retryDelayMs: 0 });
  assert.equal(result.text, "ok");
});
