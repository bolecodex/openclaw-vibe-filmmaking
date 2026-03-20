import { Router } from "express";
import { getGateway } from "../services/gateway-client.js";
import {
  estimateCostRmb,
  getDefaultPricing,
  VOLC_PRICING_DOC,
  type ModelPricing,
} from "../services/volc-pricing.js";
import type { TokenUsage } from "../services/gateway-client.js";

const router = Router();
const SESSION_PREFIX = "studio:";

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

/**
 * GET /api/usage?project=:project
 * 汇总该项目的会话 token 用量与预估费用
 */
router.get("/", async (req, res) => {
  try {
    const project = req.query.project as string;
    if (!project) {
      return res.status(400).json({ error: "project query param required" });
    }

    const gateway = getGateway();
    if (!gateway.isConnected) {
      return res.status(502).json({ error: "Gateway not connected" });
    }

    const all = await gateway.listSessions();
    const prefix = `${SESSION_PREFIX}${project}`;
    const filtered = all.filter(
      (s) => s.sessionKey === prefix || s.sessionKey.startsWith(prefix + ":")
    );

    let totalInput = 0;
    let totalOutput = 0;
    const bySession: Array<{
      sessionId: string;
      title?: string;
      tokenUsage: TokenUsage;
      estimatedCostRmb: number;
    }> = [];

    for (const s of filtered) {
      const parsed = parseSessionKey(s.sessionKey);
      const sessionId = parsed?.sessionId ?? s.sessionId ?? "default";
      const usage: TokenUsage = s.tokenUsage ?? {
        input: 0,
        output: 0,
        total: 0,
        context: 0,
      };
      const cost = estimateCostRmb(usage.input, usage.output);
      totalInput += usage.input;
      totalOutput += usage.output;
      bySession.push({
        sessionId,
        title: s.title ?? (s.metadata?.title as string) ?? undefined,
        tokenUsage: usage,
        estimatedCostRmb: cost,
      });
    }

    const estimatedCostRmb = estimateCostRmb(totalInput, totalOutput);

    res.json({
      totalInput,
      totalOutput,
      estimatedCostRmb,
      pricingDocUrl: VOLC_PRICING_DOC,
      bySession: bySession.sort(
        (a, b) =>
          ((b.tokenUsage.input + b.tokenUsage.output) || 0) -
          ((a.tokenUsage.input + a.tokenUsage.output) || 0)
      ),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/usage/pricing
 * 返回默认模型单价，供前端 TokenBadge 等计算预估费用
 */
router.get("/pricing", (_req, res) => {
  const pricing: ModelPricing = getDefaultPricing();
  res.json({
    ...pricing,
    pricingDocUrl: VOLC_PRICING_DOC,
  });
});

export default router;
