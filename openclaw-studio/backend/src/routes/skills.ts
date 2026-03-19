import { Router } from "express";
import * as sm from "../services/skills-manager.js";

const router = Router();

router.get("/", (_req, res) => {
  try {
    const skills = sm.scanSkills();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/marketplace/search", (req, res) => {
  try {
    const query = req.query.query as string ?? "";
    const results = sm.searchMarketplace(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:name/files", (req, res) => {
  try {
    const entries = sm.listSkillFileEntries(req.params.name);
    if (!entries) return res.status(404).json({ error: "Not found" });
    res.json({ entries, skillRoot: sm.getSkill(req.params.name)?.path });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:name", (req, res) => {
  try {
    const skill = sm.getSkill(req.params.name);
    if (!skill) return res.status(404).json({ error: "Not found" });
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/", (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: "name and content required" });
    const skill = sm.createSkill(name, content);
    res.status(201).json(skill);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/:name", (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "content required" });
    const skill = sm.updateSkill(req.params.name, content);
    if (!skill) return res.status(404).json({ error: "Not found" });
    res.json(skill);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/:name", (req, res) => {
  try {
    const ok = sm.deleteSkill(req.params.name);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg.includes("不可删除") ? 403 : 500;
    res.status(status).json({ error: msg });
  }
});

router.patch("/:name/config", (req, res) => {
  try {
    sm.updateConfig(req.params.name, req.body);
    const skill = sm.getSkill(req.params.name);
    res.json(skill ?? { ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:name/reset", (req, res) => {
  try {
    const ok = sm.resetSkill(req.params.name);
    if (!ok) return res.status(404).json({ error: "Not a bundled skill" });
    res.json(sm.getSkill(req.params.name));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/:name/publish", (req, res) => {
  try {
    sm.publishSkill(req.params.name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/install", (req, res) => {
  try {
    const { source, slug, url } = req.body;
    if (source === "clawhub" && slug) {
      sm.installFromClawHub(slug);
    } else if (source === "github" && url) {
      sm.installFromGithub(url);
    } else {
      return res.status(400).json({ error: "source+slug or source+url required" });
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
