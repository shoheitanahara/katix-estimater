"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { katixAssessmentRequestAdminUrl } from "@/lib/katix-admin-links";
import type { ValidateV2Report, ValidateV2ReportRow } from "@/lib/validate-v2-report";

/** レンジ内でも「実績に対するずれ」がこれを超えたら注意色（相対誤差 |実績−中心| / 実績） */
const INPUT_QUALITY_REL_WARN = 0.15;

const nf = new Intl.NumberFormat("ja-JP");
const nf1 = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

const thInput = "border-b border-slate-200 bg-slate-100 px-2 py-2 text-slate-700";
const thActual = "border-b border-amber-200 bg-amber-100 px-2 py-2 text-amber-950";
const thAi = "border-b border-violet-200 bg-violet-100 px-2 py-2 text-violet-950";
const thDiff = "border-b border-rose-200 bg-rose-100 px-2 py-2 text-rose-950";
const thBid = "border-b border-cyan-200 bg-cyan-100 px-2 py-2 text-cyan-950";

/** 表ヘッダー1行目（グループ）の高さに合わせる（sticky 2行目の top 用） */
const STICKY_GROUP_ROW_CLASS = "h-11 min-h-[2.75rem]";

const tdInput = "border-b border-slate-100 bg-slate-50/90 px-2 py-2 text-slate-900";
const tdActual = "border-b border-amber-100 bg-amber-50/95 px-2 py-2";
const tdAi = "border-b border-violet-100 bg-violet-50/90 px-2 py-2";
const tdDiff = "border-b border-rose-100 bg-rose-50/90 px-2 py-2";
const tdBid = "border-b border-cyan-100 bg-cyan-50/90 px-2 py-2";

function BadgeYesNo({ value }: { value: boolean | undefined | null }) {
  if (value === undefined || value === null) return <span className="text-gray-400">—</span>;
  return (
    <span
      className={
        value
          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
          : "rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
      }
    >
      {value ? "はい" : "いいえ"}
    </span>
  );
}

/** 実績 − 予想中心（万円）。符号で色分け */
function DiffCell({ value }: { value: number | null | undefined }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-gray-400">—</span>;
  }
  const sign = value > 0 ? "+" : "";
  const tone =
    value > 0
      ? "bg-emerald-200/90 text-emerald-950 ring-1 ring-emerald-400/80"
      : value < 0
        ? "bg-rose-200/90 text-rose-950 ring-1 ring-rose-400/80"
        : "bg-gray-200/80 text-gray-900 ring-1 ring-gray-300";
  return (
    <span
      className={`inline-flex min-w-[5rem] justify-end rounded-md px-2.5 py-1.5 text-sm font-bold tabular-nums tracking-tight ${tone}`}
    >
      {sign}
      {nf1.format(value)}
    </span>
  );
}

/**
 * 入力列の行ごとの色分け。
 * - 良: レンジ内 かつ 相対誤差が閾値以下
 * - 注意: レンジ内だが相対誤差が大きい（バンドは合っているが中心から離れている）
 * - 悪: レンジ外（実績あり・API 成功時）
 * - 中立: 実績なし・API 失敗など比較不能
 */
function inputColumnClasses(r: ValidateV2ReportRow): { base: string; first: string } {
  if (!r.ok || r.actualMan == null || r.inRange === undefined) {
    return {
      base: `${tdInput}`,
      first: `${tdInput} border-l-2 border-slate-200 font-medium`,
    };
  }
  if (!r.inRange) {
    return {
      base: "border-b border-rose-200/90 bg-rose-50/90 px-2 py-2 text-slate-900",
      first:
        "border-b border-rose-200/90 bg-rose-50/90 px-2 py-2 font-medium text-slate-900 border-l-2 border-rose-400",
    };
  }
  const absErr = Math.abs(r.centerErrorMan ?? 0);
  const denom = Math.max(Math.abs(r.actualMan), 1e-9);
  const rel = absErr / denom;
  if (rel > INPUT_QUALITY_REL_WARN) {
    return {
      base: "border-b border-amber-200/90 bg-amber-50/80 px-2 py-2 text-slate-900",
      first:
        "border-b border-amber-200/90 bg-amber-50/80 px-2 py-2 font-medium text-slate-900 border-l-2 border-amber-400",
    };
  }
  return {
    base: "border-b border-emerald-200/80 bg-emerald-50/75 px-2 py-2 text-slate-900",
    first:
      "border-b border-emerald-200/80 bg-emerald-50/75 px-2 py-2 font-medium text-slate-900 border-l-2 border-emerald-500",
  };
}

function AssessmentIdCell({ rowId }: { rowId: string | undefined }) {
  const url = katixAssessmentRequestAdminUrl(rowId);
  if (!url || !rowId) {
    return <span className="font-mono text-[11px] text-gray-400">—</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-[7rem] items-center gap-0.5 font-mono text-[11px] font-semibold text-[rgb(64_162_96)] underline decoration-[rgb(64_162_96)]/50 underline-offset-2 hover:text-emerald-800 hover:decoration-emerald-700"
      title={url}
    >
      <span className="truncate">{rowId}</span>
      <span className="shrink-0 text-[10px] opacity-80" aria-hidden>
        ↗
      </span>
    </a>
  );
}

export function ValidationReportClient({ data }: { data: ValidateV2Report }) {
  const { meta, summary, results } = data;
  const [query, setQuery] = useState("");
  const [onlyInRange, setOnlyInRange] = useState(false);
  const [onlyApiError, setOnlyApiError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => {
      if (onlyInRange && !r.inRange) return false;
      if (onlyApiError && r.ok) return false;
      if (!q) return true;
      const hay = [
        r.make,
        r.model,
        String(r.year ?? ""),
        r.rowId ?? "",
        String(r.rowIndex),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [results, query, onlyInRange, onlyApiError]);

  return (
    <div className="bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-[min(1600px,calc(100%-2rem))] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo.webp" alt="KATIX" width={78} height={22} priority />
          </Link>
          <Link
            href="/estimate/v2"
            className="text-sm font-medium text-[rgb(64_162_96)] underline-offset-4 hover:underline"
          >
            テキスト査定（v2）へ
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[min(1600px,calc(100%-2rem))] px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-medium tracking-wide text-gray-500">経営向け</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            AI相場予想（v2）検証レポート
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
            CSV 実績（落札価格）と API 応答を突き合わせたバッチ検証の結果です。指標の定義は下記の注釈を参照してください。
          </p>
        </div>

        {/* KPI */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
            <p className="text-xs text-gray-500">実績あり件数</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {nf.format(summary.rowsWithActual)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
            <p className="text-xs text-gray-500">平均絶対誤差（万円）</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {nf1.format(summary.maeMan)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
            <p className="text-xs text-gray-500">レンジ内の割合</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {nf1.format(summary.inRangePct)}%
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {nf.format(summary.inRangeCount)} / {nf.format(summary.rowsWithActual)} 件
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 shadow-sm ${
              summary.targetAboveMet
                ? "border-emerald-200 bg-emerald-50/90"
                : "border-amber-200 bg-amber-50/90"
            }`}
          >
            <p className="text-xs text-gray-600">落札 &gt; 予想中心の割合</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {nf1.format(summary.aboveCenterPct)}%
            </p>
            <p className="mt-1 text-xs font-medium text-gray-700">
              目標: {summary.targetAboveCenterPct}% 以上
              {summary.targetAboveMet ? "（達成）" : "（未達）"}
            </p>
          </div>
        </section>

        {summary.rowsOkWithBidRange != null && summary.rowsOkWithBidRange > 0 && (
          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 shadow-sm">
              <p className="text-xs text-gray-500">AI 中心が業者入札レンジ内</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {nf1.format(summary.aiCenterInBidRangePct ?? 0)}%
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {nf.format(summary.aiCenterInBidRangeCount ?? 0)} / {nf.format(summary.rowsOkWithBidRange)} 件
                （業者レンジ取得 {nf.format(summary.rowsWithBidRange ?? 0)} 件）
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 shadow-sm">
              <p className="text-xs text-gray-500">AI 予想レンジと業者入札レンジが重なる</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                {nf1.format(summary.aiRangeOverlapsBidRangePct ?? 0)}%
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {nf.format(summary.aiRangeOverlapsBidRangeCount ?? 0)} / {nf.format(summary.rowsOkWithBidRange)} 件
              </p>
            </div>
          </section>
        )}

        {/* Meta */}
        <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">検証条件・注釈</h2>
          <dl className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
            <div>
              <dt className="text-gray-400">処理件数</dt>
              <dd className="font-mono text-[13px] text-gray-800">{meta.processed} 件（上限 {meta.maxRows}）</dd>
            </div>
            <div>
              <dt className="text-gray-400">リクエスト間隔</dt>
              <dd className="font-mono text-[13px] text-gray-800">{meta.delayMsBetweenRequests} ms</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-400">指標の説明</dt>
              <dd className="mt-1 leading-relaxed text-gray-700">{meta.comparisonNote}</dd>
            </div>
          </dl>
        </section>

        {/* Filters */}
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <label className="flex max-w-md flex-1 items-center gap-2">
            <span className="shrink-0 text-xs text-gray-500">絞り込み</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="メーカー・車種・年式・行・ID"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none ring-[rgb(64_162_96)]/30 focus:ring-2"
            />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={onlyInRange}
                onChange={(e) => setOnlyInRange(e.target.checked)}
                className="rounded border-gray-300"
              />
              レンジ内のみ
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={onlyApiError}
                onChange={(e) => setOnlyApiError(e.target.checked)}
                className="rounded border-gray-300"
              />
              API エラーのみ
            </label>
          </div>
        </section>

        <p className="mb-2 text-xs text-gray-500">
          表示 {nf.format(filtered.length)} / {nf.format(results.length)} 件
        </p>

        <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
          <span className="font-medium text-gray-700">入力列の色（実績・API 成功時）:</span>
          <span>
            <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5">緑</span>
            レンジ内かつ相対誤差 ≤ {INPUT_QUALITY_REL_WARN * 100}%
          </span>
          <span>
            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5">黄</span>
            レンジ内だが相対誤差 &gt; {INPUT_QUALITY_REL_WARN * 100}%
          </span>
          <span>
            <span className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5">赤</span>
            レンジ外
          </span>
          <span className="text-gray-500">実績なし・API 失敗はスレートのまま</span>
        </p>
        <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
          <span className="font-medium text-gray-700">列の見方:</span>
          <span>
            <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5">スレート</span>
            ＝ API 入力
          </span>
          <span>
            <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5">琥珀</span>
            ＝ 実績（落札）
          </span>
          <span>
            <span className="rounded border border-violet-200 bg-violet-100 px-1.5 py-0.5">紫</span>
            ＝ AI 予想
          </span>
          <span>
            <span className="rounded border border-rose-200 bg-rose-100 px-1.5 py-0.5">ローズ</span>
            ＝ 差分（実績−中心）
          </span>
          <span>
            <span className="rounded border border-cyan-200 bg-cyan-100 px-1.5 py-0.5">シアン</span>
            ＝ 業者入札レンジ（1〜5位の最小〜最大・万円）
          </span>
          <span className="text-gray-500">査定ID は管理画面を新しいタブで開きます</span>
        </p>

        {/* 縦スクロールはこの枠内。ヘッダー2行とも sticky で固定 */}
        <div className="max-h-[min(80vh,calc(100vh-10rem))] overflow-auto rounded-2xl border border-gray-200 shadow-sm">
          <table className="min-w-[1680px] w-full border-collapse text-left text-xs">
            <thead>
              <tr className={`text-[11px] font-semibold ${STICKY_GROUP_ROW_CLASS}`}>
                <th
                  rowSpan={2}
                  className="sticky top-0 z-[31] whitespace-nowrap border-b border-gray-200 bg-gray-100 px-2 py-2 align-middle text-gray-600 shadow-[0_1px_0_0_rgba(229,231,235,1)]"
                >
                  行
                </th>
                <th
                  rowSpan={2}
                  className="sticky top-0 z-[31] whitespace-nowrap border-b border-gray-200 bg-gray-100 px-2 py-2 align-middle text-gray-700 shadow-[0_1px_0_0_rgba(229,231,235,1)]"
                >
                  査定ID
                </th>
                <th
                  colSpan={4}
                  className={`sticky top-0 z-[31] border-b border-slate-200 border-l-2 border-l-slate-300 bg-slate-100 px-2 py-2 text-center text-slate-800 shadow-[0_1px_0_0_rgba(203,213,225,1)]`}
                  title="API に渡した条件"
                >
                  入力（API）
                </th>
                <th
                  rowSpan={2}
                  className="sticky top-0 z-[31] border-b border-amber-200 border-l-2 border-l-amber-400 bg-amber-100 px-2 py-2 align-middle text-right text-amber-950 shadow-[0_1px_0_0_rgba(253,230,138,1)]"
                  title="CSV 実績・落札（万円）"
                >
                  実績
                  <span className="mt-1 block text-[10px] font-bold leading-tight">落札（万円）</span>
                </th>
                <th
                  colSpan={4}
                  className="sticky top-0 z-[31] border-b border-cyan-200 border-l-2 border-l-cyan-400 bg-cyan-100 px-2 py-2 text-center text-cyan-950 shadow-[0_1px_0_0_rgba(165,243,252,1)]"
                  title="CSV 入札1〜5位（入札額・上限）から算出した最小〜最大（万円）"
                >
                  業者入札
                </th>
                <th
                  colSpan={3}
                  className="sticky top-0 z-[31] border-b border-violet-200 border-l-2 border-l-violet-400 bg-violet-100 px-2 py-2 text-center text-violet-950 shadow-[0_1px_0_0_rgba(196,181,253,1)]"
                >
                  AI予想
                </th>
                <th
                  rowSpan={2}
                  className="sticky top-0 z-[31] border-b border-rose-200 border-l-2 border-l-rose-400 bg-rose-100 px-2 py-2 align-middle text-right text-rose-950 shadow-[0_1px_0_0_rgba(254,205,211,1)]"
                  title="実績（万円）− 中心（万円）"
                >
                  差分
                  <span className="mt-1 block text-[10px] font-bold leading-tight">実績−中心</span>
                </th>
                <th
                  colSpan={6}
                  className="sticky top-0 z-[31] border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-gray-700 shadow-[0_1px_0_0_rgba(229,231,235,1)]"
                >
                  検証・メタ
                </th>
              </tr>
              <tr className="text-[11px] font-semibold">
                <th
                  className={`sticky top-11 z-[30] ${thInput} border-l-2 border-slate-300 shadow-[inset_0_1px_0_0_rgba(203,213,225,0.6)]`}
                  title="API 入力"
                >
                  メーカー
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thInput} shadow-[inset_0_1px_0_0_rgba(203,213,225,0.6)]`}
                  title="API 入力"
                >
                  車種
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thInput} shadow-[inset_0_1px_0_0_rgba(203,213,225,0.6)]`}
                  title="API 入力"
                >
                  年式
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thInput} text-right shadow-[inset_0_1px_0_0_rgba(203,213,225,0.6)]`}
                  title="API 入力"
                >
                  走行 km
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thBid} border-l-2 border-cyan-400 text-right shadow-[inset_0_1px_0_0_rgba(165,243,252,0.8)]`}
                  title="業者入札レンジ下限（万円）"
                >
                  下限
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thBid} text-right shadow-[inset_0_1px_0_0_rgba(165,243,252,0.8)]`}
                  title="業者入札レンジ上限（万円）"
                >
                  上限
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thBid} text-center shadow-[inset_0_1px_0_0_rgba(165,243,252,0.8)]`}
                  title="AI 予想中心が業者レンジ内"
                >
                  中心が
                  <br />
                  業者内
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thBid} text-center shadow-[inset_0_1px_0_0_rgba(165,243,252,0.8)]`}
                  title="AI 予想レンジと業者入札レンジが重なる"
                >
                  レンジ
                  <br />
                  重複
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thAi} border-l-2 border-violet-400 text-right shadow-[inset_0_1px_0_0_rgba(196,181,253,0.7)]`}
                  title="AI 予想の中心値（万円）"
                >
                  中心
                  <span className="mt-0.5 block text-[10px] font-bold text-violet-950">万円</span>
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thAi} text-right shadow-[inset_0_1px_0_0_rgba(196,181,253,0.7)]`}
                  title="AI 予想レンジ"
                >
                  レンジ
                  <span className="mt-0.5 block text-[10px] font-normal text-violet-900">万円</span>
                </th>
                <th
                  className={`sticky top-11 z-[30] ${thAi} text-center shadow-[inset_0_1px_0_0_rgba(196,181,253,0.7)]`}
                  title="信頼度"
                >
                  信頼度
                </th>
                <th className="sticky top-11 z-[30] whitespace-nowrap border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-gray-600 shadow-[inset_0_1px_0_0_rgba(229,231,235,0.9)]">
                  レンジ内
                </th>
                <th className="sticky top-11 z-[30] whitespace-nowrap border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-gray-600 shadow-[inset_0_1px_0_0_rgba(229,231,235,0.9)]">
                  落札&gt;中心
                </th>
                <th className="sticky top-11 z-[30] whitespace-nowrap border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-gray-600 shadow-[inset_0_1px_0_0_rgba(229,231,235,0.9)]">
                  事故歴
                </th>
                <th className="sticky top-11 z-[30] whitespace-nowrap border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-gray-600 shadow-[inset_0_1px_0_0_rgba(229,231,235,0.9)]">
                  修理歴
                </th>
                <th className="sticky top-11 z-[30] whitespace-nowrap border-b border-gray-200 bg-gray-50 px-2 py-2 text-center text-gray-600 shadow-[inset_0_1px_0_0_rgba(229,231,235,0.9)]">
                  API
                </th>
                <th className="sticky top-11 z-[30] min-w-[120px] border-b border-gray-200 bg-gray-50 px-2 py-2 text-gray-600 shadow-[inset_0_1px_0_0_rgba(229,231,235,0.9)]">
                  エラー
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {filtered.map((r) => {
                const ae = r.result?.auctionExpected;
                const rangeStr =
                  ae != null ? `${nf.format(ae.rangeMinMan)}〜${nf.format(ae.rangeMaxMan)}` : "—";
                const conf = r.result?.confidencePercent;
                const inputCls = inputColumnClasses(r);
                return (
                  <tr key={`${r.rowIndex}-${r.rowId ?? ""}`} className={!r.ok ? "bg-red-50/50" : undefined}>
                    <td className="whitespace-nowrap border-b border-gray-100 bg-white px-2 py-2.5 tabular-nums text-gray-500">
                      {r.rowIndex}
                    </td>
                    <td className="border-b border-gray-100 bg-white px-2 py-2.5 align-top">
                      <AssessmentIdCell rowId={r.rowId} />
                    </td>
                    <td className={inputCls.first} title={r.make}>
                      {r.make}
                    </td>
                    <td className={`${inputCls.base} max-w-[130px] truncate font-medium`} title={r.model}>
                      {r.model}
                    </td>
                    <td className={`${inputCls.base} tabular-nums`}>{r.year ?? "—"}</td>
                    <td className={`${inputCls.base} text-right tabular-nums`}>
                      {nf.format(Math.round(r.mileageKm))}
                    </td>
                    <td className={`${tdActual} border-l-2 border-amber-300 text-right align-middle`}>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-base font-bold tabular-nums text-amber-950">
                          {r.actualMan != null ? nf1.format(r.actualMan) : "—"}
                        </span>
                        {r.actualYen != null && (
                          <span className="text-[10px] font-normal text-amber-800/90 tabular-nums">
                            {nf.format(r.actualYen)} 円
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${tdBid} border-l-2 border-cyan-300 text-right tabular-nums text-cyan-950`}>
                      {r.bidRangeMinMan != null ? nf1.format(r.bidRangeMinMan) : "—"}
                    </td>
                    <td className={`${tdBid} text-right tabular-nums text-cyan-950`}>
                      {r.bidRangeMaxMan != null ? nf1.format(r.bidRangeMaxMan) : "—"}
                    </td>
                    <td className={`${tdBid} text-center`}>
                      <BadgeYesNo value={r.aiCenterInBidRange} />
                    </td>
                    <td className={`${tdBid} text-center`}>
                      <BadgeYesNo value={r.aiRangeOverlapsBidRange} />
                    </td>
                    <td className={`${tdAi} border-l-2 border-violet-300 text-right align-middle`}>
                      <span className="text-base font-bold tabular-nums text-violet-950">
                        {ae != null ? nf.format(ae.centerMan) : "—"}
                      </span>
                    </td>
                    <td className={`${tdAi} text-right text-[11px] text-violet-900 tabular-nums`}>{rangeStr}</td>
                    <td className={`${tdAi} text-center tabular-nums text-violet-900`}>
                      {conf != null ? `${conf}%` : "—"}
                    </td>
                    <td className={`${tdDiff} border-l-2 border-rose-300 text-right align-middle`}>
                      <DiffCell value={r.centerErrorMan} />
                    </td>
                    <td className="border-b border-gray-100 bg-white px-2 py-2 text-center">
                      <BadgeYesNo value={r.inRange} />
                    </td>
                    <td className="border-b border-gray-100 bg-white px-2 py-2 text-center">
                      <BadgeYesNo value={r.auctionAboveCenter} />
                    </td>
                    <td className="border-b border-gray-100 bg-white px-2 py-2 text-[11px]">
                      {r.accidentHistoryLabel ?? "—"}
                    </td>
                    <td className="border-b border-gray-100 bg-white px-2 py-2 text-[11px]">
                      {r.repairHistoryLabel ?? "—"}
                    </td>
                    <td className="border-b border-gray-100 bg-white px-2 py-2 text-center">
                      {r.ok ? (
                        <span className="text-emerald-700">成功</span>
                      ) : (
                        <span className="font-medium text-red-700">失敗</span>
                      )}
                    </td>
                    <td className="max-w-[200px] border-b border-gray-100 bg-white px-2 py-2 text-[11px] text-red-800" title={r.error}>
                      {r.error ?? ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
