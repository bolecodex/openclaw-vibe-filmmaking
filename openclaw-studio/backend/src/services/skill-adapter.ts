import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getWorkspaceDir } from "./workspace.js";

export interface SkillAdaptation {
  baseSkill: string;
  adaptations: {
    params?: Record<string, unknown>;
    batchSize?: number;
    retryCount?: number;
    timeout?: number;
    model?: string;
  };
}

export interface SkillVariant {
  id: string;
  name: string;
  baseSkill: string;
  adaptations: SkillAdaptation["adaptations"];
  filePath: string;
}

export function createSkillVariant(
  baseSkill: string,
  adaptations: SkillAdaptation["adaptations"],
  variantName?: string,
): string {
  const workspaceDir = getWorkspaceDir();
  const skillsDir = join(workspaceDir, ".cursor", "skills");
  const variantId = variantName || `${baseSkill}-variant-${Date.now()}`;
  const variantDir = join(skillsDir, variantId);

  if (!existsSync(variantDir)) {
    mkdirSync(variantDir, { recursive: true });
  }

  const baseSkillPath = join(skillsDir, baseSkill, "SKILL.md");
  if (!existsSync(baseSkillPath)) {
    throw new Error(`Base skill not found: ${baseSkill}`);
  }

  const baseSkillContent = readFileSync(baseSkillPath, "utf-8");
  const variantContent = generateVariantSkillContent(baseSkill, baseSkillContent, adaptations);

  const variantSkillPath = join(variantDir, "SKILL.md");
  writeFileSync(variantSkillPath, variantContent);

  return variantId;
}

export function updateSkill(skillName: string, updates: Partial<SkillAdaptation["adaptations"]>): void {
  const workspaceDir = getWorkspaceDir();
  const skillsDir = join(workspaceDir, ".cursor", "skills");
  const skillPath = join(skillsDir, skillName, "SKILL.md");

  if (!existsSync(skillPath)) {
    throw new Error(`Skill not found: ${skillName}`);
  }

  const skillContent = readFileSync(skillPath, "utf-8");
  const updatedContent = applySkillUpdates(skillContent, updates);
  writeFileSync(skillPath, updatedContent);
}

function generateVariantSkillContent(
  baseSkill: string,
  baseContent: string,
  adaptations: SkillAdaptation["adaptations"],
): string {
  let variantContent = baseContent;

  if (adaptations.params) {
    const paramsSection = generateParamsSection(adaptations.params);
    variantContent = appendToSkillContent(variantContent, "## 参数配置", paramsSection);
  }

  if (adaptations.batchSize) {
    const batchSection = `\n## 批处理配置\n\n批处理大小: ${adaptations.batchSize}\n`;
    variantContent = appendToSkillContent(variantContent, "## 批处理配置", batchSection);
  }

  if (adaptations.retryCount) {
    const retrySection = `\n## 重试配置\n\n最大重试次数: ${adaptations.retryCount}\n`;
    variantContent = appendToSkillContent(variantContent, "## 重试配置", retrySection);
  }

  if (adaptations.model) {
    const modelSection = `\n## 模型配置\n\n使用模型: ${adaptations.model}\n`;
    variantContent = appendToSkillContent(variantContent, "## 模型配置", modelSection);
  }

  variantContent = `<!-- 此技能基于 ${baseSkill} 创建，包含以下适配：\n${JSON.stringify(adaptations, null, 2)}\n-->\n\n${variantContent}`;

  return variantContent;
}

function applySkillUpdates(skillContent: string, updates: Partial<SkillAdaptation["adaptations"]>): string {
  let updatedContent = skillContent;

  if (updates.params) {
    const paramsSection = generateParamsSection(updates.params);
    updatedContent = updateOrAppendSection(updatedContent, "## 参数配置", paramsSection);
  }

  if (updates.batchSize !== undefined) {
    const batchSection = `\n## 批处理配置\n\n批处理大小: ${updates.batchSize}\n`;
    updatedContent = updateOrAppendSection(updatedContent, "## 批处理配置", batchSection);
  }

  if (updates.retryCount !== undefined) {
    const retrySection = `\n## 重试配置\n\n最大重试次数: ${updates.retryCount}\n`;
    updatedContent = updateOrAppendSection(updatedContent, "## 重试配置", retrySection);
  }

  if (updates.model) {
    const modelSection = `\n## 模型配置\n\n使用模型: ${updates.model}\n`;
    updatedContent = updateOrAppendSection(updatedContent, "## 模型配置", modelSection);
  }

  return updatedContent;
}

function generateParamsSection(params: Record<string, unknown>): string {
  let section = "\n## 参数配置\n\n";
  for (const [key, value] of Object.entries(params)) {
    section += `- ${key}: ${JSON.stringify(value)}\n`;
  }
  return section;
}

function appendToSkillContent(content: string, sectionHeader: string, newSection: string): string {
  if (content.includes(sectionHeader)) {
    const lines = content.split("\n");
    const headerIndex = lines.findIndex((line) => line.includes(sectionHeader));
    if (headerIndex >= 0) {
      lines.splice(headerIndex + 1, 0, newSection);
      return lines.join("\n");
    }
  }
  return content + "\n" + newSection;
}

function updateOrAppendSection(content: string, sectionHeader: string, newSection: string): string {
  if (content.includes(sectionHeader)) {
    const lines = content.split("\n");
    const headerIndex = lines.findIndex((line) => line.includes(sectionHeader));
    if (headerIndex >= 0) {
      let endIndex = headerIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith("#")) {
        endIndex++;
      }
      lines.splice(headerIndex + 1, endIndex - headerIndex - 1, newSection.trim());
      return lines.join("\n");
    }
  }
  return content + "\n" + newSection;
}

export function createClassicalScriptAdapter(): string {
  return createSkillVariant("novel-02-script-to-scenes", {
    params: {
      style: "classical",
      dialogueMarkers: ["曰", "道", "说", "问", "答"],
      sceneMarkers: ["来到", "走进", "回到", "在", "进入"],
    },
    batchSize: 10,
    retryCount: 3,
  });
}

export function createBatchImageGenerator(): string {
  return createSkillVariant("novel-04-shots-to-images", {
    params: {
      batchSize: 20,
      parallel: true,
      quality: "high",
    },
    batchSize: 20,
    retryCount: 2,
  });
}

export function createOptimizedStoryboardAdapter(): string {
  return createSkillVariant("novel-03-scenes-to-storyboard", {
    params: {
      minDuration: 3,
      maxDuration: 7,
      autoSplit: true,
    },
    retryCount: 2,
  });
}
