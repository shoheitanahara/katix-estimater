import { NextResponse } from "next/server";
import { parseEstimateV3Body, runEstimateV3 } from "@/lib/estimate-v3-api";

export async function postEstimateV3Json(
  request: Request,
  logContext: string = "estimate-v3"
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = parseEstimateV3Body(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const result = await runEstimateV3(parsed.input);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "相場予想の処理に失敗しました。";
    console.error(`[POST ${logContext}]`, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
