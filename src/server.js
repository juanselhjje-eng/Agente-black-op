import "dotenv/config";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "agente-black-ops",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (_request, response) => {
  response.status(200).json({
    name: "Agente Black Ops",
    status: "initializing",
    message: "Backend base disponible. Integraciones pendientes de configurar."
  });
});

app.listen(port, host, () => {
  console.log(`Agente Black Ops escuchando en http://${host}:${port}`);
});
