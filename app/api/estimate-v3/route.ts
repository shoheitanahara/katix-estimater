import { postEstimateV3Json } from "@/lib/estimate-v3-post";

/** Web検索込みのためタイムアウトを延長（Vercel等） */
export const maxDuration = 120;

/** v3 AI買取相場予想（gpt-5.6-sol + Web検索） */
export async function POST(request: Request) {
  return postEstimateV3Json(request, "/api/estimate-v3");
}
