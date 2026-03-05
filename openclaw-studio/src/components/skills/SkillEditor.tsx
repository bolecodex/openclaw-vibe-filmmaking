import Editor from "@monaco-editor/react";

interface SkillEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function SkillEditor({ content, onChange }: SkillEditorProps) {
  return (
    <div className="h-full min-h-[400px] overflow-hidden rounded-lg border border-white/10">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        language="markdown"
        theme="vs-dark"
        value={content}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          wordWrap: "on",
          padding: { top: 16 },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
