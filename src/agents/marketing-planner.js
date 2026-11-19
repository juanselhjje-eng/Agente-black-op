const FORMATS = new Set(["reel","carrusel","historia","post"]);
const OBJECTIVES = new Set(["alcance","interaccion","consideracion","conversion","comunidad"]);

function text(value, max = 600) { return String(value || "").replace(/[<>]/g, "").trim().slice(0,max); }
function normalizePlan(raw, research) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.posts)) throw new TypeError("Gemini no devolvió un calendario de contenido válido.");
  const posts = raw.posts.slice(0,7).map((item,index) => {
    const format = FORMATS.has(item?.format) ? item.format : "reel";
    const objective = OBJECTIVES.has(item?.objective) ? item.objective : "alcance";
    return {
      day: text(item?.day,30) || "Día " + (index+1),
      objective,
      format,
      hook: text(item?.hook,180),
      concept: text(item?.concept,500),
      caption: text(item?.caption,900),
      callToAction: text(item?.callToAction,180),
      visualBrief: text(item?.visualBrief,500),
      metric: text(item?.metric,100) || "Alcance e interacciones",
      evidence: text(item?.evidence,350) || "Idea creativa; no es un dato de mercado verificado."
    };
  }).filter(item => item.hook && item.concept && item.caption);
  if (!posts.length) throw new TypeError("El calendario generado no contiene publicaciones utilizables.");
  const sources = (research?.sources || []).filter(source => /^https:\/\//i.test(source.url)).slice(0,8);
  return {
    status: "draft",
    campaign: text(raw.campaign,160) || "Calendario de contenido Black Ops",
    audience: text(raw.audience,300),
    strategicAngle: text(raw.strategicAngle,500),
    posts,
    sources,
    safeguards: [
      "Borrador creativo: no se publicó nada en Instagram.",
      "No presentes ideas generadas como cifras o tendencias verificadas.",
      "Verifica fechas, precios, promociones, disponibilidad y condiciones antes de publicar.",
      "Usa únicamente fotos y videos propios o con derechos de uso."
    ],
    researchStatus: research?.status || "unavailable",
    researchNote: research?.note || "No se obtuvo investigación fundamentada."
  };
}

export function createMarketingPlanner({ ai, model = "gemini-2.5-flash", researcher } = {}) {
  return {
    isConfigured: () => Boolean(ai && researcher?.research),
    async createCalendar(topic) {
      const brief = text(topic,500);
      if (!brief) throw new TypeError("Describe el objetivo o tema de la campaña.");
      if (!ai || !researcher?.research) return { status:"unavailable", message:"Se requiere Gemini y el investigador web fundamentado para crear un calendario responsable." };
      const research = await researcher.research("Tendencias, referencias y oportunidades de contenido para Instagram de un campo de paintball y experiencias recreativas. Tema solicitado: " + brief);
      const response = await ai.models.generateContent({
        model,
        contents: JSON.stringify({ brief, research: { status:research.status, summary:research.summary, sources:research.sources, note:research.note } }),
        config: {
          responseMimeType: "application/json",
          systemInstruction: [
            "Eres el estratega de contenido de Black Ops Paintball, negocio de paintball táctico en Támesis, Antioquia.",
            "Crea un calendario de máximo 7 publicaciones para Instagram, en español colombiano natural.",
            "Separa evidencia de creatividad: solo atribuye hechos a la investigación incluida; cuando no haya fuente, escribe que es una idea creativa.",
            "No inventes precios, descuentos, testimonios, disponibilidad, ubicación exacta, edades permitidas, cifras, premios ni promesas de seguridad.",
            "No sugieras mostrar prácticas inseguras ni menores sin autorización de sus acudientes.",
            "Cada publicación debe tener objetivo, formato, gancho, concepto, caption, CTA, brief visual y métrica.",
            "No publiques ni programes contenido. Devuelve JSON {campaign,audience,strategicAngle,posts:[{day,objective,format,hook,concept,caption,callToAction,visualBrief,metric,evidence}]}."
          ].join(" ")
        }
      });
      let parsed;
      try { parsed = JSON.parse(response?.text || "{}"); }
      catch { throw new TypeError("Gemini no devolvió JSON válido para el calendario."); }
      return normalizePlan(parsed, research);
    }
  };
}
