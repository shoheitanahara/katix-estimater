"use client";

import { useState } from "react";
import type { EstimateResult } from "@/lib/types";
import type { EstimateInput } from "@/lib/store";

/** 結果表示用に一時保存した画像（base64）。メーターは手入力走行距離の場合は無い場合あり */
export interface ResultImages {
  exterior: string;
  meter?: string | null;
}

interface ResultCardProps {
  result: EstimateResult;
  images?: ResultImages | null;
  /** 査定に使用した付帯情報（グレード・車体番号・メモ・走行距離）。表示と再査定フォームの初期値に使用 */
  input?: EstimateInput | null;
}

function Section({
  title,
  children,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-card transition-shadow sm:p-6 ${
        muted ? "border border-gray-100" : "border border-gray-100/80"
      }`}
    >
      <h2
        className={`mb-4 text-sm font-semibold tracking-wide ${
          muted ? "text-gray-400" : "text-gray-700"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function DlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

/** base64 を data URL に変換（プレフィックスが無い場合のみ） */
function toDataUrl(base64: string, mime = "image/jpeg"): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
}

/** KATIX 相場カード：落札予想を主役に、最低保証は補足 */
function KatixPriceCard({
  label,
  rangeMin,
  rangeMax,
  guarantee,
}: {
  label: string;
  rangeMin: number;
  rangeMax: number;
  guarantee: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-100/80 transition-shadow hover:shadow-card-hover sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-katix-dark sm:text-4xl">
        {rangeMin}
        <span className="mx-1 font-normal text-gray-400">〜</span>
        {rangeMax}
        <span className="ml-1 text-xl font-semibold text-gray-600 sm:text-2xl">万円</span>
      </p>
      <p className="mt-2 text-xs text-gray-500">
        最低保証 {guarantee}万円
      </p>
    </div>
  );
}

/** 万円を円にし、3桁カンマ付きで表示（例: 215 → 2,150,000） */
function formatYenFromMan(man: number): string {
  return (man * 10000).toLocaleString("ja-JP") + "円";
}

export function ResultCard({ result, images, input }: ResultCardProps) {
  const { vehicleEstimate, auctionMarket, katixPrediction, priceFactors, comment, confidencePercent, expectedBuybackMan, minimumGuaranteeMan } =
    result;
  const v = vehicleEstimate;
  const kGood = katixPrediction.goodCondition;
  const kUsed = katixPrediction.usedCondition;
  const [copyStatus, setCopyStatus] = useState<"idle" | "ok" | "error">("idle");

  const buildMemoText = (): string => {
    const upsideText =
      priceFactors.upside.length > 0 ? priceFactors.upside.join(" / ") : "なし";
    const downsideText =
      priceFactors.downside.length > 0 ? priceFactors.downside.join(" / ") : "なし";

    return [
      "【KATIX相場予想メモ】",
      ...(confidencePercent != null ? [`予想精度: ${confidencePercent}%`] : []),
      ...(expectedBuybackMan != null && expectedBuybackMan >= 0
        ? [`予想買取金額: ${formatYenFromMan(expectedBuybackMan)}`]
        : []),
      ...(minimumGuaranteeMan != null && minimumGuaranteeMan >= 0
        ? [`最低保証価格: ${formatYenFromMan(minimumGuaranteeMan)}`]
        : []),
      `車種: ${`${v.make} ${v.model}`.trim() || v.model || "不明"}`,
      `世代（型式）: ${v.generation || "不明"}`,
      `年式推定: ${v.yearEstimate || "不明"}`,
      `走行距離: ${v.mileage || "不明"}`,
      `グレード推定: ${v.gradeEstimate || "不明"}`,
      `業者オークション評点: ${v.conditionScore || "不明"}`,
      "",
      "■ KATIX相場予想",
      `美車: ${kGood.rangeMinMan}〜${kGood.rangeMaxMan}万円（最低保証 ${kGood.guaranteeMan}万円）`,
      `使用感あり: ${kUsed.rangeMinMan}〜${kUsed.rangeMaxMan}万円（最低保証 ${kUsed.guaranteeMan}万円）`,
      "",
      `参考オークション相場: ${auctionMarket.rangeMinMan}〜${auctionMarket.rangeMaxMan}万円`,
      `上振れ要因: ${upsideText}`,
      `下振れ要因: ${downsideText}`,
      "",
      `コメント: ${comment || "なし"}`,
    ].join("\n");
  };

  const handleCopyMemo = async (): Promise<void> => {
    const memo = buildMemoText();
    try {
      await navigator.clipboard.writeText(memo);
      setCopyStatus("ok");
    } catch {
      setCopyStatus("error");
    }

    window.setTimeout(() => {
      setCopyStatus("idle");
    }, 2200);
  };

  return (
    <div className="space-y-6">
      {/* 査定に使用した情報：画像＋付帯情報 */}
      {images?.exterior && (
        <Section title="査定に使用した情報">
          <div className={`grid gap-4 ${images.meter ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-400">車体写真</p>
              <img
                src={toDataUrl(images.exterior)}
                alt="車体"
                className="max-h-40 w-full rounded-xl border border-gray-100 object-cover object-center"
              />
            </div>
            {images.meter ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-400">メーター写真</p>
                <img
                  src={toDataUrl(images.meter)}
                  alt="メーター"
                  className="max-h-40 w-full rounded-xl border border-gray-100 object-cover object-center"
                />
              </div>
            ) : (
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-400">メーター写真</p>
                <p className="rounded-xl border border-gray-100 bg-gray-50 py-8 text-center text-sm text-gray-400">
                  手入力の走行距離で査定
                </p>
              </div>
            )}
          </div>
          <dl className="mt-4 space-y-0 border-t border-gray-100 pt-4">
            <DlRow label="走行距離（手入力）" value={input?.mileage?.trim() ?? ""} />
            <DlRow label="グレード" value={input?.grade?.trim() ?? ""} />
            <DlRow label="車台番号" value={input?.vin?.trim() ?? ""} />
            <DlRow label="メモ" value={input?.memo?.trim() ?? ""} />
          </dl>
        </Section>
      )}

      <Section title="車両推定">
        <dl className="space-y-0">
          <DlRow label="車種" value={`${v.make} ${v.model}`.trim() || v.model} />
          <DlRow label="世代（型式）" value={v.generation} />
          <DlRow label="年式推定" value={v.yearEstimate} />
          <DlRow label="走行距離" value={v.mileage} />
          <DlRow label="グレード推定" value={v.gradeEstimate} />
          <DlRow label="ボディカラー" value={v.bodyColor} />
          <DlRow label="業者オークション評点（6点満点）" value={v.conditionScore} />
          <DlRow label="状態評価" value={v.condition} />
        </dl>
      </Section>

      {/* KATIX 相場予想：落札予想を主役に */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-katix-light to-white p-6 shadow-card ring-1 ring-katix/10 sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-katix/15 px-2.5 py-0.5 text-xs font-semibold text-katix-dark">
              KATIX
            </span>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">
              相場予想
            </h2>
            {confidencePercent != null && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                title="情報量・参考オークションデータに基づく予想の自信度です"
              >
                予想精度: {confidencePercent}%
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopyMemo}
            className="rounded-lg bg-katix px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-katix-dark"
          >
            相場結果をコピー
          </button>
        </div>
        {copyStatus === "ok" && (
          <p className="mb-3 text-xs font-medium text-katix-dark">
            コピーしました。内部メモにそのまま貼り付けできます。
          </p>
        )}
        {copyStatus === "error" && (
          <p className="mb-3 text-xs font-medium text-red-600">
            コピーに失敗しました。ブラウザの権限をご確認ください。
          </p>
        )}
        <p className="mb-4 text-xs text-gray-500">
          本予想はAIの学習に基づく参考値です。特定のオークション実データ・時期・件数には基づいていません。
        </p>
        {(expectedBuybackMan != null && expectedBuybackMan >= 0) || (minimumGuaranteeMan != null && minimumGuaranteeMan >= 0) ? (
          <div className="mb-6 grid gap-4 rounded-2xl border-2 border-katix/20 bg-white p-5 ring-1 ring-katix/10 sm:grid-cols-2 sm:p-6">
            {expectedBuybackMan != null && expectedBuybackMan >= 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  予想買取金額
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-katix-dark sm:text-3xl">
                  {formatYenFromMan(expectedBuybackMan)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  評価点に基づく1万円単位の目安です。
                </p>
              </div>
            )}
            {minimumGuaranteeMan != null && minimumGuaranteeMan >= 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  最低保証価格
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
                  {formatYenFromMan(minimumGuaranteeMan)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  評点の下限をベースに安全めに見積もった最低額です。
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 sm:col-span-2">
              実際の査定では変動する場合があります。
            </p>
          </div>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <KatixPriceCard
            label="美車（評価4〜4.5）"
            rangeMin={kGood.rangeMinMan}
            rangeMax={kGood.rangeMaxMan}
            guarantee={kGood.guaranteeMan}
          />
          <KatixPriceCard
            label="使用感あり（評価3〜3.5）"
            rangeMin={kUsed.rangeMinMan}
            rangeMax={kUsed.rangeMaxMan}
            guarantee={kUsed.guaranteeMan}
          />
        </div>
      </section>

      {/* 業者オークション相場：控えめ */}
      <Section title="業者オークション相場（参考）" muted>
        <p className="text-sm text-gray-500">
          {auctionMarket.rangeMinMan}万円 〜 {auctionMarket.rangeMaxMan}万円
        </p>
      </Section>

      <Section title="価格変動の可能性">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-katix-dark">
              上振れ可能性
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {priceFactors.upside.length > 0
                ? priceFactors.upside.map((item, i) => <li key={i}>・{item}</li>)
                : <li className="text-gray-400">—</li>}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              下振れ可能性
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {priceFactors.downside.length > 0
                ? priceFactors.downside.map((item, i) => <li key={i}>・{item}</li>)
                : <li className="text-gray-400">—</li>}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="総合コメント">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {comment || "—"}
        </p>
      </Section>
    </div>
  );
}
