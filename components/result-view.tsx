"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResultCard, type ResultImages } from "@/components/result-card";
import type { EstimateResult } from "@/lib/types";
import type { EstimateInput } from "@/lib/store";

interface ResultViewProps {
  id: string;
}

interface FetchedResult {
  result: EstimateResult;
  images: ResultImages;
  input?: EstimateInput;
}

/** base64 を File に変換（再査定の FormData 用） */
function base64ToFile(base64: string, filename: string, mime = "image/jpeg"): File {
  const bin = atob(base64.replace(/^data:[^;]+;base64,/, ""));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

interface ReestimateFormProps {
  images: ResultImages | null;
  initialInput: EstimateInput | null;
  onSuccess: (newId: string) => void;
}

function ReestimateForm({ images, initialInput, onSuccess }: ReestimateFormProps) {
  const [grade, setGrade] = useState(initialInput?.grade ?? "");
  const [vin, setVin] = useState(initialInput?.vin ?? "");
  const [memo, setMemo] = useState(initialInput?.memo ?? "");
  const [mileage, setMileage] = useState(initialInput?.mileage ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGrade(initialInput?.grade ?? "");
    setVin(initialInput?.vin ?? "");
    setMemo(initialInput?.memo ?? "");
    setMileage(initialInput?.mileage ?? "");
  }, [initialInput]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!images?.exterior) {
      setError("画像情報がないため再査定できません。はじめからやり直してください。");
      return;
    }
    const hasMeter = !!images.meter?.trim();
    const hasMileage = mileage.trim().length > 0;
    if (!hasMeter && !hasMileage) {
      setError("メーター写真がない場合は走行距離を入力してください。");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("exteriorImage", base64ToFile(images.exterior, "exterior.jpg"));
      if (hasMeter && images.meter) {
        formData.set("meterImage", base64ToFile(images.meter, "meter.jpg"));
      }
      formData.set("mileage", mileage.trim());
      formData.set("grade", grade.trim());
      formData.set("vin", vin.trim());
      formData.set("memo", memo.trim());

      const res = await fetch("/api/estimate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "再査定に失敗しました。");
        return;
      }
      if (data.ok && data.id && data.result) {
        try {
          sessionStorage.setItem(`estimate-${data.id}`, JSON.stringify(data.result));
          if (data.images?.exterior) {
            sessionStorage.setItem(
              `estimate-images-${data.id}`,
              JSON.stringify({
                exterior: data.images.exterior,
                meter: data.images.meter ?? null,
              })
            );
          }
          sessionStorage.setItem(
            `estimate-input-${data.id}`,
            JSON.stringify({
              mileage: mileage.trim() || undefined,
              grade: grade.trim() || undefined,
              vin: vin.trim() || undefined,
              memo: memo.trim() || undefined,
            })
          );
        } catch {
          // sessionStorage が使えない環境
        }
        onSuccess(data.id);
        return;
      }
      setError("再査定結果の取得に失敗しました。");
    } catch {
      setError("通信エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-700">
        追加情報を入力して再査定
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        グレード・車台番号・メモを追加すると、より精度の高い予想が出せます。同じ写真で再査定します。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
        <div>
          <label htmlFor="re-grade" className="block text-sm font-medium text-gray-700">
            グレード（任意）
          </label>
          <input
            id="re-grade"
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="例: AMGライン / M Sport"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
          />
        </div>
        <div>
          <label htmlFor="re-vin" className="block text-sm font-medium text-gray-700">
            車台番号（任意）
          </label>
          <input
            id="re-vin"
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            placeholder="例: KF2P-313146"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
          />
        </div>
        <div>
          <label htmlFor="re-mileage" className="block text-sm font-medium text-gray-700">
            走行距離（手入力）
          </label>
          <input
            id="re-mileage"
            type="text"
            inputMode="numeric"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="例: 50000"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
          />
          <p className="mt-1 text-xs text-gray-500">
            メーター写真がない場合は必須です。
          </p>
        </div>
        <div>
          <label htmlFor="re-memo" className="block text-sm font-medium text-gray-700">
            任意メモ
          </label>
          <textarea
            id="re-memo"
            rows={3}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="・MT / 修復歴なし など"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
          />
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-katix px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-katix-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "再査定中…" : "追加情報で再査定する"}
        </button>
      </form>

      {loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-card-hover">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-katix/30 border-t-katix" />
            <p className="mt-4 text-lg font-bold text-gray-900">再査定しています</p>
            <p className="mt-1 text-sm text-gray-600">
              追加情報を反映して予想しています。しばらくお待ちください…
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ResultView({ id }: ResultViewProps) {
  const router = useRouter();
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [images, setImages] = useState<ResultImages | null>(null);
  const [input, setInput] = useState<EstimateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = `estimate-${id}`;
    const imagesKey = `estimate-images-${id}`;
    const inputKey = `estimate-input-${id}`;

    // 1. sessionStorage を優先（POST 直後のリダイレクトで保存済み）
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as EstimateResult;
        setResult(parsed);
        const imagesStored = sessionStorage.getItem(imagesKey);
        if (imagesStored) {
          setImages(JSON.parse(imagesStored) as ResultImages);
        } else {
          fetch(`/api/result/${id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data: FetchedResult | null) => {
              if (data?.images) setImages(data.images);
              if (data?.input) setInput(data.input);
            })
            .catch(() => {});
        }
        const inputStored = sessionStorage.getItem(inputKey);
        if (inputStored) {
          try {
            setInput(JSON.parse(inputStored) as EstimateInput);
          } catch {
            // ignore
          }
        }
        setLoading(false);
        return;
      }
    } catch {
      // パース失敗時は API にフォールバック
    }

    // 2. API から取得（サーバーに結果・画像を保存済み）
    fetch(`/api/result/${id}`)
      .then((res) => {
        if (!res.ok) {
          setError(res.status === 404 ? "相場予想結果が見つかりません。" : "取得に失敗しました。");
          return null;
        }
        return res.json() as Promise<FetchedResult>;
      })
      .then((data) => {
        if (data) {
          setResult(data.result);
          setImages(data.images ?? null);
          setInput(data.input ?? null);
        } else setError((e) => (e ?? "相場予想結果が見つかりません。"));
      })
      .catch(() => setError("通信エラーが発生しました。"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-katix border-t-transparent" />
        <p className="mt-5 text-sm font-medium text-gray-500">予想結果を読み込み中…</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="space-y-5 rounded-2xl border border-amber-100 bg-amber-50/80 p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-bold text-amber-900">相場予想結果が見つかりません</h1>
        <p className="text-sm leading-relaxed text-amber-800">
          {error ?? "セッションが切れたか、不正なURLの可能性があります。もう一度お試しください。"}
        </p>
        <Link
          href="/estimate"
          className="inline-flex rounded-xl bg-katix px-5 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-katix-dark"
        >
          相場を予想する
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          相場予想結果
        </h1>
        <Link
          href="/estimate"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-katix px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-shadow hover:bg-katix-dark hover:shadow-card-hover"
        >
          もう一度予想する
        </Link>
      </div>
      <ResultCard result={result} images={images} input={input} />

      {/* 追加情報を入力して再査定 */}
      <ReestimateForm
        images={images}
        initialInput={input}
        onSuccess={(newId) => router.push(`/result/${newId}`)}
      />
    </div>
  );
}
