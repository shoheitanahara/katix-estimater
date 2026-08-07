"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateV3Card, EstimateV3Header, EstimateV3Hero } from "@/components/estimate-v3/v3-shell";
import { saveEstimateV3Input } from "@/components/estimate-v3/v3-storage";

function parseMileage(raw: string): number | null {
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

export default function EstimateV3InputPage() {
  const router = useRouter();
  const [maker, setMaker] = useState("");
  const [carName, setCarName] = useState("");
  const [year, setYear] = useState("");
  const [grade, setGrade] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [formInfo, setFormInfo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mileageValue = useMemo(() => parseMileage(mileage), [mileage]);
  const yearValue = useMemo(() => parseYear(year), [year]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedMaker = maker.trim();
    const trimmedCarName = carName.trim();
    const trimmedGrade = grade.trim();
    const trimmedColor = color.trim();
    const trimmedFormInfo = formInfo.trim();

    if (!trimmedMaker) {
      setError("メーカーを入力してください。");
      return;
    }
    if (!trimmedCarName) {
      setError("車種を入力してください。");
      return;
    }
    if (yearValue === null) {
      setError("年式（西暦）を正しく入力してください。");
      return;
    }
    if (mileageValue === null) {
      setError("走行距離（km）を正しく入力してください。");
      return;
    }

    try {
      saveEstimateV3Input({
        maker: trimmedMaker,
        carName: trimmedCarName,
        year: yearValue,
        mileage: mileageValue,
        ...(trimmedGrade ? { grade: trimmedGrade } : {}),
        ...(trimmedColor ? { color: trimmedColor } : {}),
        ...(trimmedFormInfo ? { formInfo: trimmedFormInfo } : {}),
      });
    } catch {
      // sessionStorage が使えない場合は結果ページで再入力を促す
    }
    router.push("/estimate/v3/result");
  };

  return (
    <div className="bg-white">
      <EstimateV3Header />
      <EstimateV3Hero />

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="space-y-4">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  車の情報を入力（v3）
                </h1>
                <p className="text-sm leading-relaxed text-gray-600">
                  メーカー・車種・年式・走行距離などから、現在の日本市場で成立しうる買取価格を推定します。市場調査にはWeb検索を用います。
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <EstimateV3Card>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="maker" className="block text-sm font-medium text-gray-700">
                      メーカー
                    </label>
                    <input
                      id="maker"
                      name="maker"
                      type="text"
                      value={maker}
                      onChange={(e) => setMaker(e.target.value)}
                      placeholder="例: トヨタ"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                  </div>

                  <div>
                    <label htmlFor="carName" className="block text-sm font-medium text-gray-700">
                      車種
                    </label>
                    <input
                      id="carName"
                      name="carName"
                      type="text"
                      value={carName}
                      onChange={(e) => setCarName(e.target.value)}
                      placeholder="例: プリウス"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                      年式（西暦）
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
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                      グレード（任意）
                    </label>
                    <input
                      id="grade"
                      name="grade"
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="例: S / G / 不明なら空欄"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                    <p className="mt-1 text-xs text-gray-500">未入力の場合は「不明」として扱います。</p>
                  </div>

                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                      色（任意）
                    </label>
                    <input
                      id="color"
                      name="color"
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="例: ホワイトパール"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                    <p className="mt-1 text-xs text-gray-500">未入力の場合は「不明」として扱います。</p>
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

                  <div>
                    <label htmlFor="formInfo" className="block text-sm font-medium text-gray-700">
                      設問フォーム情報（任意）
                    </label>
                    <textarea
                      id="formInfo"
                      name="formInfo"
                      rows={4}
                      value={formInfo}
                      onChange={(e) => setFormInfo(e.target.value)}
                      placeholder={`例:\n・修復歴なし\n・警告灯なし\n・キー2本\n・エアコン作動不良あり`}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      修復歴・機関不具合・電装不具合・広範な外装損傷・キー本数不足など、明確な状態差があれば記入してください。未入力は標準状態として扱います。
                    </p>
                  </div>

                  {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                  <button
                    type="submit"
                    className="mt-2 flex w-full items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-gray-800"
                  >
                    買取相場を推定
                    <span className="ml-2 text-base leading-none">→</span>
                  </button>
                </form>
              </EstimateV3Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
