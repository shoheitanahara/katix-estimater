"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EstimateV2Card, EstimateV2Header } from "@/components/estimate-v2/v2-shell";
import { loadEstimateV2Email, loadEstimateV2Input } from "@/components/estimate-v2/v2-storage";
import type { EstimateV2ApiResponse, EstimateV2Result } from "@/lib/types";

function CheckCircleIcon() {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-katix text-white">
      <svg
        viewBox="0 0 20 20"
        width="14"
        height="14"
        aria-hidden="true"
        className="block"
      >
        <path
          d="M7.9 13.4 4.7 10.2a.9.9 0 0 1 1.3-1.3l2.1 2.1 5-5a.9.9 0 1 1 1.3 1.3l-5.7 5.7a.9.9 0 0 1-1.3 0Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function formatYenFromMan(man: number): string {
  const yen = Math.max(0, Math.round(man)) * 10_000;
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(yen);
}

function formatMan(man: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.round(man)))}万円`;
}

export default function EstimateV2ResultPage() {
  const input = useMemo(() => (typeof window === "undefined" ? null : loadEstimateV2Input()), []);
  const email = useMemo(() => (typeof window === "undefined" ? null : loadEstimateV2Email()), []);

  const [result, setResult] = useState<EstimateV2Result | null>(null);
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
    fetch("/api/estimate-v2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
      .then(async (res) => {
        const data = (await res.json()) as EstimateV2ApiResponse;
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
    <div className="min-h-screen bg-white">
      <EstimateV2Header make={input?.make} model={input?.model} year={input?.year} mileageKm={input?.mileageKm} />

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  相場予想（v2）
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  オークション評点4〜5点を想定した予想落札価格です。
                </p>
                {email && (
                  <p className="mt-2 text-xs text-gray-500">
                    登録メール（モック）: <span className="font-medium text-gray-700">{email}</span>
                  </p>
                )}
              </div>
              <Link
                href="/estimate/v2"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                最初からやり直す
              </Link>
            </div>

            <EstimateV2Card>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-katix border-t-transparent" />
                <p className="mt-5 text-sm font-medium text-gray-600">相場を予想しています…</p>
                <p className="mt-1 text-xs text-gray-500">メーカー/車種/走行距離から推定します。</p>
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
                  href="/estimate/v2"
                  className="inline-flex rounded-xl bg-katix px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-katix-dark"
                >
                  入力ページへ戻る
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <section className="rounded-2xl bg-katix-light/60 p-4 ring-1 ring-katix/15 sm:p-5">
                  <h2 className="text-sm font-semibold text-gray-900">KATIX相場予想の見方</h2>
                  <ul className="mt-4 space-y-4 text-sm text-gray-700">
                    <li className="flex gap-3">
                      <CheckCircleIcon />
                      <div>
                        <p className="font-semibold text-gray-900">相場は保守的に</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          評点4〜5点想定でも、条件不明分は上振れを控えめにしてレンジを出します。
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <CheckCircleIcon />
                      <div>
                        <p className="font-semibold text-gray-900">走行距離を強く反映</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          年間10,000〜12,000kmを一般的な平均走行距離の目安として、実走行距離が多い/少ない分を相場に反映します。
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <CheckCircleIcon />
                      <div>
                        <p className="font-semibold text-gray-900">結果は参考値</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                          実際の落札は年式/グレード/地域/需給で変動します。
                        </p>
                      </div>
                    </li>
                  </ul>
                </section>

                <section className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 shadow-sm sm:p-5">
                  <h2 className="text-sm font-semibold text-gray-900">予想落札価格（中心値）</h2>
                  <p className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900">
                    {formatYenFromMan(result.auctionExpected.centerMan)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">{formatMan(result.auctionExpected.centerMan)}</span>
                    <span className="text-gray-300">|</span>
                    <span>
                      レンジ: {formatMan(result.auctionExpected.rangeMinMan)}〜{formatMan(result.auctionExpected.rangeMaxMan)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 ring-1 ring-gray-100">
                    <p className="font-semibold text-gray-900">AIコメント</p>
                    <p className="mt-2 whitespace-pre-line leading-relaxed">{result.comment}</p>
                    <p className="mt-3 text-xs text-gray-500">
                      自信度:{" "}
                      <span className="font-medium text-gray-700">
                        {result.confidencePercent ?? "—"}%
                      </span>
                      {" / "}
                      前提:{" "}
                      <span className="font-medium text-gray-700">
                        {result.assumption.auctionScore}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    <Link
                      href="/estimate/v2"
                      className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-gray-800"
                    >
                      入力をやり直す
                      <span className="ml-2 text-base leading-none">→</span>
                    </Link>
                    <p className="text-xs leading-relaxed text-gray-500">
                      {result.assumption.notes}
                    </p>
                  </div>
                </section>
              </div>
            )}
            </EstimateV2Card>
          </div>
        </div>
      </main>
    </div>
  );
}

