"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateV2Card, EstimateV2Header, EstimateV2Hero } from "@/components/estimate-v2/v2-shell";
import { saveEstimateV2Input } from "@/components/estimate-v2/v2-storage";

function parseMileageKm(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseYear(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  const year = Math.round(n);
  if (year < 1980 || year > 2100) return null;
  return year;
}

export default function EstimateV2InputPage() {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mileageKm = useMemo(() => parseMileageKm(mileage), [mileage]);
  const yearValue = useMemo(() => (year.trim() ? parseYear(year) : null), [year]);

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedMake = make.trim();
    const trimmedModel = model.trim();
    if (!trimmedMake) {
      setError("メーカーを入力してください。");
      return;
    }
    if (!trimmedModel) {
      setError("車種名を入力してください。");
      return;
    }
    if (year.trim() && yearValue === null) {
      setError("年式（西暦）を正しく入力してください。");
      return;
    }
    if (mileageKm === null) {
      setError("走行距離（km）を正しく入力してください。");
      return;
    }

    try {
      saveEstimateV2Input({
        make: trimmedMake,
        model: trimmedModel,
        ...(yearValue !== null ? { year: yearValue } : {}),
        mileageKm,
      });
    } catch {
      // sessionStorage が使えない場合は次ページで再入力を促す
    }
    router.push("/estimate/v2/email");
  };

  return (
    <div className="min-h-screen bg-white">
      <EstimateV2Header />
      <EstimateV2Hero />

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="space-y-4">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  車の情報を入力
                </h1>
                <p className="text-sm leading-relaxed text-gray-600">
                  メーカー・車種名・年式（任意）・走行距離から、オークション評点4〜5点想定の予想落札価格を推定します。
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <EstimateV2Card>
                <form onSubmit={handleNext} className="space-y-5">
                  <div>
                    <label htmlFor="make" className="block text-sm font-medium text-gray-700">
                      メーカー
                    </label>
                    <input
                      id="make"
                      name="make"
                      type="text"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="例: トヨタ / Mercedes"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                  </div>

                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                      車種名
                    </label>
                    <input
                      id="model"
                      name="model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="例: プリウス / Sクラス"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                      年式（西暦・任意）
                    </label>
                    <input
                      id="year"
                      name="year"
                      inputMode="numeric"
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="例: 2015"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                    <p className="mt-1 text-xs text-gray-500">分かる場合のみ入力してください。</p>
                  </div>

                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
                      走行距離（km）
                    </label>
                    <input
                      id="mileage"
                      name="mileage"
                      inputMode="numeric"
                      type="text"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="例: 42000"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      だいたいでOKです。カンマ区切り（例: 42,000）でも入力できます。
                    </p>
                  </div>

                  {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                  <button
                    type="submit"
                    className="mt-2 flex w-full items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-gray-800"
                  >
                    次へ
                    <span className="ml-2 text-base leading-none">→</span>
                  </button>
                </form>
              </EstimateV2Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

