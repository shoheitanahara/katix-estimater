import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-gray-100/80 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            KATIX相場予想ツール
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            写真（v1）またはテキスト入力（v2）で、業者オークション相場をベースに予想落札価格レンジを推定します。
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
        <p className="text-sm leading-relaxed text-gray-600">
          結果は参考値です。実際の落札価格は年式・グレード・状態・需給で変動します。
        </p>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          ※ v2 は公式サイトの実装イメージを意識した、UI/導線のサンプルページです（実運用の仕様とは異なる場合があります）。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/estimate"
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition hover:shadow-card-hover"
        >
          <p className="text-sm font-semibold text-gray-900">写真で相場を予想（v1）</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            車体写真＋メーター写真（または走行距離）から推定します。
          </p>
          <p className="mt-4 text-sm font-semibold text-katix">はじめる →</p>
        </Link>
        <Link
          href="/estimate/v2"
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition hover:shadow-card-hover"
        >
          <p className="text-sm font-semibold text-gray-900">テキストで相場を予想（v2）</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            メーカー/車種/年式/走行距離から、評点4〜5点想定で推定します。
          </p>
          <p className="mt-4 text-sm font-semibold text-katix">サンプルを見る →</p>
        </Link>
      </div>
    </div>
  );
}
