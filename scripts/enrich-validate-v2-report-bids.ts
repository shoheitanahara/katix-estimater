/**
 * 既存の validate-v2 出力 JSON に、同じソース CSV から業者入札レンジ（1〜5位 min/max）と
 * AI との比較フラグを付与する（OpenAI API は呼ばない）。
 *
 * 用法:
 *   npx tsx scripts/enrich-validate-v2-report-bids.ts [validate-v2-report.json] [source.csv]
 * 省略時: data/validate-v2-report.json と、JSON の meta.sourceCsv
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";

import {
  computeAiVsBidRangeFlags,
  parseAuctionBidRangeManFromRecord,
} from "../lib/auction-bid-range";

type JsonRow = {
  rowId?: string;
  ok?: boolean;
  result?: { auctionExpected: { centerMan: number; rangeMinMan: number; rangeMaxMan: number } };
  bidRangeMinMan?: number | null;
  bidRangeMaxMan?: number | null;
  aiCenterInBidRange?: boolean | null;
  aiRangeOverlapsBidRange?: boolean | null;
  [key: string]: unknown;
};

type ReportJson = {
  meta: { sourceCsv?: string; comparisonNote?: string };
  summary: Record<string, unknown> | null;
  results: JsonRow[];
};

function main(): void {
  const jsonPath = resolve(process.argv[2] ?? "data/validate-v2-report.json");
  let csvPath = process.argv[3];
  const rawJson = readFileSync(jsonPath, "utf8");
  const data = JSON.parse(rawJson) as ReportJson;
  if (!csvPath && data.meta?.sourceCsv) {
    csvPath = resolve(data.meta.sourceCsv);
  }
  if (!csvPath) {
    console.error("CSV パスを指定するか、JSON の meta.sourceCsv を設定してください。");
    process.exit(1);
  }
  const csvRaw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const idCol = "uar_id";
  const byId = new Map<string, Record<string, string>>();
  for (const rec of records) {
    const id = String(rec[idCol] ?? "").trim();
    if (id) byId.set(id, rec);
  }

  let rowsWithBidRange = 0;
  let rowsOkWithBidRange = 0;
  let aiCenterInBidRangeCount = 0;
  let aiRangeOverlapsBidRangeCount = 0;

  for (const r of data.results) {
    const id = r.rowId?.trim();
    if (!id) {
      r.bidRangeMinMan = r.bidRangeMinMan ?? null;
      r.bidRangeMaxMan = r.bidRangeMaxMan ?? null;
      continue;
    }
    const rec = byId.get(id);
    if (!rec) {
      r.bidRangeMinMan = null;
      r.bidRangeMaxMan = null;
      r.aiCenterInBidRange = null;
      r.aiRangeOverlapsBidRange = null;
      continue;
    }
    const bidParsed = parseAuctionBidRangeManFromRecord(rec);
    if (!bidParsed) {
      r.bidRangeMinMan = null;
      r.bidRangeMaxMan = null;
      r.aiCenterInBidRange = null;
      r.aiRangeOverlapsBidRange = null;
      continue;
    }
    rowsWithBidRange++;
    r.bidRangeMinMan = bidParsed.minMan;
    r.bidRangeMaxMan = bidParsed.maxMan;

    const result = r.result;
    if (r.ok && result?.auctionExpected) {
      const f = computeAiVsBidRangeFlags(result.auctionExpected, bidParsed);
      r.aiCenterInBidRange = f.aiCenterInBidRange;
      r.aiRangeOverlapsBidRange = f.aiRangeOverlapsBidRange;
      if (f.aiCenterInBidRange !== null && f.aiRangeOverlapsBidRange !== null) {
        rowsOkWithBidRange++;
        if (f.aiCenterInBidRange) aiCenterInBidRangeCount++;
        if (f.aiRangeOverlapsBidRange) aiRangeOverlapsBidRangeCount++;
      }
    } else {
      r.aiCenterInBidRange = null;
      r.aiRangeOverlapsBidRange = null;
    }
  }

  const aiCenterInBidRangePct =
    rowsOkWithBidRange > 0
      ? Math.round((aiCenterInBidRangeCount / rowsOkWithBidRange) * 10_000) / 100
      : null;
  const aiRangeOverlapsBidRangePct =
    rowsOkWithBidRange > 0
      ? Math.round((aiRangeOverlapsBidRangeCount / rowsOkWithBidRange) * 10_000) / 100
      : null;

  if (data.summary && typeof data.summary === "object") {
    data.summary.rowsWithBidRange = rowsWithBidRange;
    data.summary.rowsOkWithBidRange = rowsOkWithBidRange;
    data.summary.aiCenterInBidRangeCount = aiCenterInBidRangeCount;
    data.summary.aiCenterInBidRangePct = aiCenterInBidRangePct;
    data.summary.aiRangeOverlapsBidRangeCount = aiRangeOverlapsBidRangeCount;
    data.summary.aiRangeOverlapsBidRangePct = aiRangeOverlapsBidRangePct;
  }

  if (data.meta) {
    const tag = "enrich-validate-v2-report-bids";
    const note = data.meta.comparisonNote ?? "";
    if (!note.includes(tag)) {
      data.meta.comparisonNote =
        (note ? `${note} ` : "") + `業者入札レンジは ${tag} で CSV から追記済み。`;
    }
  }

  writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`更新: ${jsonPath}`);
  console.log(
    `業者レンジあり ${rowsWithBidRange} 件 / API 成功かつ比較可 ${rowsOkWithBidRange} 件 → AI 中心が業者内 ${aiCenterInBidRangePct}% / レンジ重複 ${aiRangeOverlapsBidRangePct}%`
  );
}

main();
