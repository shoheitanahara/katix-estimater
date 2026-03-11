"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUpload } from "./image-upload";

export function EstimateForm() {
  const router = useRouter();
  const [exteriorFile, setExteriorFile] = useState<File | null>(null);
  const [meterFile, setMeterFile] = useState<File | null>(null);
  const [vin, setVin] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!exteriorFile || !meterFile) {
      setError("車体写真とメーター写真の両方を選択してください。");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("exteriorImage", exteriorFile);
      formData.set("meterImage", meterFile);
      formData.set("vin", vin);
      formData.set("memo", memo);

      const res = await fetch("/api/estimate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "相場予想に失敗しました。");
        return;
      }

      if (data.ok && data.id && data.result) {
        try {
          sessionStorage.setItem(`estimate-${data.id}`, JSON.stringify(data.result));
          if (data.images?.exterior && data.images?.meter) {
            sessionStorage.setItem(
              `estimate-images-${data.id}`,
              JSON.stringify({ exterior: data.images.exterior, meter: data.images.meter })
            );
          }
        } catch {
          // sessionStorage が使えない環境では API の getResult に依存
        }
        router.push(`/result/${data.id}`);
        return;
      }

      setError("相場予想結果の取得に失敗しました。");
    } catch (err) {
      setError("通信エラーが発生しました。しばらくしてからお試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
      <ImageUpload
        label="車体写真"
        name="exteriorImage"
        value={exteriorFile}
        onChange={setExteriorFile}
      />
      <ImageUpload
        label="メーター写真"
        name="meterImage"
        value={meterFile}
        onChange={setMeterFile}
      />

      <div>
        <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
          車台番号（任意）
        </label>
        <input
          id="vin"
          type="text"
          name="vin"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="例: KF2P-313146"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
        />
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-gray-700">
          任意メモ
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={4}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={"・MT\n・修復歴なし\n・ワンオーナー"}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-katix px-6 py-2.5 text-sm font-semibold text-white shadow-card transition-shadow hover:bg-katix-dark hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "予想中…" : "相場を予想する"}
        </button>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          戻る
        </Link>
      </div>
      </form>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-card-hover"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-katix/30 border-t-katix" />
            <p className="mt-4 text-lg font-bold text-gray-900">相場を予想しています</p>
            <p className="mt-1 text-sm text-gray-600">
              画像と車台番号を解析しています。しばらくお待ちください…
            </p>
          </div>
        </div>
      )}
    </>
  );
}
