import { describe, it, expect } from "vitest";
import {
  parseMentions,
  insertMention,
  getQueryAfterAt,
  fuzzyMatch,
  stripMentionTokens,
} from "../mention-utils";

describe("parseMentions", () => {
  it("parses a single mention token", () => {
    const result = parseMentions("@[沈鸢](character:c1) 帮她生图");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      label: "沈鸢",
      type: "character",
      id: "c1",
    });
  });

  it("returns empty for text without mentions", () => {
    expect(parseMentions("hello world")).toHaveLength(0);
  });

  it("parses multiple mentions", () => {
    const result = parseMentions(
      "@[沈鸢](character:c1) 和 @[SC_01 阎罗殿还魂](scene:SC_01) 相关",
    );
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("沈鸢");
    expect(result[1].type).toBe("scene");
  });

  it("handles file type mentions", () => {
    const result = parseMentions("@[style.yaml](file:style.yaml) 修改风格");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("file");
    expect(result[0].id).toBe("style.yaml");
  });
});

describe("stripMentionTokens", () => {
  it("strips tokens to display form", () => {
    expect(
      stripMentionTokens("@[沈鸢](character:c1) 帮她生图"),
    ).toBe("@沈鸢 帮她生图");
  });

  it("leaves plain text unchanged", () => {
    expect(stripMentionTokens("hello world")).toBe("hello world");
  });
});

describe("insertMention", () => {
  it("inserts mention at @ position (material name only)", () => {
    const result = insertMention("hello @", 7, {
      type: "character",
      id: "c1",
      label: "沈鸢",
    });
    expect(result.text).toContain("@沈鸢 ");
    expect(result.text.startsWith("hello ")).toBe(true);
    expect(result.cursorPos).toBeGreaterThan(7);
  });

  it("inserts mention in middle of text", () => {
    const result = insertMention("tell @沈 about it", 7, {
      type: "character",
      id: "c1",
      label: "沈鸢",
    });
    expect(result.text).toContain("@沈鸢 ");
    expect(result.text).toContain("about it");
  });

  it("returns unchanged text if no @ found", () => {
    const result = insertMention("hello world", 5, {
      type: "character",
      id: "c1",
      label: "沈鸢",
    });
    expect(result.text).toBe("hello world");
    expect(result.cursorPos).toBe(5);
  });
});

describe("getQueryAfterAt", () => {
  it("detects active @ with query", () => {
    const result = getQueryAfterAt("hello @沈", 9);
    expect(result.active).toBe(true);
    expect(result.query).toBe("沈");
  });

  it("detects @ at end", () => {
    const result = getQueryAfterAt("hello @", 7);
    expect(result.active).toBe(true);
    expect(result.query).toBe("");
  });

  it("inactive without @", () => {
    const result = getQueryAfterAt("hello world", 11);
    expect(result.active).toBe(false);
  });

  it("inactive after completed mention (space after @name)", () => {
    const result = getQueryAfterAt("hello @沈鸢 other", 14);
    expect(result.active).toBe(false);
  });
});

describe("fuzzyMatch", () => {
  it("matches substring", () => {
    expect(fuzzyMatch("沈鸢", "沈")).toBe(true);
  });

  it("case-insensitive for ASCII", () => {
    expect(fuzzyMatch("StyleYaml", "style")).toBe(true);
  });

  it("empty query matches everything", () => {
    expect(fuzzyMatch("anything", "")).toBe(true);
  });

  it("no match returns false", () => {
    expect(fuzzyMatch("hello", "world")).toBe(false);
  });
});
