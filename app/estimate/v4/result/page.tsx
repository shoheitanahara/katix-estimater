"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EstimateV4Card, EstimateV4Header } from "@/components/estimate-v4/v4-shell";
import { loadEstimateV4Input } from "@/components/estimate-v4/v4-storage";
import type {
  EstimateV4ApiResponse,
  EstimateV4Confidence,
  EstimateV4FocusBand,
  EstimateV4GradeBand,
  EstimateV4LowPriceMarketType,
  EstimateV4Result,
} from "@/lib/types";

function formatYenFromMan(man: number): string {
  const yen = Math.max(0, Math.round(man)) * 10_000;
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(yen);
}

function formatMan(man: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.round(man)))}万円`;
}

function confidenceLabel(confidence: EstimateV4Confidence): string {
  switch (confidence) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

function marketTypeLabel(type: EstimateV4LowPriceMarketType): string {
  switch (type) {
    case "normal_floor":
      return "通常底値帯";
    case "export_demand":
      return "輸出需要";
    case "commercial_demand":
      return "商用需要";
    case "rare":
      return "希少車";
    case "unclear":
      return "判定不明";
  }
}

function FocusSection(props: { focus: EstimateV4FocusBand }) {
  const { focus } = props;
  const isOverall = focus.kind === "overall";

  return (
    <section className="rounded-2xl border-2 border-katix/25 bg-katix-light/40 p-4 ring-1 ring-katix/15 sm:p-5 md:col-span-2">
      <h2 className="text-sm font-semibold text-gray-900">
        {isOverall ? "全体相場" : "指定グレード相場"}
      </h2>
      <p className="mt-1 text-xs text-gray-600">
        {isOverall
          ? "通常グレード帯の下限から最上位グレード帯の上限までの参考レンジです。"
          : `${focus.label} を前提にした買取相場です。`}
      </p>

      {focus.priceRange === null ? (
        <p className="mt-4 text-sm font-medium text-amber-800">相場レンジを表示できませんでした。</p>
      ) : isOverall ? (
        <p className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900">
          {formatMan(focus.priceRange.min)}〜{formatMan(focus.priceRange.max)}
        </p>
      ) : focus.buyPrice === null ? (
        <p className="mt-4 text-sm font-medium text-amber-800">買取相場を推定できませんでした。</p>
      ) : (
        <>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900">
            {formatYenFromMan(focus.buyPrice)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{formatMan(focus.buyPrice)}</span>
            <span className="text-gray-300">|</span>
            <span>
              レンジ: {formatMan(focus.priceRange.min)}〜{formatMan(focus.priceRange.max)}
            </span>
            {focus.retailPrice !== null && (
              <>
                <span className="text-gray-300">|</span>
                <span>小売参考: {formatMan(focus.retailPrice)}</span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function GradeBandSection(props: { title: string; description: string; band: EstimateV4GradeBand }) {
  const { title, description, band } = props;

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{description}</p>

      {band.buyPrice === null || band.priceRange === null ? (
        <p className="mt-4 text-sm font-medium text-amber-800">買取相場を推定できませんでした。</p>
      ) : (
        <>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900">
            {formatYenFromMan(band.buyPrice)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{formatMan(band.buyPrice)}</span>
            <span className="text-gray-300">|</span>
            <span>
              レンジ: {formatMan(band.priceRange.min)}〜{formatMan(band.priceRange.max)}
            </span>
            {band.retailPrice !== null && (
              <>
                <span className="text-gray-300">|</span>
                <span>小売参考: {formatMan(band.retailPrice)}</span>
              </>
            )}
          </div>
        </>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500">含まれるおおよそのグレード</p>
        {band.grades.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {band.grades.map((grade) => (
              <li
                key={grade}
                className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-800 ring-1 ring-gray-100"
              >
                {grade}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-gray-500">グレード例なし</p>
        )}
      </div>
    </section>
  );
}

export default function EstimateV4ResultPage() {
  const input = useMemo(() => (typeof window === "undefined" ? null : loadEstimateV4Input()), []);

  const [result, setResult] = useState<EstimateV4Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);

  useEffect(() => {
    if (!input) {
      setLoading(false);
      setError("入力情報が見つかりません。最初からやり直してください。");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    fetch("/api/estimate-v4", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
      .then(async (res) => {
        const data = (await res.json()) as EstimateV4ApiResponse;
        if (!res.ok || !data.ok) {
          setError(!data.ok ? data.error : "相場予想に失敗しました。");
          return;
        }
        setResult(data.result);
      })
      .catch(() => setError("通信エラーが発生しました。しばらくしてからお試しください。"))
      .finally(() => setLoading(false));
  }, [input, retrySeed]);

  return (
    <div className="bg-white">
      <EstimateV4Header
        maker={input?.maker}
        carName={input?.carName}
        year={input?.year}
        mileageBand={input?.mileageBand}
        colorFamily={input?.colorFamily}
        originType={input?.originType}
        grade={input?.grade}
      />

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                買取相場の推定結果（v4）
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                通常グレード帯と最上位グレード帯の参考買取価格です。実際の買取額は状態・需給で変動します。
              </p>
            </div>

            <EstimateV4Card>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-katix border-t-transparent" />
                  <p className="mt-5 text-sm font-medium text-gray-600">相場を調査・推定しています…</p>
                  <p className="mt-1 text-xs text-gray-500">Web検索を含むため、数十秒かかることがあります。</p>
                </div>
              ) : error || !result ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
                    {error ?? "相場予想結果の取得に失敗しました。"}
                  </div>
                  {input && (
                    <button
                      type="button"
                      onClick={() => setRetrySeed((x) => x + 1)}
                      className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-gray-800"
                    >
                      同じ条件で再実行
                    </button>
                  )}
                  <Link
                    href="/estimate/v4"
                    className="inline-flex rounded-xl bg-katix px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-katix-dark"
                  >
                    入力ページへ戻る
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  <FocusSection focus={result.focus} />

                  <GradeBandSection
                    title="通常"
                    description="標準〜中位寄りのグレードを想定した買取相場"
                    band={result.standard}
                  />
                  <GradeBandSection
                    title="最上位"
                    description="最上位・高性能・特別仕様寄りのグレードを想定した買取相場"
                    band={result.top}
                  />

                  <section className="rounded-2xl bg-katix-light/60 p-4 ring-1 ring-katix/15 sm:p-5">
                    <h2 className="text-sm font-semibold text-gray-900">推定メタ情報</h2>
                    <dl className="mt-4 space-y-3 text-sm text-gray-700">
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">自信度</dt>
                        <dd className="font-medium text-gray-900">{confidenceLabel(result.confidence)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">低価格検算</dt>
                        <dd className="font-medium text-gray-900">
                          {result.lowPriceCheckUsed ? "実施" : "未実施"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">市場タイプ</dt>
                        <dd className="font-medium text-gray-900">
                          {marketTypeLabel(result.lowPriceMarketType)}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 shadow-sm sm:p-5">
                    <h2 className="text-sm font-semibold text-gray-900">推定根拠</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {result.reasoning}
                    </p>
                  </section>

                  {result.sources.length > 0 && (
                    <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 shadow-sm sm:p-5 md:col-span-2">
                      <h2 className="text-sm font-semibold text-gray-900">参考情報源</h2>
                      <ul className="mt-3 space-y-3">
                        {result.sources.map((source) => (
                          <li key={`${source.sourceName}-${source.url}`} className="text-sm text-gray-700">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-katix hover:underline"
                            >
                              {source.sourceName}
                            </a>
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">{source.checkedData}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="md:col-span-2">
                    <Link
                      href="/estimate/v4"
                      className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-gray-800"
                    >
                      最初からやり直す
                      <span className="ml-2 text-base leading-none">→</span>
                    </Link>
                  </div>
                </div>
              )}
            </EstimateV4Card>
          </div>
        </div>
      </main>
    </div>
  );
}
