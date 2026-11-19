import test from "node:test";
import assert from "node:assert/strict";
import { startWebsiteMonitorWorker } from "../src/workers/website-monitor-worker.js";
const tick = () => new Promise(resolve => setImmediate(resolve));

test("registra y notifica la primera caída de la página", async () => {
  const checks=[], audits=[], messages=[];
  const stop=startWebsiteMonitorWorker({
    monitor:{isConfigured:()=>true,check:async()=>({configured:true,ok:false,reason:"timeout",checkedAt:"2026-11-19T12:00:00.000Z"})},
    store:{getLatestWebsiteCheck:async()=>null,saveWebsiteCheck:async v=>checks.push(v),audit:async v=>audits.push(v)},
    whatsapp:{sendText:async(...v)=>messages.push(v)},
    config:{websiteMonitorIntervalMs:60000,ownerAlertsEnabled:true,ownerWhatsAppNumber:"573001112233"}
  });
  await tick(); stop();
  assert.equal(checks.length,1); assert.equal(audits[0].type,"website_status_changed");
  assert.equal(audits[0].firstFailure,true); assert.match(messages[0][1],/ALERTA/);
});

test("registra la recuperación aunque las alertas estén desactivadas", async () => {
  const audits=[],messages=[];
  const stop=startWebsiteMonitorWorker({
    monitor:{isConfigured:()=>true,check:async()=>({configured:true,ok:true,status:200,latencyMs:80,reason:"reachable",checkedAt:"2026-11-19T12:00:00.000Z"})},
    store:{getLatestWebsiteCheck:async()=>({ok:false}),saveWebsiteCheck:async()=>{},audit:async v=>audits.push(v)},
    whatsapp:{sendText:async(...v)=>messages.push(v)},
    config:{websiteMonitorIntervalMs:60000,ownerAlertsEnabled:false,ownerWhatsAppNumber:"573001112233"}
  });
  await tick(); stop();
  assert.equal(audits.length,1); assert.equal(audits[0].ok,true);
  assert.equal(audits[0].alertSent,false); assert.equal(messages.length,0);
});

test("no consulta una página sin URL configurada", async () => {
  let calls=0;
  const stop=startWebsiteMonitorWorker({monitor:{isConfigured:()=>false,check:async()=>calls++},store:{},whatsapp:{},config:{websiteMonitorIntervalMs:60000,ownerAlertsEnabled:false}});
  await tick(); stop(); assert.equal(calls,0);
});
