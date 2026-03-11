"use client";

import { useEffect, useRef, useState } from "react";

interface ImageUploadProps {
  label: string;
  name: string;
  accept?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function ImageUpload({
  label,
  name,
  accept = "image/jpeg,image/png,image/webp",
  value,
  onChange,
  error,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
  };

  const handleClear = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          onChange={handleChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-katix file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-katix-dark"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            解除
          </button>
        )}
      </div>
      {value && (
        <p className="text-xs text-gray-500">
          選択中: {value.name} ({(value.size / 1024).toFixed(1)} KB)
        </p>
      )}
      {previewUrl && (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt={label}
            className="max-h-40 rounded border border-gray-200 object-contain"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
