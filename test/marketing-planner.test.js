import test from "node:test";
import assert from "node:assert/strict";
import { createMarketingPlanner } from "../src/agents/marketing-planner.js";

test("crea un calendario con ideas y fuentes separadas sin publicar", async () => {
  const calls=[];
  const planner=createMarketingPlanner({
    ai:{models:{generateContent:async input=>{calls.push(input);return {text:JSON.stringify({campaign:"Experiencia táctica",audience:"Grupos de amigos",strategicAngle:"Diversión en equipo",posts:[{day:"Lunes",objective:"alcance",format:"reel",hook:"¿Listos para el reto?",concept:"Mostrar preparación del campo",caption:"Vive una experiencia en equipo.",callToAction:"Consulta cómo reservar",visualBrief:"Video propio del campo",metric:"Reproducciones",evidence:"Idea creativa"}]})};}}},
    researcher:{research:async()=>({status:"completed",summary:"Referencia general",sources:[{title:"Fuente",url:"https://example.com/source"}],note:"Verificar vigencia"})}
  });
  const result=await planner.createCalendar("Aumentar consultas de grupos");
  assert.equal(result.status,"draft");
  assert.equal(result.posts.length,1);
  assert.equal(result.sources[0].url,"https://example.com/source");
  assert.match(result.safeguards[0],/no se publicó/);
  assert.equal(calls.length,1);
});
test("no crea calendario vacío ni sin dependencias", async () => {
  assert.equal(createMarketingPlanner().isConfigured(),false);
  assert.equal((await createMarketingPlanner().createCalendar("campaña")).status,"unavailable");
  const planner=createMarketingPlanner({ai:{models:{generateContent:async()=>({text:"{}"})}},researcher:{research:async()=>({status:"no_results",sources:[]})}});
  await assert.rejects(()=>planner.createCalendar("campaña"),/calendario de contenido válido/);
});
test("rechaza briefs vacíos", async () => {
  const planner=createMarketingPlanner({ai:{},researcher:{research:async()=>({})}});
  await assert.rejects(()=>planner.createCalendar("  "),/Describe el objetivo/);
});
