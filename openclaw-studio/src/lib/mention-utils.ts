import type { MentionRef } from "./types";

const MENTION_RE = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g;

export function parseMentions(text: string): MentionRef[] {
  const refs: MentionRef[] = [];
  let match;
  while ((match = MENTION_RE.exec(text)) !== null) {
    refs.push({
      label: match[1],
      type: match[2] as MentionRef["type"],
      id: match[3],
    });
  }
  return refs;
}

export function stripMentionTokens(text: string): string {
  return text.replace(MENTION_RE, "@$1");
}

export function insertMention(
  text: string,
  cursorPos: number,
  mention: MentionRef,
): { text: string; cursorPos: number } {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return { text, cursorPos };

  const prefix = before.slice(0, atIdx);
  const token = `@[${mention.label}](${mention.type}:${mention.id}) `;
  return {
    text: prefix + token + after,
    cursorPos: prefix.length + token.length,
  };
}

export function getQueryAfterAt(
  text: string,
  cursorPos: number,
): { active: boolean; query: string; atIndex: number } {
  const before = text.slice(0, cursorPos);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return { active: false, query: "", atIndex: -1 };

  const betweenAtAndCursor = before.slice(atIdx + 1);
  if (/\s/.test(betweenAtAndCursor) && betweenAtAndCursor.length > 0) {
    const lastSpace = betweenAtAndCursor.lastIndexOf(" ");
    if (lastSpace !== -1) return { active: false, query: "", atIndex: -1 };
  }
  if (betweenAtAndCursor.includes("[")) {
    return { active: false, query: "", atIndex: -1 };
  }

  return { active: true, query: betweenAtAndCursor, atIndex: atIdx };
}

export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return t.includes(q);
}
