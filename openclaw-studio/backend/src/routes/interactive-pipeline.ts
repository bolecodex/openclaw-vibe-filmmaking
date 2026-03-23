import { Router, type Request, type Response } from "express";
import { existsSync } from "fs";
import { join } from "path";
import { analyzeNovel } from "../services/novel-analyzer.js";
import { selectOptimalPipeline, estimateTimeAndCost } from "../services/skill-selector.js";
import { executeWithFeedback } from "../services/interactive-pipeline.js";
import { checkStepQuality } from "../services/quality-checker.js";
import { autoFix, fixQualityIssues } from "../services/auto-fixer.js";
import { ProgressTracker } from "../services/progress-tracker.js";
import { getWorkspaceDir } from "../services/workspace.js";
import { createClassicalScriptAdapter, createBatchImageGenerator } from "../services/skill-adapter.js";

const router = Router();

router.post("/analyze", (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: `File not found: ${filePath}` });
    }

    const analysis = analyzeNovel(filePath);
    const pipeline = selectOptimalPipeline(analysis);
    const estimate = estimateTimeAndCost(pipeline);

    res.json({
      analysis,
      pipeline,
      estimate,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/start", async (req: Request, res: Response) => {
  try {
    const { projectName, novelFilePath, pipelineConfig: pipelineConfigStr, autoFix: autoFixStr } = req.query;
    
    if (!projectName || !novelFilePath || !pipelineConfigStr) {
      return res.status(400).json({ error: "projectName, novelFilePath, and pipelineConfig are required" });
    }

    const pipelineConfig = JSON.parse(pipelineConfigStr as string);
    const autoFixEnabled = autoFixStr === "true";

    if (!existsSync(novelFilePath as string)) {
      return res.status(404).json({ error: `Novel file not found: ${novelFilePath}` });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const writeSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    executeWithFeedback(projectName, novelFilePath as string, pipelineConfig, {
      onProgress: (message, progress) => {
        writeSSE("progress", { message, progress });
      },
      onStepStart: (step) => {
        writeSSE("step_start", { step });
      },
      onStepComplete: (result) => {
        writeSSE("step_complete", { result });
      },
    })
      .then((finalResult) => {
        writeSSE("done", finalResult);
        res.end();
      })
      .catch((err) => {
        writeSSE("error", { error: (err as Error).message });
        res.end();
      });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
});

router.get("/progress/:project", (req: Request, res: Response) => {
  try {
    const { project } = req.params;
    const projectDir = join(getWorkspaceDir(), project);

    if (!existsSync(projectDir)) {
      return res.status(404).json({ error: `Project not found: ${project}` });
    }

    const pipelineConfig = req.query.pipelineConfig
      ? (JSON.parse(req.query.pipelineConfig as string) as Parameters<typeof ProgressTracker>[1])
      : null;

    if (!pipelineConfig) {
      return res.status(400).json({ error: "pipelineConfig query parameter is required" });
    }

    const tracker = new ProgressTracker(project, pipelineConfig);
    const progress = tracker.getProgress();

    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/fix", async (req: Request, res: Response) => {
  try {
    const { projectName, stepId, issue } = req.body;

    if (!projectName || !stepId) {
      return res.status(400).json({ error: "projectName and stepId are required" });
    }

    const projectDir = join(getWorkspaceDir(), projectName);
    if (!existsSync(projectDir)) {
      return res.status(404).json({ error: `Project not found: ${projectName}` });
    }

    if (issue) {
      const fixResult = await autoFix(issue, projectDir);
      return res.json(fixResult);
    }

    const quality = await checkStepQuality(stepId, projectDir);
    const fixResult = await fixQualityIssues(quality, projectDir);

    res.json(fixResult);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/skip", (req: Request, res: Response) => {
  try {
    const { projectName, stepId } = req.body;

    if (!projectName || !stepId) {
      return res.status(400).json({ error: "projectName and stepId are required" });
    }

    res.json({
      success: true,
      message: `Step ${stepId} skipped`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/adapt-skill", (req: Request, res: Response) => {
  try {
    const { adaptation, variantName } = req.body;

    if (!adaptation || !adaptation.baseSkill) {
      return res.status(400).json({ error: "adaptation with baseSkill is required" });
    }

    let variantId: string;
    if (adaptation.baseSkill === "novel-02-script-to-scenes" && adaptation.adaptations?.style === "classical") {
      variantId = createClassicalScriptAdapter();
    } else if (adaptation.baseSkill === "novel-04-shots-to-images") {
      variantId = createBatchImageGenerator();
    } else {
      variantId = createClassicalScriptAdapter();
    }

    res.json({
      success: true,
      variantId,
      message: `Skill variant created: ${variantId}`,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
