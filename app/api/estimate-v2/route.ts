import { NextResponse } from "next/server";
import { getEstimateV2FromOpenAI } from "@/lib/openai";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "リクエスト形式が不正です。" }, { status: 400 });
    }

    const o = body as Record<string, unknown>;
    const make = normalizeText(o.make);
    const model = normalizeText(o.model);
    const year = toYear(o.year);
    const mileageKm = toMileageKm(o.mileageKm);

    if (!make) {
      return NextResponse.json({ ok: false, error: "メーカーを入力してください。" }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ ok: false, error: "車種名を入力してください。" }, { status: 400 });
    }
    if (o.year !== undefined && year === null) {
      return NextResponse.json({ ok: false, error: "年式（西暦）を正しく入力してください。" }, { status: 400 });
    }
    if (mileageKm === null) {
      return NextResponse.json({ ok: false, error: "走行距離（km）を正しく入力してください。" }, { status: 400 });
    }

    const result = await getEstimateV2FromOpenAI({ make, model, year: year ?? undefined, mileageKm });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "相場予想の処理に失敗しました。";
    console.error("[POST /api/estimate-v2]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

