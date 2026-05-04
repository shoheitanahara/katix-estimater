import { postEstimateV2Json } from "@/lib/estimate-v2-post";

/** アプリ内 UI 用。 */
export async function POST(request: Request) {
  return postEstimateV2Json(request, "/api/estimate-v2");
}
