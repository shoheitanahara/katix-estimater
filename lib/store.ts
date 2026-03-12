import type { EstimateResult } from "./types";

/** 画像は base64 文字列（API・表示用）。メーター写真は手入力走行距離の場合は無い場合あり */
export interface StoredImages {
  exterior: string;
  meter?: string;
}

export interface StoredEstimate {
  result: EstimateResult;
  images: StoredImages;
}

/**
 * 査定結果・画像の一時保存（MVP用・インメモリ）
 * デプロイ後は再起動で消える。本番ではDB等に置き換える想定
 */
const resultStore = new Map<string, StoredEstimate>();

export function saveResult(
  id: string,
  result: EstimateResult,
  images: StoredImages
): void {
  resultStore.set(id, { result, images });
}

export function getResult(id: string): StoredEstimate | undefined {
  return resultStore.get(id);
}
