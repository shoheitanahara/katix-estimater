"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateV4Card, EstimateV4Header, EstimateV4Hero } from "@/components/estimate-v4/v4-shell";
import { saveEstimateV4Input } from "@/components/estimate-v4/v4-storage";
import {
  ESTIMATE_V4_COLOR_FAMILIES,
  ESTIMATE_V4_MILEAGE_BANDS,
  ESTIMATE_V4_ORIGIN_TYPES,
  type EstimateV4ColorFamily,
  type EstimateV4MileageBand,
  type EstimateV4OriginType,
} from "@/lib/types";

function parseYear(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, "");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  const year = Math.round(n);
  if (year < 1980 || year > 2100) return null;
  return year;
}

export default function EstimateV4InputPage() {
  const router = useRouter();
  const [maker, setMaker] = useState("");
  const [carName, setCarName] = useState("");
  const [year, setYear] = useState("");
  const [mileageBand, setMileageBand] = useState<EstimateV4MileageBand | "">("");
  const [colorFamily, setColorFamily] = useState<EstimateV4ColorFamily | "">("");
  const [originType, setOriginType] = useState<EstimateV4OriginType>("domestic");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState<string | null>(null);

  const yearValue = useMemo(() => parseYear(year), [year]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedMaker = maker.trim();
    const trimmedCarName = carName.trim();
    const trimmedGrade = grade.trim();

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
    if (!mileageBand) {
      setError("走行距離区分を選択してください。");
      return;
    }
    if (!colorFamily) {
      setError("車体色系を選択してください。");
      return;
    }

    if (originType === "domestic" && trimmedGrade) {
      setError("国産車ではグレードは入力できません。");
      return;
    }

    try {
      saveEstimateV4Input({
        maker: trimmedMaker,
        carName: trimmedCarName,
        year: yearValue,
        mileageBand,
        colorFamily,
        originType,
        ...(originType === "import" && trimmedGrade ? { grade: trimmedGrade } : {}),
      });
    } catch {
      // sessionStorage が使えない場合は結果ページで再入力を促す
    }
    router.push("/estimate/v4/result");
  };

  return (
    <div className="bg-white">
      <EstimateV4Header />
      <EstimateV4Hero />

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="space-y-4">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  車の情報を入力（v4）
                </h1>
                <p className="text-sm leading-relaxed text-gray-600">
                  メーカー・車種・年式・走行距離区分・車体色系から買取相場を推定します。国産車は通常／最上位に加え全体レンジを表示し、輸入車はグレード入力がある場合そのグレード相場も出します。
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <EstimateV4Card>
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
                    <span className="block text-sm font-medium text-gray-700">国産／輸入</span>
                    <div className="mt-2 flex flex-wrap gap-4">
                      {ESTIMATE_V4_ORIGIN_TYPES.map((value) => (
                        <label key={value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name="originType"
                            value={value}
                            checked={originType === value}
                            onChange={() => {
                              setOriginType(value);
                              if (value === "domestic") setGrade("");
                            }}
                            className="border-gray-300 text-katix focus:ring-katix"
                          />
                          {value === "import" ? "輸入車" : "国産車"}
                        </label>
                      ))}
                    </div>
                  </div>

                  {originType === "import" && (
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
                        placeholder="例: 320i M Sport"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        輸入車はグレード差が大きいため、分かる場合は入力してください。未入力時は国産車と同様に全体レンジを表示します。
                      </p>
                    </div>
                  )}

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
                    <label htmlFor="mileageBand" className="block text-sm font-medium text-gray-700">
                      走行距離区分
                    </label>
                    <select
                      id="mileageBand"
                      name="mileageBand"
                      value={mileageBand}
                      onChange={(e) => setMileageBand(e.target.value as EstimateV4MileageBand | "")}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    >
                      <option value="">選択してください</option>
                      {ESTIMATE_V4_MILEAGE_BANDS.map((band) => (
                        <option key={band} value={band}>
                          {band}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      メーターの数値に近いものをお選びください（だいたいでOK）
                    </p>
                  </div>

                  <div>
                    <label htmlFor="colorFamily" className="block text-sm font-medium text-gray-700">
                      車体色系
                    </label>
                    <select
                      id="colorFamily"
                      name="colorFamily"
                      value={colorFamily}
                      onChange={(e) => setColorFamily(e.target.value as EstimateV4ColorFamily | "")}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                    >
                      <option value="">選択してください</option>
                      {ESTIMATE_V4_COLOR_FAMILIES.map((family) => (
                        <option key={family} value={family}>
                          {family}
                        </option>
                      ))}
                    </select>
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
              </EstimateV4Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
