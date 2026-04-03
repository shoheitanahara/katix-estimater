import { NextResponse } from "next/server";
import { postEstimateV2Json } from "@/lib/estimate-v2-post";

const PATH =
  "/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** 友人向け: 推測しにくいパス。認証なし。仕様は docs/API-ESTIMATE-V2.md。 */
export async function POST(request: Request) {
  const res = await postEstimateV2Json(request, PATH);
  return withCors(res);
}
