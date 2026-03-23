import express from "express";
import cors from "cors";
import workspaceRouter from "./routes/workspace.js";
import chatRouter from "./routes/chat.js";
import sessionsRouter from "./routes/sessions.js";
import skillsRouter from "./routes/skills.js";
import gatewayRouter from "./routes/gateway.js";
import renderRouter from "./routes/render.js";
import pipelineRouter from "./routes/pipeline.js";
import usageRouter from "./routes/usage.js";
import batchRouter from "./routes/batch.js";
import batchEditRouter from "./routes/batch-edit.js";
import batchExportRouter from "./routes/batch-export.js";
import interactivePipelineRouter from "./routes/interactive-pipeline.js";
import { getGateway } from "./services/gateway-client.js";
import { getDb } from "./db/client.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  const gateway = getGateway();
  res.json({ ok: true, gatewayConnected: gateway.isConnected });
});

app.use("/api/workspace", workspaceRouter);
app.use("/api/chat", chatRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/render", renderRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/usage", usageRouter);
app.use("/api/batch", batchRouter);
app.use("/api/batch", batchEditRouter);
app.use("/api/batch", batchExportRouter);
app.use("/api/interactive", interactivePipelineRouter);
app.use("/api", gatewayRouter);

getDb();
getGateway();

app.listen(PORT, () => {
  console.log(`[backend] OpenClaw Studio running on http://localhost:${PORT}`);
});
