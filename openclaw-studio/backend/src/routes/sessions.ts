import { Router } from "express";
import { randomUUID } from "crypto";
import {
  getGateway,
  type SessionInfo,
} from "../services/gateway-client.js";

const router = Router();

const SESSION_PREFIX = "studio:";

function buildSessionKey(projectPath: string, sessionId: string): string {
  return `${SESSION_PREFIX}${projectPath}:${sessionId}`;
}

function parseSessionKey(key: string): { projectPath: string; sessionId: string } | null {
  if (!key.startsWith(SESSION_PREFIX)) return null;
  const rest = key.slice(SESSION_PREFIX.length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon === -1) {
    return { projectPath: rest, sessionId: "default" };
  }
  return {
    projectPath: rest.slice(0, lastColon),
    sessionId: rest.slice(lastColon + 1),
  };
}

function enrichSession(s: SessionInfo): Record<string, unknown> {
  const parsed = parseSessionKey(s.sessionKey);
  return {
    id: parsed?.sessionId ?? s.sessionId ?? "default",
    sessionKey: s.sessionKey,
    projectPath: parsed?.projectPath ?? "",
    title: s.title ?? s.metadata?.title ?? undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messageCount ?? 0,
    tokenUsage: s.tokenUsage ?? { input: 0, output: 0, total: 0, context: 0 },
  };
}

router.get("/", async (req, res) => {
  try {
    const projectPath = req.query.project as string;
    if (!projectPath) {
      return res.status(400).json({ error: "project query param required" });
    }

    const gateway = getGateway();
    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    const all = await gateway.listSessions();
    const prefix = `${SESSION_PREFIX}${projectPath}`;
    const filtered = all.filter(
      (s) => s.sessionKey === prefix || s.sessionKey.startsWith(prefix + ":"),
    );

    const sessions = filtered.map(enrichSession);
    sessions.sort((a, b) => ((b.updatedAt as number) ?? 0) - ((a.updatedAt as number) ?? 0));

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { projectPath, title } = req.body;
    if (!projectPath) {
      return res.status(400).json({ error: "projectPath required" });
    }

    const sessionId = randomUUID().slice(0, 8);
    const sessionKey = buildSessionKey(projectPath, sessionId);
    const now = Date.now();

    res.json({
      id: sessionId,
      sessionKey,
      projectPath,
      title: title || null,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      tokenUsage: { input: 0, output: 0, total: 0, context: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = req.query.project as string;
    if (!projectPath) {
      return res.status(400).json({ error: "project query param required" });
    }

    const gateway = getGateway();
    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    const sessionKey = buildSessionKey(projectPath, id);
    const info = await gateway.getSession(sessionKey);

    if (!info) {
      // Also try the legacy key format (no sessionId suffix)
      const legacyKey = `${SESSION_PREFIX}${projectPath}`;
      const legacyInfo = await gateway.getSession(legacyKey);
      if (legacyInfo) {
        return res.json(enrichSession(legacyInfo));
      }
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(enrichSession(info));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, projectPath } = req.body;
    if (!projectPath) {
      return res.status(400).json({ error: "projectPath required" });
    }

    // Title is stored client-side; we just acknowledge the rename
    res.json({ id, title, updated: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = req.query.project as string;
    if (!projectPath) {
      return res.status(400).json({ error: "project query param required" });
    }

    const gateway = getGateway();
    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    const sessionKey = buildSessionKey(projectPath, id);
    const ok = await gateway.deleteSession(sessionKey);
    res.json({ deleted: ok });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:id/reset", async (req, res) => {
  try {
    const { id } = req.params;
    const { projectPath } = req.body;
    if (!projectPath) {
      return res.status(400).json({ error: "projectPath required" });
    }

    const gateway = getGateway();
    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    const sessionKey = buildSessionKey(projectPath, id);
    const ok = await gateway.resetSession(sessionKey);
    res.json({ reset: ok });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
