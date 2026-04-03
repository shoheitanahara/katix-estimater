import Link from "next/link";
import { EstimateV2Header } from "@/components/estimate-v2/v2-shell";

export default function EstimateV2AfterCompletePage() {
  return (
    <div className="bg-[#f5f5f5]">
      <EstimateV2Header />

      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-gray-100">
          <p className="text-sm font-semibold text-gray-900">入力完了</p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            写真・車両情報の入力はここまでです。内容の保存や査定連携は、本番リリース時の仕様に準じます。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/estimate/v2/result"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              相場結果を見る
            </Link>
            <Link
              href="/estimate/v2"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
              style={{ backgroundColor: "rgb(64 162 96)" }}
            >
              テキスト査定のトップへ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
