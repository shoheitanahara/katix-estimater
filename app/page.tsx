import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-gray-100/80 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            KATIX AI相場予想
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            写真またはお車の基本情報から、KATIX独自のAI相場予想（参考の落札価格レンジ）をお届けします。算出には業者オークション相場なども参考にしています。
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
        <p className="text-sm leading-relaxed text-gray-600">
          結果は参考値です。実際の落札価格は年式・グレード・状態・需給で変動します。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/estimate"
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition hover:shadow-card-hover"
        >
          <p className="text-sm font-semibold text-gray-900">写真から相場を予想</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            車体写真＋メーター写真（または走行距離）から推定します。
          </p>
          <p className="mt-4 text-sm font-semibold text-katix">はじめる →</p>
        </Link>
        <Link
          href="/estimate/v2"
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition hover:shadow-card-hover"
        >
          <p className="text-sm font-semibold text-gray-900">テキストから相場を予想</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            メーカー・車種・年式・走行距離から、美車〜良質車相当を想定した参考レンジを表示します。
          </p>
          <p className="mt-4 text-sm font-semibold text-katix">はじめる →</p>
        </Link>
      </div>

      <p className="text-center text-[10px] leading-relaxed text-gray-400">
        ※テキスト入力の画面は検証用の構成を含みます（v1 / v2 の表記は開発時の整理用です）。
      </p>
    </div>
  );
}
