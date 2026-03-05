import { useMemo, useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type {
  ChatMessage as ChatMessageType,
  ToolCallInfo,
  UiActionRecord,
} from "../../lib/types";

const MENTION_TYPE_COLORS: Record<string, string> = {
  file: "bg-gray-500/20 text-gray-300",
  character: "bg-amber-500/20 text-amber-300",
  scene: "bg-emerald-500/20 text-emerald-300",
  shot: "bg-blue-500/20 text-blue-300",
  skill: "bg-purple-500/20 text-purple-300",
};

function highlightMentions(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const re = /@(\S+)/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const label = match[1];
    parts.push(
      <span
        key={match.index}
        className="inline-block rounded bg-accent/20 px-1 py-0.5 text-accent"
      >
        @{label}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

function ThinkingPanel({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-300 transition-colors"
      >
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4.5 2l4 4-4 4" />
        </svg>
        <span className="inline-flex items-center gap-1">
          <svg className="h-3 w-3 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 1.5" />
          </svg>
          思考过程
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 rounded border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-gray-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}

function ToolCallItem({ tc }: { tc: ToolCallInfo }) {
  const isRunning = tc.status === "running";
  const hasDetails = tc.input || tc.output;
  const [expanded, setExpanded] = useState(isRunning && hasDetails);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRunning && hasDetails && !expanded) setExpanded(true);
  }, [isRunning, hasDetails, expanded]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [tc.output]);

  const statusIcon = (() => {
    switch (tc.status) {
      case "running":
        return (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
        );
      case "completed":
        return (
          <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 12.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" />
          </svg>
        );
      case "failed":
        return (
          <svg className="h-3.5 w-3.5 text-red-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.5 3.1L3.1 4.5 6.6 8l-3.5 3.5 1.4 1.4L8 9.4l3.5 3.5 1.4-1.4L9.4 8l3.5-3.5-1.4-1.4L8 6.6z" />
          </svg>
        );
      default:
        return (
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500" />
        );
    }
  })();

  const statusColor =
    tc.status === "running"
      ? "border-accent/20 bg-accent/5"
      : tc.status === "completed"
        ? "border-emerald-500/20 bg-emerald-500/5"
        : tc.status === "failed"
          ? "border-red-500/20 bg-red-500/5"
          : "border-white/5 bg-white/[0.02]";

  return (
    <div className={`rounded border ${statusColor} px-2.5 py-1.5 text-xs`}>
      <div
        className={`flex items-center gap-2 ${hasDetails ? "cursor-pointer" : ""}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {statusIcon}
        <span className="font-medium text-gray-300">{tc.title}</span>
        {hasDetails && (
          <svg
            className={`ml-auto h-3 w-3 text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M4.5 2l4 4-4 4" />
          </svg>
        )}
      </div>
      {expanded && hasDetails && (
        <div className="mt-1.5 space-y-1.5 border-t border-white/5 pt-1.5 text-[10px] text-gray-400">
          {tc.input && (
            <div>
              <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-gray-500">
                输入
              </span>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/20 p-1.5">
                {tc.input}
              </div>
            </div>
          )}
          {tc.output && (
            <div>
              <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-gray-500">
                输出
              </span>
              <div
                ref={outputRef}
                className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded bg-black/20 p-1.5"
              >
                {tc.output}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UiActionIndicator({ actions }: { actions: UiActionRecord[] }) {
  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      {actions.map((a, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] text-indigo-300"
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            {a.action === "navigate" ? (
              <path d="M2 6h8M7 3l3 3-3 3" />
            ) : (
              <circle cx="6" cy="6" r="3" />
            )}
          </svg>
          {a.label}
        </span>
      ))}
    </div>
  );
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  const contentWithMentions = useMemo(() => {
    if (!isUser || !message.mentions?.length) return null;
    return highlightMentions(message.content);
  }, [isUser, message.content, message.mentions]);

  const hasThinking = !isUser && message.thinking;
  const hasToolCalls = !isUser && message.toolCalls && message.toolCalls.length > 0;
  const hasUiActions = !isUser && message.uiActions && message.uiActions.length > 0;
  const isLoading = !isUser && !message.content && !hasThinking && !hasToolCalls && !hasUiActions;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-accent/20 text-gray-100"
            : "bg-surface-2 text-gray-200"
        }`}
      >
        {isUser ? (
          <div className="flex flex-col gap-2">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {message.attachments.map((att) => (
                  <img
                    key={att.id}
                    src={att.dataUrl}
                    alt={att.name ?? "attachment"}
                    className="h-20 w-20 rounded-md border border-white/10 object-cover"
                  />
                ))}
              </div>
            )}
            {contentWithMentions ? (
              <p className="whitespace-pre-wrap">{contentWithMentions}</p>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
            {message.mentions && message.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {message.mentions.map((m, i) => (
                  <span
                    key={i}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      MENTION_TYPE_COLORS[m.type] ?? "bg-white/10 text-gray-400"
                    }`}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {hasThinking && <ThinkingPanel thinking={message.thinking!} />}

            {hasToolCalls && (
              <div className="flex flex-col gap-1.5 mb-1.5">
                {message.toolCalls!.map((tc) => (
                  <ToolCallItem key={tc.id} tc={tc} />
                ))}
              </div>
            )}

            {hasUiActions && <UiActionIndicator actions={message.uiActions!} />}

            {message.content ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : isLoading ? (
              <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-gray-500" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
