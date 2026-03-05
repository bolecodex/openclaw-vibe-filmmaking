import { Router } from "express";
import { execSync } from "child_process";

const XSKILL_API_PATH =
  "/Users/m007/codes/long_video_skills/skills-openclaw/mcp-proxy/xskill_api.py";

const router = Router();

router.get("/gateway/health", async (_req, res) => {
  try {
    const { checkGatewayHealth } = await import(
      "../services/openclaw-client.js"
    );
    const ok = await checkGatewayHealth();
    res.json({ ok });
  } catch {
    res.json({ ok: false });
  }
});

router.get("/account/balance", (_req, res) => {
  try {
    const raw = execSync(`python3 ${XSKILL_API_PATH} account`, {
      timeout: 10000,
      encoding: "utf-8",
    });
    const data = JSON.parse(raw);
    res.json({
      balance: data.balance ?? null,
      balance_yuan: data.balance_yuan ?? null,
    });
  } catch {
    res.json({ balance: null, balance_yuan: null });
  }
});

export default router;
