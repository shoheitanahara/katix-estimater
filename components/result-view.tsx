"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResultCard, type ResultImages } from "@/components/result-card";
import type { EstimateResult } from "@/lib/types";

interface ResultViewProps {
  id: string;
}

export function ResultView({ id }: ResultViewProps) {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [images, setImages] = useState<ResultImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = `estimate-${id}`;
    const imagesKey = `estimate-images-${id}`;

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
          // 画像が sessionStorage に無い（容量制限等）場合は API から取得
          fetch(`/api/result/${id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { result?: EstimateResult; images?: ResultImages } | null) => {
              if (data?.images) setImages(data.images);
            })
            .catch(() => {});
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
        return res.json() as Promise<{ result: EstimateResult; images: ResultImages }>;
      })
      .then((data) => {
        if (data) {
          setResult(data.result);
          setImages(data.images ?? null);
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
      <ResultCard result={result} images={images} />
    </div>
  );
}
