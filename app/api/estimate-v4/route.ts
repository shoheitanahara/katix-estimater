import { postEstimateV4Json } from "@/lib/estimate-v4-post";

/** Web検索込みのためタイムアウトを延長（Vercel等） */
export const maxDuration = 120;

/** v4 AI買取相場予想（通常／最上位・gpt-6.1-sol + Web検索） */
export async function POST(request: Request) {
  return postEstimateV4Json(request, "/api/estimate-v4");
}
