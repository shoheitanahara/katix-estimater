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
  /** 相場予想の自信度（10〜90）。情報量・参考データ量に応じてAIが付与 */
  confidencePercent?: number;
  /** 予想買取金額（1万円単位・整数の万円）。評価点に近いレンジから詰めた単一見積もり。保守寄り推奨 */
  expectedBuybackMan?: number;
  /** 最低保証価格（1万円単位・整数の万円）。評点推定の下限ベースで安全めに見積もった最低額 */
  minimumGuaranteeMan?: number;
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

/**
 * v2: 画像なし（テキスト入力のみ）相場予想のレスポンス型
 */
export interface EstimateV2Result {
  assumption: {
    /** 常に "4〜5点" を想定した文言 */
    auctionScore: string;
    /** 前提や不確実性の補足（1〜2文） */
    notes: string;
  };
  input: {
    make: string;
    model: string;
    year?: number | null;
    mileageKm: number;
  };
  auctionExpected: {
    rangeMinMan: number;
    rangeMaxMan: number;
    centerMan: number;
  };
  comment: string;
  /** 相場予想の自信度（10〜90）。ズレうる場合は低めに */
  confidencePercent?: number;
}

export interface EstimateV2ApiSuccess {
  ok: true;
  result: EstimateV2Result;
}

export interface EstimateV2ApiError {
  ok: false;
  error: string;
}

export type EstimateV2ApiResponse = EstimateV2ApiSuccess | EstimateV2ApiError;
