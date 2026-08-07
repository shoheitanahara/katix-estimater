import { getEstimateV3FromOpenAI } from "@/lib/openai";
import type { EstimateV3Result } from "@/lib/types";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toMileage(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
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

export type EstimateV3ParsedInput = {
  maker: string;
  carName: string;
  year: number;
  grade?: string;
  color?: string;
  mileage: number;
  formInfo?: string;
};

export type ParseEstimateV3BodyResult =
  | { ok: true; input: EstimateV3ParsedInput }
  | { ok: false; error: string; status: number };

/**
 * POST ボディを検証し、OpenAI 呼び出し用の入力に正規化する。
 * プロンプトの車両情報フィールド（maker / carName / year / grade / color / mileage）に合わせる。
 */
export function parseEstimateV3Body(body: unknown): ParseEstimateV3BodyResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "リクエスト形式が不正です。", status: 400 };
  }

  const o = body as Record<string, unknown>;
  // 後方互換: make / model / mileageKm も受け付ける
  const maker = normalizeText(o.maker) || normalizeText(o.make);
  const carName = normalizeText(o.carName) || normalizeText(o.model);
  const year = toYear(o.year);
  const grade = normalizeText(o.grade);
  const color = normalizeText(o.color);
  const mileage = toMileage(o.mileage ?? o.mileageKm);
  const formInfo = normalizeText(o.formInfo) || normalizeText(o.conditionFormInfo);

  if (!maker) {
    return { ok: false, error: "メーカーを入力してください。", status: 400 };
  }
  if (!carName) {
    return { ok: false, error: "車種を入力してください。", status: 400 };
  }
  if (year === null) {
    return { ok: false, error: "年式（西暦）を正しく入力してください。", status: 400 };
  }
  if (mileage === null) {
    return { ok: false, error: "走行距離（km）を正しく入力してください。", status: 400 };
  }

  const input: EstimateV3ParsedInput = {
    maker,
    carName,
    year,
    mileage,
    ...(grade ? { grade } : {}),
    ...(color ? { color } : {}),
    ...(formInfo ? { formInfo } : {}),
  };

  return { ok: true, input };
}

export async function runEstimateV3(input: EstimateV3ParsedInput): Promise<EstimateV3Result> {
  return getEstimateV3FromOpenAI({
    maker: input.maker,
    carName: input.carName,
    year: input.year,
    grade: input.grade,
    color: input.color,
    mileage: input.mileage,
    formInfo: input.formInfo,
  });
}
