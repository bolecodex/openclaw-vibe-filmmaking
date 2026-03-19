import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { skillMarkdownBody } from "../../lib/skill-doc";

const prose =
  "skill-doc max-w-none text-[13px] leading-relaxed text-gray-300 [&_a]:text-accent [&_a]:underline hover:[&_a]:text-accent-hover";

export function SkillDocumentation({ rawMarkdown }: { rawMarkdown: string }) {
  const body = useMemo(() => skillMarkdownBody(rawMarkdown), [rawMarkdown]);

  return (
    <div className={`${prose} overflow-x-auto pb-8`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-0 border-b border-white/10 pb-2 text-lg font-semibold tracking-tight text-gray-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-8 scroll-mt-4 border-b border-white/5 pb-1.5 text-base font-semibold text-gray-100 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-200">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1.5 mt-4 text-sm font-medium text-gray-300">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-gray-400 [&:has(+table)]:mb-2">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-400 marker:text-gray-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-gray-400 marker:text-gray-500">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-indigo-500/40 bg-indigo-500/5 py-2 pl-4 pr-2 text-gray-400 [&_p]:mb-0 [&_p]:last:mb-0">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className={`${className} block overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[12px] text-gray-200`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-amber-200/90">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-0 [&>code]:border-0 [&>code]:bg-transparent">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[480px] border-collapse text-left text-[12px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-2/80 text-gray-200">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5 bg-surface-1/50">{children}</tbody>
          ),
          tr: ({ children }) => <tr className="transition-colors hover:bg-white/[0.03]">{children}</tr>,
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold text-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2.5 align-top text-gray-400">{children}</td>
          ),
          hr: () => <hr className="my-6 border-white/10" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-200">{children}</strong>
          ),
        }}
      >
        {body || "*（暂无正文，请在 SKILL.md 中补充「功能」「参数」等说明）*"}
      </ReactMarkdown>
    </div>
  );
}
