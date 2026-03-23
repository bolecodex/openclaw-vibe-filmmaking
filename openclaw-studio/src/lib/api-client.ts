const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) {
      const text = await res.text();
      let errorMessage = `HTTP ${res.status}`;
      if (text) {
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || text;
        } catch {
          errorMessage = text;
        }
      }
      const error = new Error(errorMessage);
      (error as any).status = res.status;
      throw error;
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("无法连接到后端服务，请确认后端在 localhost:3001 运行");
    }
    throw err;
  }
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),

  workspace: {
    getRoot: () => request<{ path: string }>("/workspace/root"),
    listDirs: (path?: string) =>
      request<import("./types").DirListing>(
        `/workspace/list-dirs${path ? `?path=${encodeURIComponent(path)}` : ""}`,
      ),
    setRoot: (path: string, create?: boolean) =>
      request<{ path: string }>("/workspace/root", {
        method: "POST",
        body: JSON.stringify({ path, create }),
      }),
    projects: () =>
      request<import("./types").ProjectInfo[]>("/workspace/projects"),
    createProject: (name: string) =>
      request<import("./types").ProjectInfo>("/workspace/project", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    deleteProject: (name: string) =>
      request<{ ok: boolean }>(
        `/workspace/project?name=${encodeURIComponent(name)}`,
        { method: "DELETE" },
      ),
    tree: (root?: string, recursive = false) =>
      request<import("./types").FileEntry[]>(
        `/workspace/tree?root=${encodeURIComponent(root || "")}&recursive=${recursive}`,
      ),
    readFile: (path: string) =>
      request<{ content: string; parsed?: unknown; mtime: string }>(
        `/workspace/file?path=${encodeURIComponent(path)}`,
      ),
    writeFile: (path: string, content: string) =>
      request<{ ok: boolean }>(
        `/workspace/file?path=${encodeURIComponent(path)}`,
        { method: "PUT", body: JSON.stringify({ content }) },
      ),
    characters: (project: string) =>
      request<import("./types").Character[]>(
        `/workspace/characters?project=${encodeURIComponent(project)}`,
      ),
    scenes: (project: string) =>
      request<{
        meta: unknown;
        scenes: import("./types").SceneInfo[];
      }>(`/workspace/scenes?project=${encodeURIComponent(project)}`),
    shots: (project: string, sceneId?: string) =>
      request<{
        manifest: unknown;
        scenes: import("./types").SceneShots[];
      }>(
        `/workspace/shots?project=${encodeURIComponent(project)}${sceneId ? `&sceneId=${encodeURIComponent(sceneId)}` : ""}`,
      ),
    props: (project: string) =>
      request<import("./types").PropItem[]>(
        `/workspace/props?project=${encodeURIComponent(project)}`,
      ),
    media: (project: string, type: "images" | "audio" | "video") =>
      request<import("./types").MediaFile[]>(
        `/workspace/media?project=${encodeURIComponent(project)}&type=${type}`,
      ),
    style: (project: string) =>
      request<import("./types").StyleConfig>(
        `/workspace/style?project=${encodeURIComponent(project)}`,
      ),
    updateStyle: (project: string, data: Partial<import("./types").StyleConfig>) =>
      request<{ ok: boolean }>(
        `/workspace/style?project=${encodeURIComponent(project)}`,
        { method: "PUT", body: JSON.stringify(data) },
      ),
    updateCharacter: (project: string, id: string, data: Record<string, unknown>) =>
      request<{ ok: boolean }>(
        `/workspace/character?project=${encodeURIComponent(project)}&id=${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(data) },
      ),
    updateScene: (project: string, id: string, data: Record<string, unknown>) =>
      request<{ ok: boolean }>(
        `/workspace/scene?project=${encodeURIComponent(project)}&id=${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(data) },
      ),
    updateShot: (project: string, file: string, id: string, data: Record<string, unknown>) =>
      request<{ ok: boolean }>(
        `/workspace/shot?project=${encodeURIComponent(project)}&file=${encodeURIComponent(file)}&id=${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(data) },
      ),
    updateProp: (project: string, id: string, data: Record<string, unknown>) =>
      request<{ ok: boolean }>(
        `/workspace/prop?project=${encodeURIComponent(project)}&id=${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(data) },
      ),
    sourceFiles: (project: string) =>
      request<import("./types").SourceFile[]>(
        `/workspace/source-files?project=${encodeURIComponent(project)}`,
      ),
    downloadAsset: (url: string, destPath: string) =>
      request<{ url: string; localPath: string; skipped: boolean }>(
        "/workspace/download-asset",
        { method: "POST", body: JSON.stringify({ url, destPath }) },
      ),
    downloadAssets: (project: string) =>
      request<{
        downloaded: Array<{ url: string; localPath: string; skipped: boolean }>;
        failed: Array<{ url: string; error: string }>;
        skipped: number;
      }>(`/workspace/download-assets?project=${encodeURIComponent(project)}`, {
        method: "POST",
      }),
    uploadNovel: async (
      project: string,
      files: FileList | File[],
      folderName?: string,
    ): Promise<import("./types").UploadResult> => {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const qs = new URLSearchParams({ project });
      if (folderName) qs.set("folder", folderName);
      const res = await fetch(`/api/workspace/upload-novel?${qs}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
  },

  skills: {
    list: () => request<import("./types").Skill[]>("/skills"),
    get: (name: string) => request<import("./types").Skill>(`/skills/${name}`),
    listFiles: (name: string) =>
      request<{ entries: Array<{ path: string; type: "file" | "dir" }>; skillRoot?: string }>(
        `/skills/${encodeURIComponent(name)}/files`,
      ),
    create: (data: { name: string; content: string }) =>
      request<import("./types").Skill>("/skills", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (name: string, data: { content: string }) =>
      request<import("./types").Skill>(`/skills/${name}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (name: string) =>
      request<void>(`/skills/${name}`, { method: "DELETE" }),
    updateConfig: (
      name: string,
      data: { enabled?: boolean; env?: Record<string, string> },
    ) =>
      request(`/skills/${name}/config`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    install: (data: { source: string; slug?: string; url?: string }) =>
      request("/skills/install", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    reset: (name: string) =>
      request<import("./types").Skill>(`/skills/${name}/reset`, { method: "POST" }),
    publish: (name: string) =>
      request(`/skills/${name}/publish`, { method: "POST" }),
    marketplaceSearch: (query: string) =>
      request<import("./types").MarketplaceSkill[]>(
        `/skills/marketplace/search?query=${encodeURIComponent(query)}`,
      ),
  },

  render: {
    history: (project: string) =>
      request<{
        videos: Array<{
          name: string;
          path: string;
          size: number;
          mtime: string;
          duration: number | null;
        }>;
      }>(`/render/history?project=${encodeURIComponent(project)}`),
  },

  pipeline: {
    state: (project: string) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}`),
    run: (project: string, data: { stepId: string; action: string; params?: Record<string, unknown>; selectedIds?: string[] }) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/run`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    reset: (project: string, stepId: string) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/reset`, {
        method: "POST",
        body: JSON.stringify({ stepId }),
      }),
    getReview: (project: string, stepId: string) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/review/${encodeURIComponent(stepId)}`),
    submitReview: (project: string, stepId: string, data: { action: string; notes?: string; checklist?: Record<string, boolean> }) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/review/${encodeURIComponent(stepId)}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getConfig: (project: string) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/config`),
    updateConfig: (project: string, data: Record<string, unknown>) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/config`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    runTest: (project: string) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/test`, { method: "POST" }),
    testReports: (project: string) =>
      request<any[]>(`/pipeline/${encodeURIComponent(project)}/test/reports`),
    testReport: (project: string, reportId: string) =>
      request<any>(`/pipeline/${encodeURIComponent(project)}/test/report/${encodeURIComponent(reportId)}`),
  },

  usage: {
    get: (project: string) =>
      request<{
        totalInput: number;
        totalOutput: number;
        estimatedCostRmb: number;
        pricingDocUrl: string;
        bySession: Array<{
          sessionId: string;
          title?: string;
          tokenUsage: { input: number; output: number; total: number; context: number };
          estimatedCostRmb: number;
        }>;
      }>(`/usage?project=${encodeURIComponent(project)}`),
    pricing: () =>
      request<{
        inputPerMillionRmb: number;
        outputPerMillionRmb: number;
        pricingDocUrl: string;
      }>("/usage/pricing"),
  },

  gateway: {
    health: () => request<{ ok: boolean }>("/gateway/health"),
    balance: () =>
      request<{ balance: number; balance_yuan: number }>("/account/balance"),
  },

  batch: {
    createJob: (data: { name: string; inputFolder: string }) =>
      request<BatchJobSummary>("/batch/jobs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listJobs: (limit?: number) =>
      request<{ jobs: BatchJobSummary[] }>(
        `/batch/jobs${limit != null ? `?limit=${limit}` : ""}`,
      ),
    getJob: (jobId: string) =>
      request<BatchJobSummary>(`/batch/jobs/${encodeURIComponent(jobId)}`),
    getTasks: (jobId: string, opts?: { status?: string; limit?: number; offset?: number }) => {
      const params = new URLSearchParams();
      if (opts?.status) params.set("status", opts.status);
      if (opts?.limit != null) params.set("limit", String(opts.limit));
      if (opts?.offset != null) params.set("offset", String(opts.offset));
      const qs = params.toString();
      return request<{ tasks: BatchTask[] }>(
        `/batch/jobs/${encodeURIComponent(jobId)}/tasks${qs ? `?${qs}` : ""}`,
      );
    },
    startJob: (jobId: string) =>
      request<{ ok: boolean; enqueued: number }>(
        `/batch/jobs/${encodeURIComponent(jobId)}/start`,
        { method: "POST" },
      ),
    pauseJob: (jobId: string) =>
      request<BatchJobSummary>(
        `/batch/jobs/${encodeURIComponent(jobId)}/pause`,
        { method: "POST" },
      ),
    resumeJob: (jobId: string) =>
      request<BatchJobSummary>(
        `/batch/jobs/${encodeURIComponent(jobId)}/resume`,
        { method: "POST" },
      ),
    getTaskContent: (taskId: string) =>
      request<BatchTaskContent>(`/batch/tasks/${encodeURIComponent(taskId)}/content`),
    exportJob: (jobId: string, scope?: "videos" | "full") =>
      request<{ jobId: string; status: string }>(
        `/batch/jobs/${encodeURIComponent(jobId)}/export`,
        { method: "POST", body: JSON.stringify({ scope: scope ?? "full" }) },
      ),
    exportStatus: (jobId: string) =>
      request<{ jobId: string; status: string; path?: string; error?: string }>(
        `/batch/jobs/${encodeURIComponent(jobId)}/export/status`,
      ),
    regenerateTaskStep: (taskId: string, stepId: string) =>
      request<{ ok: boolean; stepId: string }>(
        `/batch/tasks/${encodeURIComponent(taskId)}/regenerate`,
        { method: "POST", body: JSON.stringify({ stepId }) },
      ),
  },

  interactive: {
    analyze: (filePath: string) =>
      request<{
        analysis: {
          totalLines: number;
          totalChars: number;
          chapters: number;
          estimatedScenes: number;
          characterCount: number;
          dialogueDensity: number;
          complexity: "simple" | "medium" | "complex";
          recommendedPipeline: string[];
          estimatedTime: number;
          estimatedCost: number;
          fileName: string;
        };
        pipeline: {
          steps: Array<{
            id: string;
            name: string;
            skill: string | null;
            order: number;
            estimatedTime: number;
            estimatedCost: number;
          }>;
          estimatedTime: number;
          estimatedCost: number;
        };
        estimate: {
          totalTime: number;
          totalCost: number;
          breakdown: Array<{ step: string; time: number; cost: number }>;
        };
      }>("/interactive/analyze", {
        method: "POST",
        body: JSON.stringify({ filePath }),
      }),
    start: (projectName: string, novelFilePath: string, pipelineConfig: unknown, autoFix = true) => {
      const params = new URLSearchParams({
        projectName,
        novelFilePath,
        pipelineConfig: JSON.stringify(pipelineConfig),
        autoFix: String(autoFix),
      });
      return new EventSource(`/api/interactive/start?${params.toString()}`);
    },
    progress: (project: string, pipelineConfig: unknown) =>
      request<{
        progress: number;
        currentStep: string | null;
        completedSteps: string[];
        totalSteps: number;
        estimatedRemainingTime: number;
        elapsedTime: number;
        estimatedTotalCost: number;
        actualCost: number;
      }>(
        `/interactive/progress/${encodeURIComponent(project)}?pipelineConfig=${encodeURIComponent(JSON.stringify(pipelineConfig))}`,
      ),
    fix: (projectName: string, stepId: string, issue?: unknown) =>
      request<{
        success: boolean;
        fixedIssues: string[];
        failedIssues: string[];
        message: string;
      }>("/interactive/fix", {
        method: "POST",
        body: JSON.stringify({ projectName, stepId, issue }),
      }),
    skip: (projectName: string, stepId: string) =>
      request<{ success: boolean; message: string }>("/interactive/skip", {
        method: "POST",
        body: JSON.stringify({ projectName, stepId }),
      }),
    adaptSkill: (adaptation: { baseSkill: string; adaptations: unknown }, variantName?: string) =>
      request<{ success: boolean; variantId: string; message: string }>("/interactive/adapt-skill", {
        method: "POST",
        body: JSON.stringify({ adaptation, variantName }),
      }),
  },
};

export interface BatchJobSummary {
  id: string;
  name: string;
  status: string;
  inputFolder: string;
  workspacePath: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  runningTasks: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BatchTask {
  id: string;
  jobId: string;
  projectName: string;
  novelFile: string;
  status: string;
  currentStepId: string | null;
  errorMessage: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BatchTaskContent {
  projectName: string;
  projectPath: string;
  novelFile: string;
  status: string;
  progress: number;
  currentStepId: string | null;
  scenes: unknown[];
  shots: unknown[];
  characters: unknown[];
  sourceFiles: unknown[];
}
