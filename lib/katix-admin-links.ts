/**
 * 査定リクエストの管理画面 URL（検証レポートの ID リンク用）。
 * 例: https://car-duct-tape.katix.co.jp/v2/assessment-requests/44889
 */
const DEFAULT_ASSESSMENT_REQUESTS_BASE =
  "https://car-duct-tape.katix.co.jp/v2/assessment-requests";

function normalizeBaseUrl(raw: string | undefined): string {
  const s = (raw ?? DEFAULT_ASSESSMENT_REQUESTS_BASE).trim().replace(/\/+$/, "");
  return s || DEFAULT_ASSESSMENT_REQUESTS_BASE;
}

/** クライアント・サーバー両方で利用可（NEXT_PUBLIC はビルド時に埋め込み） */
export function katixAssessmentRequestAdminUrl(rowId: string | undefined | null): string | null {
  if (rowId == null) return null;
  const id = String(rowId).trim();
  if (!id) return null;
  const base = normalizeBaseUrl(process.env.NEXT_PUBLIC_KATIX_ASSESSMENT_REQUESTS_BASE_URL);
  return `${base}/${encodeURIComponent(id)}`;
}
