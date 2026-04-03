/**
 * ローカル1回実行用: CSV の各行に対し v2 と同じ getEstimateV2FromOpenAI を順に呼び、結果をファイル出力する。
 *
 * 使い方:
 *   npm run validate:v2-csv -- "scripts/katix-data - export.csv" --config scripts/katix-export-validate.config.json
 *
 * 環境変数: OPENAI_API_KEY（.env.local にあれば起動時に読み込み）
 *
 * 実績列:
 *   - columnMap.actualMan … 万円
 *   - columnMap.actualYen … 円（例: 落札価格）。内部で万円に換算して中心値・レンジと比較
 *
 * 検証指標（実績あり・API成功行のみ）:
 *   - 「落札 > 予想中心」の割合（%）… 目標例: 85% 以上
 *   - 「レンジ内」の割合（%）… 実績（万円）が rangeMin〜rangeMax に含まれる割合
 * 既定 maxRows: 300（--max で変更可）
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { parse } from "csv-parse/sync";
import { getEstimateV2FromOpenAI } from "../lib/openai";
import type { EstimateV2Result } from "../lib/types";

function loadEnvLocal(): void {
  const tryPaths = [join(process.cwd(), ".env.local"), join(process.cwd(), ".env")];
  for (const p of tryPaths) {
    try {
      const raw = readFileSync(p, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = val;
      }
      break;
    } catch {
      // 次のパスへ
    }
  }
}

/** メーカー・車種の表記ゆれを軽く揃える（全角英数字など） */
function normalizeText(value: unknown): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return "";
  try {
    return s.normalize("NFKC");
  } catch {
    return s;
  }
}

function toMileageKm(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function toYear(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const year = Math.round(value);
    return year >= 1980 && year <= 2100 ? year : null;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const year = Math.round(n);
  return year >= 1980 && year <= 2100 ? year : null;
}

function toActualMan(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100) / 100;
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** 落札価格など（円・整数想定） */
function toActualYen(value: unknown): number | null {
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type ColumnMap = {
  make: string;
  model: string;
  year?: string;
  mileageKm: string;
  /** 実績（万円） */
  actualMan?: string;
  /** 実績（円）— 落札価格など。actualMan より優先 */
  actualYen?: string;
  /** CSV列名: 事故歴（例: true/false） */
  accidentHistory?: string;
  /** CSV列名: 修理歴 */
  repairHistory?: string;
};

type ConfigFile = {
  columnMap?: Partial<ColumnMap> & Record<string, string | undefined>;
  delayMsBetweenRequests?: number;
  maxRows?: number;
  /** 行IDとして出力に含める列（例: uar_id） */
  idColumn?: string;
  /** 「落札 > 予想中心」の割合がこの値以上なら targetAboveMet（既定 85） */
  targetAboveCenterPct?: number;
};

function mergeColumnMap(file?: ConfigFile): ColumnMap {
  const m = file?.columnMap ?? {};
  const out: ColumnMap = {
    make: m.make ?? "make",
    model: m.model ?? "model",
    mileageKm: m.mileageKm ?? "mileageKm",
  };
  if (m.year !== undefined && m.year !== "") {
    out.year = m.year;
  }
  if (m.actualMan !== undefined && m.actualMan !== "") {
    out.actualMan = m.actualMan;
  }
  if (m.actualYen !== undefined && m.actualYen !== "") {
    out.actualYen = m.actualYen;
  }
  out.accidentHistory = (m.accidentHistory ?? "事故歴").trim() || "事故歴";
  out.repairHistory = (m.repairHistory ?? "修理歴").trim() || "修理歴";
  return out;
}

function cellFromRecord(record: Record<string, string>, header: string | undefined): string {
  if (!header) return "";
  const v = record[header];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseArgs(argv: string[]): {
  csvPath: string;
  configPath: string | null;
  maxRows?: number;
  delayMs?: number;
} {
  const rest = argv.slice(2);
  let configPath: string | null = null;
  let maxRows: number | undefined;
  let delayMs: number | undefined;
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--config" && rest[i + 1]) {
      configPath = rest[++i];
      continue;
    }
    if (a === "--max" && rest[i + 1]) {
      maxRows = Math.max(1, parseInt(rest[++i], 10) || 300);
      continue;
    }
    if (a === "--delay" && rest[i + 1]) {
      delayMs = Math.max(0, parseInt(rest[++i], 10) || 1200);
      continue;
    }
    if (a.startsWith("-")) {
      console.warn(`不明な引数をスキップ: ${a}`);
      continue;
    }
    positional.push(a);
  }
  const csvPath = positional[0] ?? "";
  return { csvPath, configPath, maxRows, delayMs };
}

type RowResult = {
  rowIndex: number;
  rowId?: string;
  make: string;
  model: string;
  year?: number;
  mileageKm: number;
  /** 万円（円列の場合は換算） */
  actualMan: number | null;
  /** 元データが円のとき */
  actualYen?: number | null;
  ok: boolean;
  error?: string;
  result?: EstimateV2Result;
  centerErrorMan?: number;
  inRange?: boolean;
  /** 落札（円）> 予想中心（万円×1万） */
  auctionAboveCenter?: boolean;
  /** 事故歴（経営向け表示: あり/なし/不明） */
  accidentHistoryLabel?: string;
  /** 修理歴 */
  repairHistoryLabel?: string;
};

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSVの真偽値っぽいセルを経営向け「あり/なし」に整形 */
function formatHistoryCell(value: unknown): string {
  if (value === undefined || value === null) return "不明";
  const s = typeof value === "string" ? value.trim() : String(value).trim();
  if (!s) return "不明";
  const v = s.toLowerCase();
  if (v === "true" || v === "1") return "あり";
  if (v === "false" || v === "0") return "なし";
  return s;
}

function boolToJa(value: boolean | undefined): string {
  if (value === undefined) return "";
  return value ? "はい" : "いいえ";
}

/** 経営向け: 必要な列のみ・日本語ヘッダ */
function resultsToCsv(rows: RowResult[]): string {
  const headers = [
    "査定ID",
    "メーカー",
    "車種",
    "年式",
    "走行距離_km",
    "事故歴",
    "修理歴",
    "落札価格_円",
    "落札_万円",
    "予想中心_万円",
    "予想レンジ下限_万円",
    "予想レンジ上限_万円",
    "信頼度_パーセント",
    "実績と中心の差_万円",
    "レンジ内",
    "落札が予想中心より上",
    "API成功",
    "エラー",
    "AIコメント",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const res = r.result;
    const comment = res?.comment ?? "";
    lines.push(
      [
        escapeCsvField(r.rowId ?? ""),
        escapeCsvField(r.make),
        escapeCsvField(r.model),
        r.year ?? "",
        r.mileageKm,
        escapeCsvField(r.accidentHistoryLabel ?? "不明"),
        escapeCsvField(r.repairHistoryLabel ?? "不明"),
        r.actualYen != null ? String(r.actualYen) : "",
        r.actualMan ?? "",
        res?.auctionExpected.centerMan ?? "",
        res?.auctionExpected.rangeMinMan ?? "",
        res?.auctionExpected.rangeMaxMan ?? "",
        res?.confidencePercent ?? "",
        r.centerErrorMan ?? "",
        boolToJa(r.inRange),
        boolToJa(r.auctionAboveCenter),
        r.ok ? "はい" : "いいえ",
        escapeCsvField(r.error ?? ""),
        escapeCsvField(comment),
      ].join(",")
    );
  }
  return lines.join("\n") + "\n";
}

/** 実績金額を万円に正規化（円優先） */
function resolveActualMan(
  map: ColumnMap,
  record: Record<string, string>
): { actualMan: number | null; actualYen: number | null } {
  if (map.actualYen) {
    const yen = toActualYen(cellFromRecord(record, map.actualYen));
    if (yen === null) return { actualMan: null, actualYen: null };
    return { actualMan: Math.round((yen / 10_000) * 100) / 100, actualYen: yen };
  }
  if (map.actualMan) {
    const man = toActualMan(cellFromRecord(record, map.actualMan));
    return { actualMan: man, actualYen: null };
  }
  return { actualMan: null, actualYen: null };
}

async function main(): Promise<void> {
  loadEnvLocal();

  const { csvPath, configPath, maxRows: maxCli, delayMs: delayCli } = parseArgs(process.argv);
  if (!csvPath) {
    console.error(`用法: npm run validate:v2-csv -- <csv-file> [--config path.json] [--max 300] [--delay 1200]`);
    process.exit(1);
  }

  const absCsv = resolve(csvPath);
  let config: ConfigFile = {};
  if (configPath) {
    const raw = readFileSync(resolve(configPath), "utf8");
    config = JSON.parse(raw) as ConfigFile;
  }

  const map = mergeColumnMap(config);
  const delayMs = delayCli ?? config.delayMsBetweenRequests ?? 1200;
  const maxRows = maxCli ?? config.maxRows ?? 300;
  const idColumn = config.idColumn?.trim() || undefined;
  const targetAbovePct = config.targetAboveCenterPct ?? 85;

  const csvRaw = readFileSync(absCsv, "utf8").replace(/^\uFEFF/, "");
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const outDir = join(process.cwd(), "scripts", "validate-v2-output");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const base = `validate-v2-${stamp}`;

  const results: RowResult[] = [];
  let withActual = 0;
  let sumAbsErr = 0;
  let inRangeCount = 0;
  let aboveCenterCount = 0;

  const slice = records.slice(0, maxRows);
  console.log(`CSV: ${absCsv}`);
  console.log(`行数（処理上限 ${maxRows}）: ${slice.length}`);
  console.log(`列マッピング: ${JSON.stringify(map)}`);
  if (idColumn) console.log(`ID列: ${idColumn}`);
  console.log(`「落札 > 予想中心」目標割合: ${targetAbovePct}% 以上`);
  console.log(`API 間隔: ${delayMs}ms\n`);

  for (let i = 0; i < slice.length; i++) {
    const record = slice[i];
    const rowIndex = i + 2;
    const rowId = idColumn ? normalizeText(cellFromRecord(record, idColumn)) : undefined;
    const accidentHistoryLabel = formatHistoryCell(
      cellFromRecord(record, map.accidentHistory ?? "事故歴")
    );
    const repairHistoryLabel = formatHistoryCell(
      cellFromRecord(record, map.repairHistory ?? "修理歴")
    );
    const make = normalizeText(cellFromRecord(record, map.make));
    const model = normalizeText(cellFromRecord(record, map.model));
    const yearRaw = map.year ? cellFromRecord(record, map.year) : "";
    const year = yearRaw ? toYear(yearRaw) : null;
    const mileageKm = toMileageKm(cellFromRecord(record, map.mileageKm));
    const { actualMan, actualYen } = resolveActualMan(map, record);

    if ((map.actualYen || map.actualMan) && actualMan === null) {
      results.push({
        rowIndex,
        ...(rowId ? { rowId } : {}),
        make,
        model,
        ...(year != null ? { year } : {}),
        mileageKm: mileageKm ?? 0,
        actualMan: null,
        ok: false,
        error: "実績（落札価格など）が空です",
        accidentHistoryLabel,
        repairHistoryLabel,
      });
      console.warn(`行 ${rowIndex}: スキップ（実績なし）`);
      continue;
    }

    if (!make || !model || mileageKm === null) {
      results.push({
        rowIndex,
        ...(rowId ? { rowId } : {}),
        make,
        model,
        ...(year != null ? { year } : {}),
        mileageKm: mileageKm ?? 0,
        actualMan,
        ...(actualYen != null ? { actualYen } : {}),
        ok: false,
        error: "make / model / mileageKm が不足または不正です",
        accidentHistoryLabel,
        repairHistoryLabel,
      });
      console.warn(`行 ${rowIndex}: スキップ（入力不足）`);
      continue;
    }
    if (map.year && yearRaw && year === null) {
      results.push({
        rowIndex,
        ...(rowId ? { rowId } : {}),
        make,
        model,
        mileageKm,
        actualMan,
        ...(actualYen != null ? { actualYen } : {}),
        ok: false,
        error: "年式の値が不正です",
        accidentHistoryLabel,
        repairHistoryLabel,
      });
      console.warn(`行 ${rowIndex}: スキップ（年式不正）`);
      continue;
    }

    try {
      const result = await getEstimateV2FromOpenAI({
        make,
        model,
        ...(year !== null ? { year } : {}),
        mileageKm,
      });

      const row: RowResult = {
        rowIndex,
        ...(rowId ? { rowId } : {}),
        make,
        model,
        ...(year !== null ? { year } : {}),
        mileageKm,
        actualMan,
        ...(actualYen != null ? { actualYen } : {}),
        ok: true,
        result,
        accidentHistoryLabel,
        repairHistoryLabel,
      };

      if (actualMan !== null) {
        withActual++;
        const c = result.auctionExpected.centerMan;
        row.centerErrorMan = Math.round((actualMan - c) * 100) / 100;
        const { rangeMinMan, rangeMaxMan } = result.auctionExpected;
        row.inRange = actualMan >= rangeMinMan && actualMan <= rangeMaxMan;
        if (row.centerErrorMan !== undefined) {
          sumAbsErr += Math.abs(row.centerErrorMan);
        }
        if (row.inRange) inRangeCount++;
        /** 理想: 落札が予想中心（万円）よりやや上 */
        row.auctionAboveCenter = actualMan > c;
        if (row.auctionAboveCenter) aboveCenterCount++;
      }

      results.push(row);
      const yenInfo = actualYen != null ? ` / 落札${actualYen.toLocaleString()}円` : "";
      console.log(
        `行 ${rowIndex}: OK 中心 ${result.auctionExpected.centerMan}万円（${result.auctionExpected.rangeMinMan}〜${result.auctionExpected.rangeMaxMan}）${yenInfo}${row.auctionAboveCenter === true ? " ★落札>中心" : row.auctionAboveCenter === false ? " 落札≤中心" : ""}`
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({
        rowIndex,
        ...(rowId ? { rowId } : {}),
        make,
        model,
        ...(year !== null ? { year } : {}),
        mileageKm,
        actualMan,
        ...(actualYen != null ? { actualYen } : {}),
        ok: false,
        error: message,
        accidentHistoryLabel,
        repairHistoryLabel,
      });
      console.error(`行 ${rowIndex}: エラー ${message}`);
    }

    if (i < slice.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const jsonPath = join(outDir, `${base}.json`);
  const csvOutPath = join(outDir, `${base}.csv`);

  const abovePct =
    withActual > 0 ? Math.round((aboveCenterCount / withActual) * 10_000) / 100 : null;
  const inRangePct =
    withActual > 0 ? Math.round((inRangeCount / withActual) * 10_000) / 100 : null;
  const targetAboveMet = abovePct !== null && abovePct >= targetAbovePct;

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        meta: {
          sourceCsv: absCsv,
          configPath: configPath ? resolve(configPath) : null,
          columnMap: map,
          idColumn: idColumn ?? null,
          maxRows,
          delayMsBetweenRequests: delayMs,
          processed: results.length,
          comparisonNote:
            "落札が予想中心より上: 落札（万円）> AI予想中心（万円）。レンジ内: 落札（万円）が予想下限〜上限に含まれる。CSVの事故歴・修理歴は結果に accidentHistoryLabel / repairHistoryLabel として含まれる（true/false は あり/なし に整形）。出力CSVは日本語ヘッダ（経営向け）。",
        },
        summary:
          withActual > 0
            ? {
                rowsWithActual: withActual,
                maeMan: Math.round((sumAbsErr / withActual) * 100) / 100,
                /** 落札（万円換算）が予想レンジ内に含まれる割合（%） */
                inRangeCount,
                inRangePct,
                /** 落札（万円換算）が予想中心より上の割合（%） */
                aboveCenterCount,
                aboveCenterPct: abovePct,
                targetAboveCenterPct: targetAbovePct,
                targetAboveMet,
              }
            : null,
        results,
      },
      null,
      2
    ),
    "utf8"
  );
  writeFileSync(csvOutPath, resultsToCsv(results), "utf8");

  console.log(`\n完了: ${jsonPath}`);
  console.log(`      ${csvOutPath}`);
  if (withActual > 0) {
    console.log(`\n【集計・実績あり ${withActual} 件】`);
    console.log(
      `・「落札 > 予想中心」の割合: ${abovePct}%（${aboveCenterCount}/${withActual}） 目標 ${targetAbovePct}% 以上 → ${targetAboveMet ? "達成" : "未達"}`
    );
    console.log(`・「レンジ内」の割合: ${inRangePct}%（${inRangeCount}/${withActual}）`);
    console.log(`・MAE（中心との差・万円）: ≈ ${(sumAbsErr / withActual).toFixed(2)}`);
  } else {
    console.log(
      "\n実績列がないか空のため比較できません（columnMap.actualYen または actualMan を設定してください）。"
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
