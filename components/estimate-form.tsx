"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUpload } from "./image-upload";

export function EstimateForm() {
  const router = useRouter();
  const [exteriorFile, setExteriorFile] = useState<File | null>(null);
  const [meterFile, setMeterFile] = useState<File | null>(null);
  const [mileageInput, setMileageInput] = useState("");
  const [grade, setGrade] = useState("");
  const [vin, setVin] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Vercel本番のリクエスト上限対策:
   * 送信前に画像をリサイズ・JPEG圧縮して payload を小さくする
   */
  const optimizeImageForUpload = async (file: File): Promise<File> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の解析に失敗しました。"));
      img.src = dataUrl;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像変換コンテキストの生成に失敗しました。");
    ctx.drawImage(image, 0, 0, width, height);

    // 大きすぎる場合は品質を段階的に下げる
    const toBlob = (quality: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      });

    let quality = 0.85;
    let blob = await toBlob(quality);
    if (!blob) throw new Error("画像圧縮に失敗しました。");

    const targetBytes = 1_500_000; // 約1.5MB / 枚を目安
    while (blob.size > targetBytes && quality > 0.45) {
      quality -= 0.1;
      const next = await toBlob(quality);
      if (!next) break;
      blob = next;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!exteriorFile) {
      setError("車体写真を選択してください。");
      return;
    }
    const hasMeter = !!meterFile;
    const hasMileage = mileageInput.trim().length > 0;
    if (!hasMeter && !hasMileage) {
      setError("メーター写真または走行距離のいずれかを入力してください。");
      return;
    }

    setLoading(true);
    try {
      let uploadExterior = exteriorFile;
      let uploadMeter: File | null = null;
      try {
        uploadExterior = await optimizeImageForUpload(exteriorFile);
        if (meterFile) uploadMeter = await optimizeImageForUpload(meterFile);
      } catch {
        uploadExterior = exteriorFile;
        if (meterFile) uploadMeter = meterFile;
      }

      const formData = new FormData();
      formData.set("exteriorImage", uploadExterior);
      if (uploadMeter) formData.set("meterImage", uploadMeter);
      formData.set("mileage", mileageInput.trim());
      formData.set("grade", grade);
      formData.set("vin", vin);
      formData.set("memo", memo);

      const res = await fetch("/api/estimate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 413) {
          setError("画像サイズが大きすぎます。解像度を下げるか別画像でお試しください。");
        } else {
          setError(data.error ?? "相場予想に失敗しました。");
        }
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
        label="メーター写真（走行距離が分かる写真）"
        name="meterImage"
        value={meterFile}
        onChange={setMeterFile}
      />
      <div>
        <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
          走行距離（手入力）
        </label>
        <input
          id="mileage"
          type="text"
          inputMode="numeric"
          name="mileage"
          value={mileageInput}
          onChange={(e) => setMileageInput(e.target.value)}
          placeholder="例: 50000"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
        />
        <p className="mt-1 text-xs text-gray-500">
          メーター写真がない場合はこちらを入力してください。メーター写真か走行距離のどちらかは必須です。
        </p>
      </div>

      <div>
        <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
          グレード（任意）
        </label>
        <input
          id="grade"
          type="text"
          name="grade"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="例: AMGライン / M Sport / S line"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-katix focus:outline-none focus:ring-1 focus:ring-katix"
        />
        <p className="mt-1 text-xs text-gray-500">
          外車はグレード差で相場が大きく変わるため、分かる場合は入力を推奨します。入力がない場合は保守的な相場になります。
        </p>
      </div>

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
