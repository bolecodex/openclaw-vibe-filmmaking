/**
 * 火山方舟模型价格表（文本模型，元/百万 tokens）
 * 依据：https://www.volcengine.com/docs/82379/1544106?lang=zh
 * 更新时请与文档核对。
 */

export const VOLC_PRICING_DOC =
  "https://www.volcengine.com/docs/82379/1544106?lang=zh";

export interface ModelPricing {
  inputPerMillionRmb: number;
  outputPerMillionRmb: number;
}

/** 默认模型（豆包 Pro 等通用文本模型）单价，用于无 modelId 时的估算 */
const DEFAULT_MODEL_ID = "default";

/** 模型单价：元/百万 tokens。文档更新日期 2026-03，请以官方文档为准。 */
const PRICE_TABLE: Record<string, ModelPricing> = {
  [DEFAULT_MODEL_ID]: {
    inputPerMillionRmb: 1.2,
    outputPerMillionRmb: 8.0,
  },
  "doubao-pro": {
    inputPerMillionRmb: 1.2,
    outputPerMillionRmb: 8.0,
  },
  "doubao-seed-code": {
    inputPerMillionRmb: 1.2,
    outputPerMillionRmb: 8.0,
  },
};

export function getDefaultPricing(): ModelPricing {
  return PRICE_TABLE[DEFAULT_MODEL_ID];
}

export function getPricing(modelId: string | undefined): ModelPricing {
  if (modelId && PRICE_TABLE[modelId]) return PRICE_TABLE[modelId];
  return getDefaultPricing();
}

/**
 * 根据 input/output token 数估算费用（元）
 */
export function estimateCostRmb(
  inputTokens: number,
  outputTokens: number,
  modelId?: string
): number {
  const p = getPricing(modelId);
  const inputCost = (inputTokens / 1_000_000) * p.inputPerMillionRmb;
  const outputCost = (outputTokens / 1_000_000) * p.outputPerMillionRmb;
  return Math.round((inputCost + outputCost) * 100) / 100;
}
