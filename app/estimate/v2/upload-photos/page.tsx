"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { V2AfterStepper } from "@/components/estimate-v2/after-stepper";
import { UploadSlotMock } from "@/components/estimate-v2/upload-slot-mock";
import { EstimateV2Header } from "@/components/estimate-v2/v2-shell";
import { loadEstimateV2Input } from "@/components/estimate-v2/v2-storage";

export default function EstimateV2UploadPhotosMockPage() {
  const router = useRouter();
  const input = useMemo(() => (typeof window === "undefined" ? null : loadEstimateV2Input()), []);

  const title = input
    ? `${input.make} ${input.model}`
    : "お車";

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <EstimateV2Header
        make={input?.make}
        model={input?.model}
        year={input?.year}
        mileageKm={input?.mileageKm}
      />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-6xl sm:px-6">
        <div className="mb-6">
          <V2AfterStepper active={1} />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-100 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">必要な写真</p>
              <p className="mt-1 text-xs text-gray-600">
                各枠をタップすると端末の写真選択が開きます。プレビューはブラウザ内のみで、サーバーには送信しません。
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: "rgb(64 162 96)" }}
            >
              撮影ガイド（モック）
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-black px-4 py-3 text-center text-sm font-semibold text-white">
          {title} の写真をアップロード
        </div>

        <section className="mt-6 space-y-6">
          <CategoryBlock title="外装">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <UploadSlotMock slotId="exterior-fl" label="左前" />
              <UploadSlotMock slotId="exterior-fr" label="右前" />
              <UploadSlotMock slotId="exterior-rl" label="左後" />
              <UploadSlotMock slotId="exterior-rr" label="右後" />
            </div>
          </CategoryBlock>

          <CategoryBlock title="内装">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <UploadSlotMock slotId="interior-meter" label="メーター" />
              <UploadSlotMock slotId="interior-seat" label="シート" />
              <UploadSlotMock slotId="interior-nav" label="ナビ周り" />
            </div>
          </CategoryBlock>

          <CategoryBlock title="その他">
            <div className="grid grid-cols-2 gap-3">
              <UploadSlotMock slotId="other-damage" label="傷・へこみ" hint="近くから" />
              <UploadSlotMock slotId="other-free" label="自由" hint="追加で伝えたい箇所" />
            </div>
          </CategoryBlock>

          <CategoryBlock title="書類">
            <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
              <UploadSlotMock slotId="doc-shaken" label="車検証" />
            </div>
          </CategoryBlock>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-100 sm:p-6">
          <p className="text-sm font-semibold text-gray-900">撮影のコツ（例）</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold text-emerald-800">良い例</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-700">
                明るい場所・ピントが合っている・文字が読める距離。
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <p className="text-xs font-semibold text-rose-800">避けたい例</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-700">
                暗い・ブレ・反射で文字が読めない。
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 pb-10 sm:flex-row sm:justify-end">
          <Link
            href="/estimate/v2/result"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            相場結果に戻る
          </Link>
          <button
            type="button"
            onClick={() => router.push("/estimate/v2/upload-photos/vehicle")}
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
            style={{ backgroundColor: "rgb(64 162 96)" }}
          >
            次へ（車両情報）
            <span className="ml-2">→</span>
          </button>
        </div>
      </main>
    </div>
  );
}

function CategoryBlock(props: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-gray-900">{props.title}</h2>
      {props.children}
    </div>
  );
}
