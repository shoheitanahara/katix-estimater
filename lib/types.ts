/**
 * AI査定APIのレスポンス型定義
 * OpenAI の JSON 出力をバリデーションする際に使用
 */
export interface VehicleEstimate {
  make: string;
  model: string;
  generation: string;
  yearEstimate: string;
  mileage: string;
  gradeEstimate: string;
  bodyColor: string;
  /** 業者オークション基準の評点（6点満点）。例: "4.0" / "3.5〜4.0" */
  conditionScore: string;
  condition: string;
}

export interface AuctionMarket {
  rangeMinMan: number;
  rangeMaxMan: number;
}

export interface KatixCondition {
  guaranteeMan: number;
  rangeMinMan: number;
  rangeMaxMan: number;
}

export interface KatixPrediction {
  goodCondition: KatixCondition;
  usedCondition: KatixCondition;
}

export interface PriceFactors {
  upside: string[];
  downside: string[];
}

export interface EstimateResult {
  vehicleEstimate: VehicleEstimate;
  auctionMarket: AuctionMarket;
  katixPrediction: KatixPrediction;
  priceFactors: PriceFactors;
  comment: string;
}

/** API が返す成功レスポンス（結果IDと査定結果） */
export interface EstimateApiSuccess {
  ok: true;
  id: string;
  result: EstimateResult;
}

/** API が返すエラーレスポンス */
export interface EstimateApiError {
  ok: false;
  error: string;
}

export type EstimateApiResponse = EstimateApiSuccess | EstimateApiError;
