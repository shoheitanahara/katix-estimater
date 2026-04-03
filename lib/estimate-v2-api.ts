import { getEstimateV2FromOpenAI } from "@/lib/openai";
import type { EstimateV2Result } from "@/lib/types";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toMileageKm(value: unknown): number | null {
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

export type EstimateV2ParsedInput = {
  make: string;
  model: string;
  year?: number;
  mileageKm: number;
};

export type ParseEstimateV2BodyResult =
  | { ok: true; input: EstimateV2ParsedInput }
  | { ok: false; error: string; status: number };

/**
 * POST ボディを検証し、OpenAI 呼び出し用の入力に正規化する。
 */
export function parseEstimateV2Body(body: unknown): ParseEstimateV2BodyResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "リクエスト形式が不正です。", status: 400 };
  }

  const o = body as Record<string, unknown>;
  const make = normalizeText(o.make) || normalizeText(o.maker);
  const model = normalizeText(o.model);
  const year = toYear(o.year);
  const mileageKm = toMileageKm(o.mileageKm);

  if (!make) {
    return { ok: false, error: "メーカーを入力してください。", status: 400 };
  }
  if (!model) {
    return { ok: false, error: "車種名を入力してください。", status: 400 };
  }
  if (o.year !== undefined && year === null) {
    return { ok: false, error: "年式（西暦）を正しく入力してください。", status: 400 };
  }
  if (mileageKm === null) {
    return { ok: false, error: "走行距離（km）を正しく入力してください。", status: 400 };
  }

  const input: EstimateV2ParsedInput = {
    make,
    model,
    mileageKm,
    ...(year !== null ? { year } : {}),
  };

  return { ok: true, input };
}

export async function runEstimateV2(input: EstimateV2ParsedInput): Promise<EstimateV2Result> {
  return getEstimateV2FromOpenAI({
    make: input.make,
    model: input.model,
    year: input.year,
    mileageKm: input.mileageKm,
  });
}
