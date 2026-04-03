import { NextResponse } from "next/server";
import { parseEstimateV2Body, runEstimateV2 } from "@/lib/estimate-v2-api";

export async function postEstimateV2Json(
  request: Request,
  logContext: string = "estimate-v2"
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = parseEstimateV2Body(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const result = await runEstimateV2(parsed.input);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "相場予想の処理に失敗しました。";
    console.error(`[POST ${logContext}]`, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
