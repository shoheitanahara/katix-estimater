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
    const mileage = (formData.get("mileage") as string | null)?.trim() ?? null;
    const grade = (formData.get("grade") as string | null)?.trim() ?? null;
    const vin = (formData.get("vin") as string | null)?.trim() ?? null;
    const memo = (formData.get("memo") as string | null)?.trim() ?? null;

    if (!exteriorFile || !(exteriorFile instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "車体写真が必須です。" },
        { status: 400 }
      );
    }
    const hasMeterFile = meterFile && meterFile instanceof File;
    if (!hasMeterFile && !mileage) {
      return NextResponse.json(
        { ok: false, error: "メーター写真または走行距離のいずれかが必要です。" },
        { status: 400 }
      );
    }

    if (exteriorFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "画像は10MB以下にしてください。" },
        { status: 400 }
      );
    }
    const exteriorType = exteriorFile.type;
    if (!ALLOWED_TYPES.includes(exteriorType)) {
      return NextResponse.json(
        { ok: false, error: "車体写真は JPEG / PNG / WebP でアップロードしてください。" },
        { status: 400 }
      );
    }
    if (hasMeterFile && (meterFile!.size > MAX_FILE_SIZE || !ALLOWED_TYPES.includes(meterFile!.type))) {
      return NextResponse.json(
        { ok: false, error: "メーター写真は10MB以下で JPEG / PNG / WebP にしてください。" },
        { status: 400 }
      );
    }

    const exteriorBuffer = await exteriorFile.arrayBuffer();
    const exteriorBase64 = toBase64(exteriorBuffer);
    let meterBase64: string | null = null;
    if (hasMeterFile) {
      const meterBuffer = await meterFile!.arrayBuffer();
      meterBase64 = toBase64(meterBuffer);
    }

    const result = await getEstimateFromOpenAI(
      exteriorBase64,
      meterBase64,
      grade || null,
      vin || null,
      memo || null,
      mileage || null
    );

    const id = randomUUID();
    const images = { exterior: exteriorBase64, meter: meterBase64 ?? undefined };
    saveResult(id, result, images);

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
