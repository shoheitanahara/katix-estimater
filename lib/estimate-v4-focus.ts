import type { EstimateV4FocusBand, EstimateV4GradeBand } from "@/lib/types";

/**
 * 国産車などグレード不明時: 通常帯の下限〜最上位帯の上限を全体相場とする
 */
export function buildOverallFocusBand(
  standard: EstimateV4GradeBand,
  top: EstimateV4GradeBand
): EstimateV4FocusBand {
  const min = standard.priceRange?.min ?? null;
  const max = top.priceRange?.max ?? null;

  if (min === null || max === null) {
    return {
      kind: "overall",
      label: "全体相場（通常〜最上位）",
      buyPrice: null,
      priceRange: null,
      retailPrice: null,
    };
  }

  const rangeMin = Math.min(min, max);
  const rangeMax = Math.max(min, max);

  return {
    kind: "overall",
    label: "全体相場（通常〜最上位）",
    buyPrice: null,
    priceRange: { min: rangeMin, max: rangeMax },
    retailPrice: null,
  };
}

export function focusBandFromGradeInput(
  grade: string,
  band: EstimateV4GradeBand
): EstimateV4FocusBand {
  return {
    kind: "grade",
    label: grade,
    gradeName: grade,
    buyPrice: band.buyPrice,
    priceRange: band.priceRange,
    retailPrice: band.retailPrice,
  };
}
