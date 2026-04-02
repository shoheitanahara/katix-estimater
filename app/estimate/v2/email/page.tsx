"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EstimateV2Card, EstimateV2Header } from "@/components/estimate-v2/v2-shell";
import { loadEstimateV2Input, saveEstimateV2Email } from "@/components/estimate-v2/v2-storage";

function isLikelyEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  // モックなので厳密すぎない判定（最低限 @ とドメイン）
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function EstimateV2EmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useMemo(() => (typeof window === "undefined" ? null : loadEstimateV2Input()), []);

  useEffect(() => {
    if (!input) return;
  }, [input]);

  const handleContinue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!input) {
      setError("入力情報が見つかりません。最初からやり直してください。");
      return;
    }
    if (!isLikelyEmail(email)) {
      setError("メールアドレスを正しく入力してください。");
      return;
    }

    try {
      saveEstimateV2Email(email.trim());
    } catch {
      // sessionStorage が使えない場合でも結果ページへ（メールはモックなので致命ではない）
    }
    router.push("/estimate/v2/result");
  };

  return (
    <div className="min-h-screen bg-white">
      <EstimateV2Header make={input?.make} model={input?.model} year={input?.year} mileageKm={input?.mileageKm} />

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-xl space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                メールを登録して続行
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                ここはモックです（実際の送信や認証は行いません）。
              </p>
            </div>

            <EstimateV2Card>
              <form onSubmit={handleContinue} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
                />
              </div>

              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              <button
                type="submit"
                className="mt-1 flex w-full items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-gray-800"
              >
                続行する
                <span className="ml-2 text-base leading-none">→</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
                <div className="relative mx-auto w-fit bg-white px-3 text-xs text-gray-500">または</div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setEmail("google.user@example.com")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
                >
                  <span className="h-4 w-4 rounded-sm bg-[conic-gradient(from_180deg_at_50%_50%,#ea4335,#fbbc05,#34a853,#4285f4,#ea4335)]" />
                  Googleで続行（モック）
                </button>
                <button
                  type="button"
                  onClick={() => setEmail("apple.user@example.com")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
                >
                  <span className="text-base leading-none"></span>
                  Appleで続行（モック）
                </button>
              </div>
              </form>
            </EstimateV2Card>
          </div>
        </div>
      </main>
    </div>
  );
}

