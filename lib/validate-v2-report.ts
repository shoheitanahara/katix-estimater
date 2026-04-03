import type { EstimateV2Result } from "@/lib/types";

/** `data/validate-v2-report.json`（validate-v2-csv 出力）の形 */
export type ValidateV2ReportMeta = {
  sourceCsv: string;
  configPath: string;
  columnMap: Record<string, string>;
  idColumn?: string;
  maxRows: number;
  delayMsBetweenRequests: number;
  processed: number;
  comparisonNote: string;
};

export type ValidateV2ReportSummary = {
  rowsWithActual: number;
  maeMan: number;
  inRangeCount: number;
  inRangePct: number;
  aboveCenterCount: number;
  aboveCenterPct: number;
  targetAboveCenterPct: number;
  targetAboveMet: boolean;
  /** 入札1〜5位から算出した業者レンジが取れた件数 */
  rowsWithBidRange?: number;
  /** API 成功かつ業者レンジあり（比較可能な件数） */
  rowsOkWithBidRange?: number;
  /** AI 中心が業者レンジ内（上記のうち） */
  aiCenterInBidRangeCount?: number;
  aiCenterInBidRangePct?: number | null;
  /** AI 予想レンジと業者レンジが重なる（上記のうち） */
  aiRangeOverlapsBidRangeCount?: number;
  aiRangeOverlapsBidRangePct?: number | null;
};

export type ValidateV2ReportRow = {
  rowIndex: number;
  rowId?: string;
  make: string;
  model: string;
  year?: number;
  mileageKm: number;
  actualMan: number | null;
  actualYen?: number | null;
  ok: boolean;
  error?: string;
  result?: EstimateV2Result;
  accidentHistoryLabel?: string;
  repairHistoryLabel?: string;
  centerErrorMan?: number;
  inRange?: boolean;
  auctionAboveCenter?: boolean;
  /** CSV の入札1〜5位（入札額・上限入札額）の最小・最大（万円） */
  bidRangeMinMan?: number | null;
  bidRangeMaxMan?: number | null;
  /** AI 予想中心が業者入札レンジ内（API 成功・入札あり時） */
  aiCenterInBidRange?: boolean | null;
  /** AI 予想レンジと業者入札レンジが重なる（API 成功・入札あり時） */
  aiRangeOverlapsBidRange?: boolean | null;
};

export type ValidateV2Report = {
  meta: ValidateV2ReportMeta;
  summary: ValidateV2ReportSummary;
  results: ValidateV2ReportRow[];
};
