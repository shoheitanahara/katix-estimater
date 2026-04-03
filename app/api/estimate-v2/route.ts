import { postEstimateV2Json } from "@/lib/estimate-v2-post";

/** アプリ内 UI 用。友人向けの共有 URL は docs/API-ESTIMATE-V2.md を参照。 */
export async function POST(request: Request) {
  return postEstimateV2Json(request, "/api/estimate-v2");
}
