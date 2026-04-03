/**
 * 経営向けエクスポート CSV の入札1〜5位（入札額・上限入札額・円）から
 * 業者入札レンジの最小・最大を万円で求める。
 */

/** 入札1〜5位: 入札額・上限入札額（列名） */
export const AUCTION_BID_RANK_YEN_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ["入札1位_入札額", "入札1位_上限入札額"],
  ["入札2位_入札額", "入札2位_上限入札額"],
  ["入札3位_入札額", "入札3位_上限入札額"],
  ["入札4位_入札額", "入札4位_上限入札額"],
  ["入札5位_入札額", "入札5位_上限入札額"],
];

function toYenInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const y = Math.round(value);
    return y >= 0 ? y : null;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * 1〜5位の入札額・上限入札額に含まれる全金額（円）の最小・最大を万円で返す。
 * いずれも空のときは null。
 */
export function parseAuctionBidRangeManFromRecord(
  record: Record<string, string>
): { minMan: number; maxMan: number } | null {
  const yenValues: number[] = [];
  for (const [lowCol, highCol] of AUCTION_BID_RANK_YEN_COLUMNS) {
    const a = toYenInt(record[lowCol]);
    const b = toYenInt(record[highCol]);
    if (a !== null) yenValues.push(a);
    if (b !== null) yenValues.push(b);
  }
  if (yenValues.length === 0) return null;
  const minYen = Math.min(...yenValues);
  const maxYen = Math.max(...yenValues);
  return {
    minMan: Math.round((minYen / 10_000) * 100) / 100,
    maxMan: Math.round((maxYen / 10_000) * 100) / 100,
  };
}

export type AuctionBidRangeMan = { minMan: number; maxMan: number };

/** AI 予想（中心・レンジ）と業者入札レンジの位置関係 */
export function computeAiVsBidRangeFlags(
  auctionExpected: { centerMan: number; rangeMinMan: number; rangeMaxMan: number } | undefined,
  bid: AuctionBidRangeMan | null
): { aiCenterInBidRange: boolean | null; aiRangeOverlapsBidRange: boolean | null } {
  if (!auctionExpected || !bid) {
    return { aiCenterInBidRange: null, aiRangeOverlapsBidRange: null };
  }
  const c = auctionExpected.centerMan;
  const { rangeMinMan: aiLo, rangeMaxMan: aiHi } = auctionExpected;
  const aiCenterInBidRange = c >= bid.minMan && c <= bid.maxMan;
  const aiRangeOverlapsBidRange = !(aiHi < bid.minMan || aiLo > bid.maxMan);
  return { aiCenterInBidRange, aiRangeOverlapsBidRange };
}
