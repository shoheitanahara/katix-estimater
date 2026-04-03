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
};

export type ValidateV2Report = {
  meta: ValidateV2ReportMeta;
  summary: ValidateV2ReportSummary;
  results: ValidateV2ReportRow[];
};
