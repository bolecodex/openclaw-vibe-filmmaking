import { describe, it, expect } from "vitest";
import {
  buildContextPrompt,
  buildReferencesBlock,
  buildImagesBlock,
  buildEnhancedPrompt,
} from "../prompt-builder.js";

describe("buildContextPrompt", () => {
  it("returns empty string for null/undefined context", () => {
    expect(buildContextPrompt(null)).toBe("");
    expect(buildContextPrompt(undefined)).toBe("");
  });

  it("includes project name when project is present", () => {
    const result = buildContextPrompt({
      project: { name: "替夫挡箭", path: "/path" },
      view: { currentTab: "characters", currentView: "workspace" },
      focus: {},
      summary: {},
    });
    expect(result).toContain("替夫挡箭");
    expect(result).toContain("角色");
  });

  it("includes focus info when character is focused", () => {
    const result = buildContextPrompt({
      project: { name: "proj", path: "/p" },
      view: { currentTab: "characters", currentView: "workspace" },
      focus: {
        characterId: "char_01",
        characterName: "沈鸢",
      },
      summary: {},
    });
    expect(result).toContain("沈鸢");
    expect(result).toContain("char_01");
  });

  it("includes summary statistics", () => {
    const result = buildContextPrompt({
      project: { name: "proj", path: "/p" },
      view: { currentTab: "dashboard", currentView: "workspace" },
      focus: {},
      summary: {
        totalCharacters: 11,
        totalScenes: 23,
        totalShots: 350,
      },
    });
    expect(result).toContain("11角色");
    expect(result).toContain("23场景");
    expect(result).toContain("350分镜");
  });

  it("only outputs header when minimal context", () => {
    const result = buildContextPrompt({
      project: null,
      view: { currentTab: "dashboard", currentView: "workspace" },
      focus: {},
      summary: {},
    });
    expect(result).toContain("概览");
  });
});

describe("buildReferencesBlock", () => {
  it("returns empty string for empty/undefined references", () => {
    expect(buildReferencesBlock(undefined)).toBe("");
    expect(buildReferencesBlock([])).toBe("");
  });

  it("generates reference block for a skill ref", () => {
    const result = buildReferencesBlock([
      { type: "skill", id: "char-extractor", label: "提取角色" },
    ]);
    expect(result).toContain("@提取角色");
    expect(result).toContain("skill");
  });

  it("handles multiple mixed references", () => {
    const result = buildReferencesBlock([
      { type: "character", id: "c1", label: "沈鸢" },
      { type: "scene", id: "SC_01", label: "SC_01 阎罗殿还魂" },
    ]);
    expect(result).toContain("@沈鸢");
    expect(result).toContain("@SC_01 阎罗殿还魂");
  });
});

describe("buildImagesBlock", () => {
  it("returns empty string for no attachments", () => {
    expect(buildImagesBlock(undefined)).toBe("");
    expect(buildImagesBlock([])).toBe("");
  });

  it("generates single image block", () => {
    const result = buildImagesBlock([
      { id: "img-1", dataUrl: "data:image/png;base64,abc", size: 1000 },
    ]);
    expect(result).toContain("1张图片");
    expect(result).toContain("data:image/png;base64,abc");
  });

  it("generates numbered blocks for multiple images", () => {
    const result = buildImagesBlock([
      { id: "img-1", dataUrl: "data:image/png;base64,a", size: 100 },
      { id: "img-2", dataUrl: "data:image/png;base64,b", size: 200 },
    ]);
    expect(result).toContain("图片1/2");
    expect(result).toContain("图片2/2");
  });
});

describe("buildEnhancedPrompt", () => {
  it("combines all sections", () => {
    const result = buildEnhancedPrompt("帮这个角色换发型", {
      context: {
        project: { name: "替夫挡箭", path: "/p" },
        view: { currentTab: "characters", currentView: "workspace" },
        focus: { characterName: "沈鸢", characterId: "c1" },
        summary: { totalCharacters: 5 },
      },
      references: [{ type: "skill", id: "x", label: "画图" }],
      attachments: [
        { id: "img-1", dataUrl: "data:image/png;base64,test", size: 100 },
      ],
    });
    expect(result).toContain("[当前上下文]");
    expect(result).toContain("替夫挡箭");
    expect(result).toContain("@画图");
    expect(result).toContain("1张图片");
    expect(result).toContain("[用户消息]");
    expect(result).toContain("帮这个角色换发型");
  });

  it("works with message only", () => {
    const result = buildEnhancedPrompt("hello", {});
    expect(result).toBe("[用户消息]\nhello");
  });
});
