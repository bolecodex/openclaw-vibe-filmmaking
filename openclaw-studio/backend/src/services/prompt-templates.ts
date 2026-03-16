import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getStepDefinition, type StepDefinition } from "./step-actions.js";
import { getSkill } from "./skills-manager.js";

export interface StepPromptContext {
  projectDir: string;
  projectName: string;
  action: string;
  params: Record<string, unknown>;
  selectedIds?: string[];
}

const ACTION_LABELS: Record<string, string> = {
  run: "执行全部",
  "run-all": "执行全部",
  "run-selected": "仅执行选中项",
  "retry-failed": "重试失败项",
  "reset-all": "重置全部并重新执行",
  "generate-images": "为所有角色生成肖像图",
  "regenerate-one": "重新生成选中角色的肖像图",
};

function readStyleYaml(projectDir: string): string {
  const stylePath = join(projectDir, "style.yaml");
  if (!existsSync(stylePath)) return "(未找到 style.yaml)";
  return readFileSync(stylePath, "utf-8");
}

function readSkillContent(skillName: string): string {
  const skill = getSkill(skillName);
  if (!skill) return `(技能 ${skillName} 未找到)`;
  return skill.content as string;
}

export function buildStepPrompt(stepId: string, ctx: StepPromptContext): string {
  const step = getStepDefinition(stepId);
  if (!step) throw new Error(`Unknown step: ${stepId}`);

  const skillContent = readSkillContent(step.skill);
  const styleContent = readStyleYaml(ctx.projectDir);
  const actionLabel =
    stepId === "scenes-to-images"
      ? ctx.action === "run"
        ? "全部场景出图"
        : ctx.action === "regenerate-one"
          ? "重新生成选中场景的场景图"
          : ACTION_LABELS[ctx.action] ?? ctx.action
      : stepId === "extract-props"
        ? ctx.action === "run"
          ? "提取全部道具"
          : ctx.action === "generate-images"
            ? "全部道具出图"
            : ctx.action === "regenerate-one"
              ? "重新生成选中道具的配图"
              : ACTION_LABELS[ctx.action] ?? ctx.action
        : ACTION_LABELS[ctx.action] ?? ctx.action;

  const sections: string[] = [
    `[自动化任务 - 请严格按照以下指令执行，不要询问确认]`,
    ``,
    `任务: ${step.name}`,
    `操作: ${actionLabel}`,
  ];

  if (ctx.selectedIds?.length) {
    sections.push(`目标对象: ${ctx.selectedIds.join(", ")}`);
  }

  sections.push(``);
  sections.push(`[项目信息]`);
  sections.push(`项目名称: ${ctx.projectName}`);
  sections.push(`项目目录: ${ctx.projectDir}`);

  if (Object.keys(ctx.params).length > 0) {
    sections.push(``);
    sections.push(`[参数配置]`);
    for (const [k, v] of Object.entries(ctx.params)) {
      sections.push(`${k}: ${v}`);
    }
  }

  sections.push(``);
  sections.push(`[style.yaml 内容]`);
  sections.push(styleContent);

  sections.push(``);
  sections.push(`[技能指南 - 请阅读并严格遵循]`);
  sections.push(skillContent);

  sections.push(``);
  sections.push(`[执行要求]`);
  sections.push(`1. 严格按照上方技能指南中的步骤执行`);
  sections.push(`2. 所有产物文件必须写入 ${ctx.projectDir}`);
  sections.push(`3. 不要在 ${ctx.projectDir} 下创建额外的子目录层级`);
  sections.push(`4. 文件名前缀使用「${ctx.projectName}」`);
  sections.push(`5. 执行完成后简要报告结果（完成数量、成功/失败等）`);
  sections.push(`6. 如果遇到错误，报告错误信息但不要中止整个任务`);

  return sections.join("\n");
}

export function buildWorkspaceGuideForStep(step: StepDefinition, projectDir: string, projectName: string): string {
  return [
    `[工作空间操作指南 - 最高优先级]`,
    ``,
    `⚠️ 所有文件必须保存到以下项目目录，不允许使用任何其他路径：`,
    `项目目录: ${projectDir}`,
    ``,
    `===== 目录覆盖规则 =====`,
    `你的 workspace 已被设置为: ${projectDir}`,
    `- 所有产物直接写入 ${projectDir}/ 下`,
    `- 不要在 ${projectDir} 下再创建以小说标题命名的子目录`,
    `- 文件名前缀使用「${projectName}」，不是小说标题`,
    `=============================`,
  ].join("\n");
}
