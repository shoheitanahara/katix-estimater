import { getEstimateV4FromOpenAI } from "@/lib/openai";
import type {
  EstimateV4ColorFamily,
  EstimateV4MileageBand,
  EstimateV4OriginType,
  EstimateV4Result,
} from "@/lib/types";
import { ESTIMATE_V4_COLOR_FAMILIES, ESTIMATE_V4_MILEAGE_BANDS, ESTIMATE_V4_ORIGIN_TYPES } from "@/lib/types";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toYear(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const year = Math.round(value);
    return year >= 1980 && year <= 2100 ? year : null;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const year = Math.round(n);
  return year >= 1980 && year <= 2100 ? year : null;
}

function isMileageBand(value: string): value is EstimateV4MileageBand {
  return (ESTIMATE_V4_MILEAGE_BANDS as readonly string[]).includes(value);
}

function isColorFamily(value: string): value is EstimateV4ColorFamily {
  return (ESTIMATE_V4_COLOR_FAMILIES as readonly string[]).includes(value);
}

function isOriginType(value: string): value is EstimateV4OriginType {
  return (ESTIMATE_V4_ORIGIN_TYPES as readonly string[]).includes(value);
}

export type EstimateV4ParsedInput = {
  maker: string;
  carName: string;
  year: number;
  mileageBand: EstimateV4MileageBand;
  colorFamily: EstimateV4ColorFamily;
  originType: EstimateV4OriginType;
  grade?: string;
};

export type ParseEstimateV4BodyResult =
  | { ok: true; input: EstimateV4ParsedInput }
  | { ok: false; error: string; status: number };

/**
 * POST ボディを検証し、OpenAI 呼び出し用の入力に正規化する。
 */
export function parseEstimateV4Body(body: unknown): ParseEstimateV4BodyResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "リクエスト形式が不正です。", status: 400 };
  }

  const o = body as Record<string, unknown>;
  const maker = normalizeText(o.maker) || normalizeText(o.make);
  const carName = normalizeText(o.carName) || normalizeText(o.model);
  const year = toYear(o.year);
  const mileageBandRaw = normalizeText(o.mileageBand);
  const colorFamilyRaw = normalizeText(o.colorFamily);
  const originTypeRaw = normalizeText(o.originType);
  const grade = normalizeText(o.grade);

  if (!maker) {
    return { ok: false, error: "メーカーを入力してください。", status: 400 };
  }
  if (!carName) {
    return { ok: false, error: "車種を入力してください。", status: 400 };
  }
  if (year === null) {
    return { ok: false, error: "年式（西暦）を正しく入力してください。", status: 400 };
  }
  if (!mileageBandRaw || !isMileageBand(mileageBandRaw)) {
    return { ok: false, error: "走行距離区分を選択してください。", status: 400 };
  }
  if (!colorFamilyRaw || !isColorFamily(colorFamilyRaw)) {
    return { ok: false, error: "車体色系を選択してください。", status: 400 };
  }
  if (!originTypeRaw || !isOriginType(originTypeRaw)) {
    return { ok: false, error: "国産／輸入を選択してください。", status: 400 };
  }
  if (originTypeRaw === "domestic" && grade) {
    return { ok: false, error: "国産車ではグレードは入力できません。", status: 400 };
  }

  return {
    ok: true,
    input: {
      maker,
      carName,
      year,
      mileageBand: mileageBandRaw,
      colorFamily: colorFamilyRaw,
      originType: originTypeRaw,
      ...(grade ? { grade } : {}),
    },
  };
}

export async function runEstimateV4(input: EstimateV4ParsedInput): Promise<EstimateV4Result> {
  return getEstimateV4FromOpenAI({
    maker: input.maker,
    carName: input.carName,
    year: input.year,
    mileageBand: input.mileageBand,
    colorFamily: input.colorFamily,
    originType: input.originType,
    grade: input.grade,
  });
}
