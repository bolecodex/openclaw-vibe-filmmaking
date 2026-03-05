import WebSocket from "ws";
import { randomUUID, createPrivateKey, createPublicKey, sign } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// --- Types ---

export interface UiAction {
  action: string;
  target: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  context: number;
}

export interface SessionInfo {
  sessionKey: string;
  sessionId?: string;
  updatedAt?: number;
  createdAt?: number;
  messageCount?: number;
  tokenUsage?: TokenUsage;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface StreamEvent {
  type:
    | "text"
    | "thinking"
    | "tool_start"
    | "tool_update"
    | "tool_output"
    | "lifecycle"
    | "done"
    | "error"
    | "ui_action"
    | "usage";
  content?: string;
  delta?: string;
  toolCall?: {
    id: string;
    title: string;
    status: string;
    input?: string;
    output?: string;
  };
  phase?: string;
  error?: string;
  uiAction?: UiAction;
  usage?: TokenUsage;
}

const UI_ACTION_RE = /\[UI:(\w+)(?::([^\]]*))?\]/g;

export function extractUiActions(text: string): {
  cleanText: string;
  uiActions: UiAction[];
} {
  const uiActions: UiAction[] = [];
  const cleanText = text.replace(UI_ACTION_RE, (_, action, target) => {
    uiActions.push({ action, target: target || "" });
    return "";
  });
  return { cleanText, uiActions };
}

interface GatewayConfig {
  port: number;
  auth: { mode: string; token: string };
}

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  expectFinal: boolean;
}

type EventListener = (runId: string, event: StreamEvent) => void;

// --- Gateway protocol frame types ---

interface RequestFrame {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
}

interface ResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { message: string; code?: number };
}

interface EventFrame {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
  seq?: number;
}

type GatewayFrame = RequestFrame | ResponseFrame | EventFrame;

// --- Config / Identity loaders ---

function loadGatewayConfig(): GatewayConfig {
  const configPath = join(homedir(), ".openclaw", "openclaw.json");
  if (!existsSync(configPath)) {
    throw new Error(`OpenClaw config not found at ${configPath}`);
  }
  const raw = JSON.parse(readFileSync(configPath, "utf-8"));
  return {
    port: raw.gateway?.port ?? 18789,
    auth: {
      mode: raw.gateway?.auth?.mode ?? "token",
      token: raw.gateway?.auth?.token ?? "",
    },
  };
}

function loadDeviceIdentity(): DeviceIdentity | null {
  const identityPath = join(homedir(), ".openclaw", "identity", "device.json");
  if (!existsSync(identityPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(identityPath, "utf-8"));
    if (raw.deviceId && raw.publicKeyPem && raw.privateKeyPem) {
      return {
        deviceId: raw.deviceId,
        publicKeyPem: raw.publicKeyPem,
        privateKeyPem: raw.privateKeyPem,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const spki = createPublicKey(publicKeyPem).export({
    type: "spki",
    format: "der",
  });
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function publicKeyRawBase64Url(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

function signPayload(privateKeyPem: string, payload: string): string {
  const key = createPrivateKey(privateKeyPem);
  const sig = sign(null, Buffer.from(payload, "utf8"), key);
  return base64UrlEncode(sig);
}

function buildDeviceAuthPayload(opts: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce?: string;
}): string {
  const version = opts.nonce ? "v2" : "v1";
  const base = [
    version,
    opts.deviceId,
    opts.clientId,
    opts.clientMode,
    opts.role,
    opts.scopes.join(","),
    String(opts.signedAtMs),
    opts.token ?? "",
  ];
  if (version === "v2") base.push(opts.nonce ?? "");
  return base.join("|");
}

// --- Session helpers ---

function normalizeSessionInfo(raw: unknown): SessionInfo {
  const r = raw as Record<string, unknown>;
  const usage = r.tokenUsage as Record<string, number> | undefined;
  return {
    sessionKey: (r.sessionKey as string) ?? (r.key as string) ?? "",
    sessionId: (r.sessionId as string) ?? undefined,
    updatedAt: (r.updatedAt as number) ?? undefined,
    createdAt: (r.createdAt as number) ?? undefined,
    messageCount: (r.messageCount as number) ?? (r.turns as number) ?? undefined,
    tokenUsage: usage
      ? {
          input: usage.inputTokens ?? usage.input ?? 0,
          output: usage.outputTokens ?? usage.output ?? 0,
          total: usage.totalTokens ?? usage.total ?? 0,
          context: usage.contextTokens ?? usage.context ?? 0,
        }
      : undefined,
    title: (r.title as string) ?? undefined,
    metadata: (r.metadata as Record<string, unknown>) ?? undefined,
  };
}

// --- OpenClaw Gateway WebSocket Client ---

const PROTOCOL_VERSION = 3;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const CONNECT_DELAY_MS = 750;
const TICK_TIMEOUT_MULTIPLIER = 2;

export class OpenClawGateway {
  private ws: WebSocket | null = null;
  private config: GatewayConfig;
  private device: DeviceIdentity | null;
  private pending = new Map<string, PendingRequest>();
  private eventListeners = new Map<string, EventListener>();
  private closed = false;
  private connected = false;
  private connectSent = false;
  private connectNonce: string | null = null;
  private backoffMs = RECONNECT_BASE_MS;
  private tickIntervalMs = 30000;
  private lastTick: number | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private instanceId = randomUUID();

  constructor() {
    this.config = loadGatewayConfig();
    this.device = loadDeviceIdentity();
    if (!this.device) {
      console.warn(
        "[gateway-client] no device identity found at ~/.openclaw/identity/device.json, scopes will be limited",
      );
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  start(): void {
    if (this.closed) return;
    const url = `ws://127.0.0.1:${this.config.port}`;

    this.ws = new WebSocket(url, { maxPayload: 25 * 1024 * 1024 });

    this.ws.on("open", () => {
      this.queueConnect();
    });

    this.ws.on("message", (data) => {
      const raw =
        typeof data === "string" ? data : Buffer.from(data as Buffer).toString();
      this.handleMessage(raw);
    });

    this.ws.on("close", (_code, _reason) => {
      this.ws = null;
      this.connected = false;
      this.connectSent = false;
      this.flushPendingErrors(new Error("gateway connection closed"));
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error("[gateway-client] ws error:", err.message);
    });
  }

  stop(): void {
    this.closed = true;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.flushPendingErrors(new Error("gateway client stopped"));
  }

  async *promptStream(
    message: string,
    opts?: {
      agentId?: string;
      sessionKey?: string;
      extraSystemPrompt?: string;
      timeout?: number;
    },
  ): AsyncGenerator<StreamEvent> {
    if (!this.connected) {
      yield { type: "error", error: "Gateway not connected" };
      return;
    }

    const idempotencyKey = randomUUID();
    const runId = idempotencyKey;

    const eventQueue: StreamEvent[] = [];
    let resolveWait: (() => void) | null = null;
    let done = false;

    const listenerId = randomUUID();
    this.eventListeners.set(listenerId, (_evtRunId, event) => {
      if (_evtRunId !== runId) return;
      eventQueue.push(event);
      resolveWait?.();
    });

    const requestPromise = this.request(
      "agent",
      {
        message,
        agentId: opts?.agentId ?? "main",
        sessionKey: opts?.sessionKey,
        idempotencyKey,
        extraSystemPrompt: opts?.extraSystemPrompt,
        timeout: opts?.timeout,
      },
      { expectFinal: true },
    );

    requestPromise
      .then(() => {
        done = true;
        eventQueue.push({ type: "done" });
        resolveWait?.();
      })
      .catch((err) => {
        done = true;
        eventQueue.push({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
        resolveWait?.();
      })
      .finally(() => {
        this.eventListeners.delete(listenerId);
      });

    try {
      while (true) {
        if (eventQueue.length > 0) {
          const event = eventQueue.shift()!;
          yield event;
          if (event.type === "done" || event.type === "error") return;
          continue;
        }

        if (done) return;

        await new Promise<void>((r) => {
          resolveWait = r;
        });
        resolveWait = null;
      }
    } finally {
      this.eventListeners.delete(listenerId);
    }
  }

  // --- Session management ---

  async listSessions(): Promise<SessionInfo[]> {
    if (!this.connected) return [];
    try {
      const result = await this.request("sessions.list", {});
      const entries = (result as Record<string, unknown>)?.sessions ?? result;
      if (!Array.isArray(entries)) return [];
      return entries.map(normalizeSessionInfo);
    } catch (err) {
      console.error("[gateway-client] sessions.list failed:", (err as Error).message);
      return [];
    }
  }

  async getSession(sessionKey: string): Promise<SessionInfo | null> {
    if (!this.connected) return null;
    try {
      const result = await this.request("sessions.get", { sessionKey });
      if (!result) return null;
      return normalizeSessionInfo(result);
    } catch (err) {
      console.error("[gateway-client] sessions.get failed:", (err as Error).message);
      return null;
    }
  }

  async deleteSession(sessionKey: string): Promise<boolean> {
    if (!this.connected) return false;
    try {
      await this.request("sessions.delete", { sessionKey });
      return true;
    } catch (err) {
      console.error("[gateway-client] sessions.delete failed:", (err as Error).message);
      return false;
    }
  }

  async resetSession(sessionKey: string): Promise<boolean> {
    if (!this.connected) return false;
    try {
      await this.request("sessions.reset", { sessionKey });
      return true;
    } catch (err) {
      console.error("[gateway-client] sessions.reset failed:", (err as Error).message);
      return false;
    }
  }

  // --- Internal protocol ---

  private queueConnect(): void {
    this.connectNonce = null;
    this.connectSent = false;
    setTimeout(() => this.sendConnect(), CONNECT_DELAY_MS);
  }

  private sendConnect(): void {
    if (this.connectSent) return;
    this.connectSent = true;

    const clientId = "gateway-client";
    const clientMode = "backend";
    const role = "operator";
    const scopes = [
      "operator.admin",
      "operator.read",
      "operator.write",
      "operator.approvals",
      "operator.pairing",
    ];
    const authToken = this.config.auth.token;
    const signedAtMs = Date.now();
    const nonce = this.connectNonce ?? undefined;

    let devicePayload: Record<string, unknown> | undefined;
    if (this.device) {
      const payload = buildDeviceAuthPayload({
        deviceId: this.device.deviceId,
        clientId,
        clientMode,
        role,
        scopes,
        signedAtMs,
        token: authToken || null,
        nonce,
      });
      const signature = signPayload(this.device.privateKeyPem, payload);
      devicePayload = {
        id: this.device.deviceId,
        publicKey: publicKeyRawBase64Url(this.device.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      };
    }

    const params: Record<string, unknown> = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: clientId,
        version: "1.0.0",
        platform: process.platform,
        mode: clientMode,
        instanceId: this.instanceId,
      },
      caps: ["tool-events"],
      role,
      scopes,
      auth: { token: authToken },
    };

    if (devicePayload) {
      params.device = devicePayload;
    }

    this.request("connect", params)
      .then((helloOk: unknown) => {
        this.connected = true;
        this.backoffMs = RECONNECT_BASE_MS;
        const policy = (helloOk as Record<string, unknown>)?.policy as
          | Record<string, number>
          | undefined;
        if (policy?.tickIntervalMs)
          this.tickIntervalMs = policy.tickIntervalMs;
        this.lastTick = Date.now();
        this.startTickWatch();
        console.log("[gateway-client] connected to OpenClaw Gateway (device auth: %s)", this.device ? "yes" : "no");
      })
      .catch((err) => {
        console.error("[gateway-client] connect failed:", err.message);
        this.ws?.close(1008, "connect failed");
      });
  }

  private handleMessage(raw: string): void {
    let frame: GatewayFrame;
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }

    if (frame.type === "event") {
      const evt = frame as EventFrame;

      if (evt.event === "connect.challenge") {
        const nonce = (evt.payload as Record<string, unknown>)?.nonce;
        if (typeof nonce === "string") {
          this.connectNonce = nonce;
          this.connectSent = false;
          this.sendConnect();
        }
        return;
      }

      if (evt.event === "tick") {
        this.lastTick = Date.now();
        return;
      }

      this.dispatchAgentEvent(evt);
      return;
    }

    if (frame.type === "res") {
      const res = frame as ResponseFrame;
      const pending = this.pending.get(res.id);
      if (!pending) return;

      const status = (res.payload as Record<string, unknown>)?.status;
      if (pending.expectFinal && status === "accepted") return;

      this.pending.delete(res.id);
      if (res.ok) pending.resolve(res.payload);
      else
        pending.reject(
          new Error(res.error?.message ?? "unknown gateway error"),
        );
    }
  }

  private dispatchAgentEvent(evt: EventFrame): void {
    const payload = evt.payload as Record<string, unknown> | undefined;
    if (!payload) return;

    const runId = payload.runId as string | undefined;
    const stream = payload.stream as string | undefined;
    const data = payload.data as Record<string, unknown> | undefined;

    if (!runId || !stream) return;

    let event: StreamEvent | null = null;

    switch (stream) {
      case "assistant": {
        const delta = (data?.delta as string) ?? "";
        if (!delta) break;

        const { cleanText, uiActions } = extractUiActions(delta);

        for (const ua of uiActions) {
          const uiEvent: StreamEvent = { type: "ui_action", uiAction: ua };
          for (const listener of this.eventListeners.values()) {
            try { listener(runId, uiEvent); } catch {}
          }
        }

        if (cleanText) {
          event = { type: "text", delta: cleanText, content: cleanText };
        }
        break;
      }
      case "lifecycle": {
        const phase = data?.phase as string;
        if (phase === "start") {
          event = { type: "lifecycle", phase: "start" };
        } else if (phase === "end") {
          event = { type: "lifecycle", phase: "end" };
        } else if (phase === "error") {
          event = {
            type: "error",
            error: (data?.error as string) ?? "Agent error",
          };
        }
        break;
      }
      case "tool": {
        const phase = data?.phase as string;
        const toolName = (data?.name as string) ?? (data?.tool as string) ?? "tool";
        const toolId =
          (data?.id as string) ??
          (data?.toolCallId as string) ??
          (data?.callId as string) ??
          randomUUID();

        console.log("[gateway-client] tool event:", JSON.stringify(data));

        if (phase === "start" || phase === "invoke") {
          const inputRaw = data?.input ?? data?.args ?? data?.arguments;
          event = {
            type: "tool_start",
            toolCall: {
              id: toolId,
              title: toolName,
              status: "running",
              input: inputRaw
                ? typeof inputRaw === "string"
                  ? inputRaw
                  : JSON.stringify(inputRaw)
                : undefined,
            },
          };
        } else if (phase === "end" || phase === "result") {
          const output = data?.result ?? data?.output ?? data?.meta;
          event = {
            type: "tool_update",
            toolCall: {
              id: toolId,
              title: toolName,
              status: (data?.error || data?.isError) ? "failed" : "completed",
              output: output
                ? typeof output === "string"
                  ? output
                  : JSON.stringify(output)
                : undefined,
            },
          };
        } else if (phase === "update") {
          // Heartbeat / progress ping — no content, just acknowledge
        } else if (phase === "output" || phase === "stream" || phase === "chunk") {
          const chunk =
            (data?.text as string) ??
            (data?.delta as string) ??
            (data?.output as string) ??
            "";
          if (chunk) {
            event = {
              type: "tool_output",
              toolCall: { id: toolId, title: toolName, status: "running" },
              content: chunk,
            };
          }
        } else {
          console.warn("[gateway-client] unhandled tool phase:", phase, data);
        }
        break;
      }
      case "reasoning":
      case "thinking": {
        const text = (data?.delta as string) ?? (data?.text as string) ?? "";
        if (text) {
          event = { type: "thinking", content: text, delta: text };
        }
        break;
      }
    }

    if (event) {
      for (const listener of this.eventListeners.values()) {
        try {
          listener(runId, event);
        } catch {}
      }
    }
  }

  private async request(
    method: string,
    params: unknown,
    opts?: { expectFinal?: boolean },
  ): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }

    const id = randomUUID();
    const frame: RequestFrame = { type: "req", id, method, params };
    const expectFinal = opts?.expectFinal ?? false;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, expectFinal });
      this.ws!.send(JSON.stringify(frame));
    });
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, RECONNECT_MAX_MS);
    console.log(
      `[gateway-client] reconnecting in ${delay}ms...`,
    );
    setTimeout(() => this.start(), delay);
  }

  private startTickWatch(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => {
      if (this.closed || !this.lastTick) return;
      if (Date.now() - this.lastTick > this.tickIntervalMs * TICK_TIMEOUT_MULTIPLIER) {
        console.warn("[gateway-client] tick timeout, closing");
        this.ws?.close(4000, "tick timeout");
      }
    }, Math.max(this.tickIntervalMs, 1000));
  }

  private flushPendingErrors(err: Error): void {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }
}

// Singleton
let gateway: OpenClawGateway | null = null;

export function getGateway(): OpenClawGateway {
  if (!gateway) {
    gateway = new OpenClawGateway();
    gateway.start();
  }
  return gateway;
}
