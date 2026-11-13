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
    /** ユーザー向けの前提ラベル（例: 美車〜良質車）。数値の評点は使わない */
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

/** v3: 買取相場推定（低価格検算・設問反映対応）の自信度 */
export type EstimateV3Confidence = "high" | "medium" | "low";

/** v3: 低価格帯の市場タイプ */
export type EstimateV3LowPriceMarketType =
  | "normal_floor"
  | "export_demand"
  | "commercial_demand"
  | "rare"
  | "unclear";

/**
 * v3: テキスト入力＋設問フォームから買取相場を推定した結果
 */
export interface EstimateV3Result {
  /** 買取価格（万円・整数） */
  buyPrice: number;
  /** 買取価格レンジ（万円・整数） */
  priceRange: {
    min: number;
    max: number;
  };
  /** 小売参考価格（万円・整数） */
  retailPrice: number;
  confidence: EstimateV3Confidence;
  /** 低価格帯の追加検算を行ったか */
  lowPriceCheckUsed: boolean;
  lowPriceMarketType: EstimateV3LowPriceMarketType;
  /** 設問フォームの状態差を中心価格へ反映したか */
  conditionAdjustmentUsed: boolean;
  /** 推定根拠（100〜150字目安、固有名詞なし） */
  reasoning: string;
  /** プロンプト仕様により常に空配列 */
  sources: [];
}

export interface EstimateV3ApiSuccess {
  ok: true;
  result: EstimateV3Result;
}

export interface EstimateV3ApiError {
  ok: false;
  error: string;
}

export type EstimateV3ApiResponse = EstimateV3ApiSuccess | EstimateV3ApiError;

/** v4: 走行距離区分（既存フォームの選択肢に合わせる） */
export const ESTIMATE_V4_MILEAGE_BANDS = [
  "~100キロ",
  "~5,000キロ",
  "~1万キロ",
  "~2万キロ",
  "~3万キロ",
  "~4万キロ",
  "~5万キロ",
  "~6万キロ",
  "~7万キロ",
  "~8万キロ",
  "~9万キロ",
  "~10万キロ",
  "~11万キロ",
  "~12万キロ",
  "~13万キロ",
  "~14万キロ",
  "~15万キロ",
  "~17万キロ",
  "~20万キロ",
  "20万1キロ〜",
  "メーター交換・不明",
] as const;

export type EstimateV4MileageBand = (typeof ESTIMATE_V4_MILEAGE_BANDS)[number];

/** v4: 車体色系 */
export const ESTIMATE_V4_COLOR_FAMILIES = [
  "白系",
  "黒系",
  "シルバー系",
  "グレー系",
  "赤系",
  "青系",
  "その他",
] as const;

export type EstimateV4ColorFamily = (typeof ESTIMATE_V4_COLOR_FAMILIES)[number];

/** v4: 国産／輸入の区分 */
export const ESTIMATE_V4_ORIGIN_TYPES = ["domestic", "import"] as const;

export type EstimateV4OriginType = (typeof ESTIMATE_V4_ORIGIN_TYPES)[number];

/** v4: 自信度（v3と同値） */
export type EstimateV4Confidence = EstimateV3Confidence;

/** v4: 低価格帯の市場タイプ（v3と同値） */
export type EstimateV4LowPriceMarketType = EstimateV3LowPriceMarketType;

/** v4: 通常／最上位のどちらか一方の相場帯 */
export interface EstimateV4GradeBand {
  /** 買取価格（万円・整数）。推定不能時は null */
  buyPrice: number | null;
  /** 買取価格レンジ（万円・整数）。推定不能時は null */
  priceRange: {
    min: number;
    max: number;
  } | null;
  /** 小売参考価格（万円・整数）。可能な範囲で返す */
  retailPrice: number | null;
  /** この帯に含まれるおおよそのグレード名 */
  grades: string[];
}

/** v4: 全体相場または指定グレードの focus 枠 */
export type EstimateV4FocusKind = "overall" | "grade";

export interface EstimateV4FocusBand {
  kind: EstimateV4FocusKind;
  /** 画面表示用ラベル */
  label: string;
  buyPrice: number | null;
  priceRange: {
    min: number;
    max: number;
  } | null;
  retailPrice: number | null;
  /** kind=grade のとき */
  gradeName?: string;
}

/**
 * v4: 通常／最上位に加え focus（全体レンジ or 指定グレード）を返す結果
 */
export interface EstimateV4Result {
  /** 通常〜中位寄りグレード想定 */
  standard: EstimateV4GradeBand;
  /** 最上位／高性能／特別仕様寄り想定 */
  top: EstimateV4GradeBand;
  /** 国産は全体レンジ、輸入×グレード指定はそのグレード相場 */
  focus: EstimateV4FocusBand;
  confidence: EstimateV4Confidence;
  lowPriceCheckUsed: boolean;
  lowPriceMarketType: EstimateV4LowPriceMarketType;
  /** CS向け査定根拠（固有名詞なし） */
  reasoning: string;
  /** 市場調査で使用した情報源 */
  sources: Array<{
    sourceName: string;
    url: string;
    checkedData: string;
  }>;
}

export interface EstimateV4ApiSuccess {
  ok: true;
  result: EstimateV4Result;
}

export interface EstimateV4ApiError {
  ok: false;
  error: string;
}

export type EstimateV4ApiResponse = EstimateV4ApiSuccess | EstimateV4ApiError;
