import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-gray-100/80 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            写真2枚でKATIX相場を予想
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            車体写真とメーター写真をアップロードするだけで、
            AIがKATIXの落札予想相場を推定します。
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
        <p className="text-sm leading-relaxed text-gray-600">
          必要なのは車体写真とメーター写真の2枚。車台番号やメモがあるとより精度の高い予想が可能です。
          結果は参考値です。実際の落札価格は変動する可能性があります。
        </p>
      </div>

      <div className="flex justify-center">
        <Link
          href="/estimate"
          className="inline-flex rounded-xl bg-katix px-8 py-3.5 text-base font-semibold text-white shadow-card transition-shadow hover:bg-katix-dark hover:shadow-card-hover"
        >
          相場を予想する
        </Link>
      </div>
    </div>
  );
}
