"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";

export function UploadSlotMock(props: {
  /** 一意のキー（input の id 用） */
  slotId: string;
  label: string;
  hint?: string;
}) {
  const reactId = useId();
  const inputId = `${props.slotId}-${reactId.replace(/:/g, "")}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    revokePreview();
    if (!file) {
      setFileName(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFileName(null);
      e.target.value = "";
      return;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClear = (ev: MouseEvent<HTMLButtonElement>) => {
    ev.stopPropagation();
    revokePreview();
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleChange}
        aria-label={`${props.label}の写真を選択`}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-white px-3 py-6 text-center transition hover:border-[rgb(64,162,96)] hover:bg-gray-50/80"
      >
        {previewUrl ? (
          <span className="relative h-24 w-full max-w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- ローカル blob プレビュー用 */}
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full rounded-lg object-cover"
            />
          </span>
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-lg text-gray-500">
            +
          </span>
        )}
        <span className="text-xs font-semibold text-gray-900">{props.label}</span>
        {props.hint && <span className="text-[11px] text-gray-500">{props.hint}</span>}
        {fileName ? (
          <span className="line-clamp-2 w-full px-1 text-[10px] text-[rgb(64,162,96)]" title={fileName}>
            {fileName}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">タップで写真を選択</span>
        )}
      </button>
      {fileName && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-black/70"
        >
          解除
        </button>
      )}
    </div>
  );
}
