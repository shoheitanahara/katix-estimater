import { NextResponse } from "next/server";
import { parseEstimateV4Body, runEstimateV4 } from "@/lib/estimate-v4-api";

export async function postEstimateV4Json(
  request: Request,
  logContext: string = "estimate-v4"
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = parseEstimateV4Body(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const result = await runEstimateV4(parsed.input);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "相場予想の処理に失敗しました。";
    console.error(`[POST ${logContext}]`, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
