import test from "node:test";
import assert from "node:assert/strict";
import { createBlackOpsPublicApi } from "../src/integrations/blackops-api.js";

const config={blackopsApiEnabled:true,blackopsApiBaseUrl:"https://example.test/functions/v1/api"};
const response=(payload,overrides={})=>({ok:true,json:async()=>payload,...overrides});

test("API pública permanece apagada por defecto", async () => {
  const api=createBlackOpsPublicApi({blackopsApiEnabled:false,blackopsApiBaseUrl:""});
  assert.equal(api.isEnabled(),false);
  await assert.rejects(()=>api.getPublicConfig(),/no está habilitada/);
});
test("consulta configuración con POST encapsulando GET y timeout", async () => {
  let request;
  const api=createBlackOpsPublicApi(config,async(url,options)=>{request={url,options};return response({settings:{price_standard:35000}});});
  const result=await api.getPublicConfig();
  assert.equal(result.settings.price_standard,35000);
  assert.equal(request.url,config.blackopsApiBaseUrl);
  assert.equal(request.options.method,"POST");
  assert.equal(request.options.headers.Accept,"application/json");
  assert.deepEqual(JSON.parse(request.options.body),{method:"GET",path:"/api/public/config"});
  assert.ok(request.options.signal);
});
test("consulta disponibilidad con rango codificado",async()=>{
  let body;
  const api=createBlackOpsPublicApi(config,async(_url,options)=>{body=JSON.parse(options.body);return response({busy:[],disabled:[],blocked:[]});});
  const result=await api.getAvailability("2026-11-20","2026-11-22");
  assert.deepEqual(result,{busy:[],disabled:[],blocked:[]});
  assert.equal(body.path,"/api/public/availability?from=2026-11-20&to=2026-11-22");
});
test("rechaza fechas mal formadas, imposibles, invertidas y ventanas mayores a 31 días",()=>{
  const api=createBlackOpsPublicApi(config,async()=>response({busy:[]}));
  assert.throws(()=>api.getAvailability("20-11-2026","2026-11-21"),/fechas reales/);
  assert.throws(()=>api.getAvailability("2026-02-30","2026-03-01"),/fechas reales/);
  assert.throws(()=>api.getAvailability("2026-11-22","2026-11-21"),/fechas reales/);
  assert.throws(()=>api.getAvailability("2026-11-01","2026-12-02"),/31 días/);
});
test("rechaza URL insegura o malformada antes de activar la API",()=>{
  assert.throws(()=>createBlackOpsPublicApi({...config,blackopsApiBaseUrl:"http://example.test/api"}),/HTTPS/);
  assert.throws(()=>createBlackOpsPublicApi({...config,blackopsApiBaseUrl:"not a url"}),/no es válida/);
});
test("traduce errores HTTP, red, timeout y JSON inválido",async()=>{
  const http=createBlackOpsPublicApi(config,async()=>response({}, {ok:false,status:503}));
  await assert.rejects(()=>http.getPublicConfig(),/HTTP 503/);
  const network=createBlackOpsPublicApi(config,async()=>{throw new Error("secret socket details");});
  await assert.rejects(()=>network.getPublicConfig(),/No fue posible conectar/);
  const timeout=createBlackOpsPublicApi(config,async()=>{const e=new Error("timeout");e.name="TimeoutError";throw e;});
  await assert.rejects(()=>timeout.getPublicConfig(),/tiempo de espera/);
  const invalidJson=createBlackOpsPublicApi(config,async()=>({ok:true,json:async()=>{throw new Error("parse");}}));
  await assert.rejects(()=>invalidJson.getPublicConfig(),/JSON válido/);
});
test("rechaza respuestas que no sean objetos JSON",async()=>{
  const api=createBlackOpsPublicApi(config,async()=>response([]));
  await assert.rejects(()=>api.getPublicConfig(),/respuesta inválida/);
});
