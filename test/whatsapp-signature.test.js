import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWhatsAppSignature } from "../src/integrations/whatsapp-signature.js";

test("acepta firma HMAC válida", () => {
  const body = Buffer.from(JSON.stringify({ hello: "world" }));
  const secret = "test-secret";
  const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyWhatsAppSignature(body, signature, secret), true);
});

test("rechaza firma inválida", () => {
  assert.equal(verifyWhatsAppSignature(Buffer.from("{}"), "sha256=bad", "secret"), false);
});
