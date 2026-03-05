import { spawn } from "child_process";

export async function chatWithGateway(
  message: string,
  context?: { projectDir?: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["agent", "--agent", "main", "--message", message, "--json"];

    const proc = spawn("openclaw", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
      cwd: context?.projectDir || undefined,
    });

    let stdout = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        resolve("请求超时");
      }
    }, 120000);

    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });

    proc.on("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        const data = JSON.parse(stdout);
        const payloads = data.result?.payloads ?? [];
        const text = payloads.map((p: any) => p.text).join("\n");
        resolve(text || "无响应");
      } catch {
        resolve(stdout.trim() || "无响应");
      }
    });
    proc.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function* chatStream(
  message: string,
  context?: { projectDir?: string },
): AsyncGenerator<string> {
  const full = await chatWithGateway(message, context);
  const chunkSize = 20;
  for (let i = 0; i < full.length; i += chunkSize) {
    yield full.slice(i, i + chunkSize);
  }
}

export async function checkGatewayHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("openclaw", ["gateway", "status"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.on("close", (code) => {
      resolve(code === 0 && stdout.includes("loaded"));
    });
    proc.on("error", () => resolve(false));
    setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 5000);
  });
}
