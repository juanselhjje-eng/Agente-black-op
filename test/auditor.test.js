import test from "node:test";
import assert from "node:assert/strict";
import { createGeneralAuditor, summarizeAuditEvents } from "../src/agents/auditor.js";

test("resume eventos sin exponer contenido personal", () => {
  const summary = summarizeAuditEvents([
    { type:"incoming_message", from:"573001112233", text:"dato privado" },
    { type:"owner_escalation_timeout" },
    { type:"website_status_changed", ok:false },
    { type:"owner_web_research_failed" },
    { type:"owner_availability_query_failed" },
    { type:"customer_payment_reported_unverified", amountMentioned:true }
  ]);
  assert.equal(summary.eventCount,6);
  assert.equal(summary.counts.failures,4);
  assert.equal(summary.counts.paymentReportsPending,1);
  assert.equal(summary.findings.find(item=>item.code==="payment_reports_pending").count,1);
  assert.equal(summary.findings.find(item=>item.code==="website_down_event").severity,"critical");
  assert.match(summary.privacy,/no reproduce teléfonos/);
  assert.equal(JSON.stringify(summary).includes("573001112233"),false);
  assert.equal(JSON.stringify(summary).includes("dato privado"),false);
});
test("ignora entradas malformadas y no marca recuperación como caída", () => {
  const summary=summarizeAuditEvents([null,{}, {type:"website_status_changed",ok:true},{type:"incoming_message"}]);
  assert.equal(summary.eventCount,2);
  assert.equal(summary.counts.failures,0);
  assert.equal(summary.findings.length,0);
});
test("auditor obtiene eventos recientes del almacenamiento", async () => {
  const auditor=createGeneralAuditor({store:{listAudit:async()=>[
    {type:"owner_escalation_timeout",at:"2026-11-19T10:00:00.000Z"},
    {type:"incoming_message",at:"2026-11-18T10:00:00.000Z"}
  ]}});
  const result=await auditor.getReport({since:"2026-11-19T00:00:00.000Z"});
  assert.equal(result.summary.eventCount,1);
  assert.equal(result.summary.counts.ownerTimeouts,1);
});
test("auditor declara dependencia ausente", async () => {
  const result=await createGeneralAuditor().getReport();
  assert.equal(result.status,"unavailable");
});
