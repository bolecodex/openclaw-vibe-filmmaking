/** Strip YAML frontmatter from SKILL.md; return body for Markdown rendering. */
export function skillMarkdownBody(raw: string): string {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return (m ? m[1] : raw).trim();
}
