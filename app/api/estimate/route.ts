import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getEstimateFromOpenAI } from "@/lib/openai";
import { saveResult } from "@/lib/store";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const exteriorFile = formData.get("exteriorImage") as File | null;
    const meterFile = formData.get("meterImage") as File | null;
    const vin = (formData.get("vin") as string | null)?.trim() ?? null;
    const memo = (formData.get("memo") as string | null)?.trim() ?? null;

    if (!exteriorFile || !(exteriorFile instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "車体写真が必須です。" },
        { status: 400 }
      );
    }
    if (!meterFile || !(meterFile instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "メーター写真が必須です。" },
        { status: 400 }
      );
    }

    if (exteriorFile.size > MAX_FILE_SIZE || meterFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "画像は10MB以下にしてください。" },
        { status: 400 }
      );
    }

    const exteriorType = exteriorFile.type;
    const meterType = meterFile.type;
    if (!ALLOWED_TYPES.includes(exteriorType) || !ALLOWED_TYPES.includes(meterType)) {
      return NextResponse.json(
        { ok: false, error: "画像は JPEG / PNG / WebP でアップロードしてください。" },
        { status: 400 }
      );
    }

    const exteriorBuffer = await exteriorFile.arrayBuffer();
    const meterBuffer = await meterFile.arrayBuffer();
    const exteriorBase64 = toBase64(exteriorBuffer);
    const meterBase64 = toBase64(meterBuffer);

    const result = await getEstimateFromOpenAI(
      exteriorBase64,
      meterBase64,
      vin || null,
      memo || null
    );

    const id = randomUUID();
    const images = { exterior: exteriorBase64, meter: meterBase64 };
    saveResult(id, result, images);

    // クライアントで結果・画像を表示するため返す（画像は data URL 用の base64）
    return NextResponse.json({
      ok: true,
      id,
      result,
      images,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "相場予想の処理に失敗しました。";
    console.error("[POST /api/estimate]", err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
