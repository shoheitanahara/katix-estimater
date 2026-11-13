import OpenAI from "openai";
import type {
  EstimateResult,
  EstimateV2Result,
  EstimateV3Confidence,
  EstimateV3LowPriceMarketType,
  EstimateV3Result,
  EstimateV4Confidence,
  EstimateV4GradeBand,
  EstimateV4LowPriceMarketType,
  EstimateV4Result,
} from "./types";
import { buildOverallFocusBand, focusBandFromGradeInput } from "./estimate-v4-focus";
import {
  ESTIMATE_SYSTEM_PROMPT,
  ESTIMATE_V2_SYSTEM_PROMPT,
  ESTIMATE_V3_SYSTEM_PROMPT,
  ESTIMATE_V4_SYSTEM_PROMPT,
  buildUserMessage,
  buildUserMessageV2,
  buildUserMessageV3,
  buildUserMessageV4,
} from "./prompt";

const ESTIMATE_V3_MODEL = "gpt-5.6-sol";
const ESTIMATE_V4_MODEL = "gpt-6.1-sol";

/** サーバー側でのみ使用。APIキーはクライアントに露出しない */
function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: key });
}

/**
 * 車体画像・メーター画像（任意）と付帯情報から査定JSONを取得
 * @param exteriorImageBase64 - 車体写真（base64）
 * @param meterImageBase64 - メーター写真（base64）。手入力走行距離の場合は null
 * @param grade - グレード情報（任意）
 * @param vin - 車台番号（任意）
 * @param memo - メモ（任意）
 * @param mileageInput - 走行距離の手入力（任意。メーター写真がない場合に使用）
 */
export async function getEstimateFromOpenAI(
  exteriorImageBase64: string,
  meterImageBase64: string | null,
  grade: string | null,
  vin: string | null,
  memo: string | null,
  mileageInput: string | null
): Promise<EstimateResult> {
  const openai = getOpenAIClient();
  const userText = buildUserMessage(grade, vin, memo, mileageInput);

  const userContent: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" }
  > = [
    { type: "input_text", text: userText },
    {
      type: "input_image",
      image_url: `data:image/jpeg;base64,${exteriorImageBase64}`,
      detail: "high",
    },
  ];
  if (meterImageBase64) {
    userContent.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${meterImageBase64}`,
      detail: "high",
    });
  }

  let response: unknown;
  try {
    response = await openai.responses.create({
      model: "gpt-5.4",
      temperature: 0.1,
      max_output_tokens: 2000,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: ESTIMATE_SYSTEM_PROMPT }],
        },
        { role: "user", content: userContent },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("model") || message.includes("gpt-5.4")) {
      throw new Error(
        "gpt-5.4 の利用に失敗しました。APIアカウントのモデルアクセス権限を確認してください。"
      );
    }
    throw error;
  }

  const content = extractResponseText(response);
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  const parsed = parseAndValidateEstimateResult(content);
  return parsed;
}

/**
 * v2: メーカー/車種/走行距離（テキストのみ）から「美車〜良質車」想定のAI相場予想（参考）を取得
 */
export async function getEstimateV2FromOpenAI(params: {
  make: string;
  model: string;
  year?: number;
  mileageKm: number;
}): Promise<EstimateV2Result> {
  const openai = getOpenAIClient();
  const userText = buildUserMessageV2(params);

  const createResponse = async (opts?: { retry: boolean }): Promise<EstimateV2Result> => {
    let response: unknown;
    try {
      response = await openai.responses.create({
        model: "gpt-5.4",
        temperature: opts?.retry ? 0 : 0.1,
        max_output_tokens: 900,
        input: [
          {
            role: "system",
            content: [
              { type: "input_text", text: ESTIMATE_V2_SYSTEM_PROMPT },
              ...(opts?.retry
                ? [
                    {
                      type: "input_text" as const,
                      text: "前回はJSONが壊れました。必ず指定のJSONのみを返してください（説明文や前後の文章は禁止）。",
                    },
                  ]
                : []),
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userText }],
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("model") || message.includes("gpt-5.4")) {
        throw new Error(
          "gpt-5.4 の利用に失敗しました。APIアカウントのモデルアクセス権限を確認してください。"
        );
      }
      throw error;
    }

    const content = extractResponseText(response);
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }
    return parseAndValidateEstimateV2Result(content);
  };

  try {
    return await createResponse({ retry: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable =
      message.includes("not valid JSON") ||
      message.includes("Missing or invalid") ||
      message.includes("Missing or invalid assumption") ||
      message.includes("Missing or invalid input") ||
      message.includes("Missing or invalid auctionExpected") ||
      message.includes("AI response is not");
    if (!retryable) throw err;
    return await createResponse({ retry: true });
  }
}

/**
 * v3: メーカー/車種/年式/走行距離等から買取相場を推定（Web検索あり）
 */
export async function getEstimateV3FromOpenAI(params: {
  maker: string;
  carName: string;
  year: number;
  grade?: string;
  color?: string;
  mileage: number;
  formInfo?: string;
}): Promise<EstimateV3Result> {
  const openai = getOpenAIClient();
  const userText = buildUserMessageV3(params);

  const createResponse = async (opts?: { retry: boolean }): Promise<EstimateV3Result> => {
    let response: unknown;
    try {
      response = await openai.responses.create({
        model: ESTIMATE_V3_MODEL,
        // Web検索＋推論のため余裕を持たせる
        max_output_tokens: 4000,
        tools: [{ type: "web_search_preview" }],
        tool_choice: "auto",
        input: [
          {
            role: "system",
            content: [
              { type: "input_text", text: ESTIMATE_V3_SYSTEM_PROMPT },
              ...(opts?.retry
                ? [
                    {
                      type: "input_text" as const,
                      text: "前回はJSONが壊れました。必ず指定のJSONのみを返してください（説明文や前後の文章は禁止）。sourcesは必ず空配列[]にしてください。",
                    },
                  ]
                : []),
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userText }],
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("model") || message.includes(ESTIMATE_V3_MODEL) || message.includes("gpt-5.6")) {
        throw new Error(
          `${ESTIMATE_V3_MODEL} の利用に失敗しました。APIアカウントのモデルアクセス権限を確認してください。`
        );
      }
      throw error;
    }

    const content = extractResponseText(response);
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }
    return parseAndValidateEstimateV3Result(content);
  };

  try {
    return await createResponse({ retry: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable =
      message.includes("not valid JSON") ||
      message.includes("Missing or invalid") ||
      message.includes("AI response is not");
    if (!retryable) throw err;
    return await createResponse({ retry: true });
  }
}

/**
 * Responses API の戻り値からテキストを取り出す
 */
function extractResponseText(response: unknown): string | null {
  const r = response as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof r.output_text === "string" && r.output_text.trim()) {
    return r.output_text;
  }

  const chunks: string[] = [];
  for (const item of r.output ?? []) {
    if (item.type !== "message") continue;
    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        chunks.push(contentItem.text);
      }
    }
  }
  return chunks.length > 0 ? chunks.join("\n").trim() : null;
}

/**
 * APIレスポンス文字列をパースし、型を検証する
 */
function parseAndValidateEstimateResult(raw: string): EstimateResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  if (!json || typeof json !== "object") {
    throw new Error("AI response is not an object");
  }

  const o = json as Record<string, unknown>;

  const vehicleEstimate = o.vehicleEstimate as Record<string, unknown> | undefined;
  if (!vehicleEstimate || typeof vehicleEstimate !== "object") {
    throw new Error("Missing or invalid vehicleEstimate");
  }

  const auctionMarket = o.auctionMarket as Record<string, unknown> | undefined;
  if (!auctionMarket || typeof auctionMarket !== "object") {
    throw new Error("Missing or invalid auctionMarket");
  }

  const katixPrediction = o.katixPrediction as Record<string, unknown> | undefined;
  if (!katixPrediction || typeof katixPrediction !== "object") {
    throw new Error("Missing or invalid katixPrediction");
  }

  const priceFactors = o.priceFactors as Record<string, unknown> | undefined;
  if (!priceFactors || typeof priceFactors !== "object") {
    throw new Error("Missing or invalid priceFactors");
  }

  const ensureString = (v: unknown, defaultVal: string): string =>
    typeof v === "string" ? v : defaultVal;
  const ensureNumber = (v: unknown, defaultVal: number): number =>
    typeof v === "number" && !Number.isNaN(v) ? v : defaultVal;
  const ensureStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const goodCondition = (katixPrediction.goodCondition as Record<string, unknown>) ?? {};
  const usedCondition = (katixPrediction.usedCondition as Record<string, unknown>) ?? {};

  // 自信度は 10〜90 にクランプ。未設定・不正値は undefined
  const rawConf = o.confidencePercent;
  let confidencePercent: number | undefined;
  if (typeof rawConf === "number" && !Number.isNaN(rawConf)) {
    const clamped = Math.round(Math.max(10, Math.min(90, rawConf)));
    confidencePercent = clamped;
  }

  // 予想買取金額（万円・1万単位）。0以上の整数に正規化
  const rawBuyback = o.expectedBuybackMan;
  let expectedBuybackMan: number | undefined;
  if (typeof rawBuyback === "number" && !Number.isNaN(rawBuyback) && rawBuyback >= 0) {
    expectedBuybackMan = Math.round(rawBuyback);
  }

  // 最低保証価格（万円・1万単位）。0以上の整数に正規化
  const rawMinGuarantee = o.minimumGuaranteeMan;
  let minimumGuaranteeMan: number | undefined;
  if (typeof rawMinGuarantee === "number" && !Number.isNaN(rawMinGuarantee) && rawMinGuarantee >= 0) {
    minimumGuaranteeMan = Math.round(rawMinGuarantee);
  }

  return {
    vehicleEstimate: {
      make: ensureString(vehicleEstimate.make, ""),
      model: ensureString(vehicleEstimate.model, ""),
      generation: ensureString(vehicleEstimate.generation, ""),
      yearEstimate: ensureString(vehicleEstimate.yearEstimate, ""),
      mileage: ensureString(vehicleEstimate.mileage, ""),
      gradeEstimate: ensureString(vehicleEstimate.gradeEstimate, ""),
      bodyColor: ensureString(vehicleEstimate.bodyColor, ""),
      conditionScore: ensureString(vehicleEstimate.conditionScore, ""),
      condition: ensureString(vehicleEstimate.condition, ""),
    },
    auctionMarket: {
      rangeMinMan: ensureNumber(auctionMarket.rangeMinMan, 0),
      rangeMaxMan: ensureNumber(auctionMarket.rangeMaxMan, 0),
    },
    katixPrediction: {
      goodCondition: {
        guaranteeMan: ensureNumber(goodCondition.guaranteeMan, 0),
        rangeMinMan: ensureNumber(goodCondition.rangeMinMan, 0),
        rangeMaxMan: ensureNumber(goodCondition.rangeMaxMan, 0),
      },
      usedCondition: {
        guaranteeMan: ensureNumber(usedCondition.guaranteeMan, 0),
        rangeMinMan: ensureNumber(usedCondition.rangeMinMan, 0),
        rangeMaxMan: ensureNumber(usedCondition.rangeMaxMan, 0),
      },
    },
    priceFactors: {
      upside: ensureStringArray(priceFactors.upside),
      downside: ensureStringArray(priceFactors.downside),
    },
    comment: ensureString(o.comment, ""),
    ...(confidencePercent !== undefined && { confidencePercent }),
    ...(expectedBuybackMan !== undefined && { expectedBuybackMan }),
    ...(minimumGuaranteeMan !== undefined && { minimumGuaranteeMan }),
  };
}

function parseAndValidateEstimateV2Result(raw: string): EstimateV2Result {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }
  if (!json || typeof json !== "object") {
    throw new Error("AI response is not an object");
  }

  const o = json as Record<string, unknown>;
  const assumption = o.assumption as Record<string, unknown> | undefined;
  const input = o.input as Record<string, unknown> | undefined;
  const auctionExpected = o.auctionExpected as Record<string, unknown> | undefined;

  if (!assumption || typeof assumption !== "object") {
    throw new Error("Missing or invalid assumption");
  }
  if (!input || typeof input !== "object") {
    throw new Error("Missing or invalid input");
  }
  if (!auctionExpected || typeof auctionExpected !== "object") {
    throw new Error("Missing or invalid auctionExpected");
  }

  const ensureString = (v: unknown, defaultVal: string): string =>
    typeof v === "string" ? v : defaultVal;
  const ensureNumber = (v: unknown, defaultVal: number): number =>
    typeof v === "number" && !Number.isNaN(v) ? v : defaultVal;

  const rawConf = o.confidencePercent;
  let confidencePercent: number | undefined;
  if (typeof rawConf === "number" && !Number.isNaN(rawConf)) {
    confidencePercent = Math.round(Math.max(10, Math.min(90, rawConf)));
  }

  const mileageKmRaw = input.mileageKm;
  const mileageKm = typeof mileageKmRaw === "number" && Number.isFinite(mileageKmRaw) ? Math.round(mileageKmRaw) : 0;

  const yearRaw = input.year;
  const year =
    typeof yearRaw === "number" && Number.isFinite(yearRaw) ? Math.round(yearRaw) : yearRaw === null ? null : undefined;

  const rangeMinMan = ensureNumber(auctionExpected.rangeMinMan, 0);
  const rangeMaxMan = ensureNumber(auctionExpected.rangeMaxMan, 0);
  const centerMan = ensureNumber(auctionExpected.centerMan, 0);
  const normalizedCenterMan =
    centerMan > 0 ? centerMan : Math.round((Math.max(0, rangeMinMan) + Math.max(0, rangeMaxMan)) / 2);

  return {
    assumption: {
      auctionScore: ensureString(assumption.auctionScore, "美車〜良質車"),
      notes: ensureString(assumption.notes, ""),
    },
    input: {
      make: ensureString(input.make, ""),
      model: ensureString(input.model, ""),
      ...(year !== undefined ? { year } : {}),
      mileageKm,
    },
    auctionExpected: {
      rangeMinMan: Math.max(0, Math.round(rangeMinMan)),
      rangeMaxMan: Math.max(0, Math.round(rangeMaxMan)),
      centerMan: Math.max(0, Math.round(normalizedCenterMan)),
    },
    comment: ensureString(o.comment, ""),
    ...(confidencePercent !== undefined && { confidencePercent }),
  };
}

/**
 * v4: メーカー/車種/年式/走行距離区分/色系から通常・最上位の買取相場を推定（Web検索あり）
 */
export async function getEstimateV4FromOpenAI(params: {
  maker: string;
  carName: string;
  year: number;
  mileageBand: string;
  colorFamily: string;
  originType: "domestic" | "import";
  grade?: string;
}): Promise<EstimateV4Result> {
  const openai = getOpenAIClient();
  const grade = params.grade?.trim() || undefined;
  const userText = buildUserMessageV4({ ...params, grade });

  const createResponse = async (opts?: { retry: boolean }): Promise<EstimateV4Result> => {
    let response: unknown;
    try {
      response = await openai.responses.create({
        model: ESTIMATE_V4_MODEL,
        max_output_tokens: 4000,
        tools: [{ type: "web_search_preview" }],
        tool_choice: "auto",
        input: [
          {
            role: "system",
            content: [
              { type: "input_text", text: ESTIMATE_V4_SYSTEM_PROMPT },
              ...(opts?.retry
                ? [
                    {
                      type: "input_text" as const,
                      text: "前回はJSONが壊れました。必ず指定のJSONのみを返してください（説明文や前後の文章は禁止）。",
                    },
                  ]
                : []),
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userText }],
          },
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("model") || message.includes(ESTIMATE_V4_MODEL) || message.includes("gpt-6.1")) {
        throw new Error(
          `${ESTIMATE_V4_MODEL} の利用に失敗しました。APIアカウントのモデルアクセス権限を確認してください。`
        );
      }
      throw error;
    }

    const content = extractResponseText(response);
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }
    return parseAndValidateEstimateV4Result(content, { grade });
  };

  try {
    return await createResponse({ retry: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable =
      message.includes("not valid JSON") ||
      message.includes("Missing or invalid") ||
      message.includes("AI response is not");
    if (!retryable) throw err;
    return await createResponse({ retry: true });
  }
}

const V3_CONFIDENCE_VALUES: EstimateV3Confidence[] = ["high", "medium", "low"];
const V3_LOW_PRICE_MARKET_TYPES: EstimateV3LowPriceMarketType[] = [
  "normal_floor",
  "export_demand",
  "commercial_demand",
  "rare",
  "unclear",
];
const V4_CONFIDENCE_VALUES: EstimateV4Confidence[] = ["high", "medium", "low"];
const V4_LOW_PRICE_MARKET_TYPES: EstimateV4LowPriceMarketType[] = [
  "normal_floor",
  "export_demand",
  "commercial_demand",
  "rare",
  "unclear",
];

/**
 * モデル出力から最初のJSONオブジェクトを取り出す（前後の説明文やコードフェンスに耐える）
 */
function extractJsonObjectText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  if (candidate.startsWith("{") && candidate.endsWith("}")) return candidate;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return candidate;
}

function parseAndValidateEstimateV3Result(raw: string): EstimateV3Result {
  let json: unknown;
  try {
    json = JSON.parse(extractJsonObjectText(raw));
  } catch {
    throw new Error("AI response is not valid JSON");
  }
  if (!json || typeof json !== "object") {
    throw new Error("AI response is not an object");
  }

  const o = json as Record<string, unknown>;
  const priceRange = o.priceRange as Record<string, unknown> | undefined;
  if (!priceRange || typeof priceRange !== "object") {
    throw new Error("Missing or invalid priceRange");
  }

  const toMan = (v: unknown, label: string): number => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      throw new Error(`Missing or invalid ${label}`);
    }
    return Math.round(v);
  };

  let buyPrice = toMan(o.buyPrice, "buyPrice");
  let retailPrice = toMan(o.retailPrice, "retailPrice");
  let rangeMin = toMan(priceRange.min, "priceRange.min");
  let rangeMax = toMan(priceRange.max, "priceRange.max");

  // 検算: buyPrice は retailPrice を超えない
  if (buyPrice > retailPrice) {
    buyPrice = retailPrice;
  }
  // 検算: min ≤ buyPrice ≤ max（崩れていれば補正）
  if (rangeMin > rangeMax) {
    const tmp = rangeMin;
    rangeMin = rangeMax;
    rangeMax = tmp;
  }
  if (buyPrice < rangeMin) rangeMin = buyPrice;
  if (buyPrice > rangeMax) rangeMax = buyPrice;

  // 50万円未満は最低でも ±10万円の幅
  if (buyPrice < 50) {
    rangeMin = Math.min(rangeMin, Math.max(0, buyPrice - 10));
    rangeMax = Math.max(rangeMax, buyPrice + 10);
  }

  const confidenceRaw = o.confidence;
  if (typeof confidenceRaw !== "string" || !V3_CONFIDENCE_VALUES.includes(confidenceRaw as EstimateV3Confidence)) {
    throw new Error("Missing or invalid confidence");
  }
  const confidence = confidenceRaw as EstimateV3Confidence;

  const lowPriceMarketTypeRaw = o.lowPriceMarketType;
  if (
    typeof lowPriceMarketTypeRaw !== "string" ||
    !V3_LOW_PRICE_MARKET_TYPES.includes(lowPriceMarketTypeRaw as EstimateV3LowPriceMarketType)
  ) {
    throw new Error("Missing or invalid lowPriceMarketType");
  }
  const lowPriceMarketType = lowPriceMarketTypeRaw as EstimateV3LowPriceMarketType;

  if (typeof o.lowPriceCheckUsed !== "boolean") {
    throw new Error("Missing or invalid lowPriceCheckUsed");
  }
  if (typeof o.conditionAdjustmentUsed !== "boolean") {
    throw new Error("Missing or invalid conditionAdjustmentUsed");
  }
  if (typeof o.reasoning !== "string" || !o.reasoning.trim()) {
    throw new Error("Missing or invalid reasoning");
  }

  return {
    buyPrice,
    priceRange: { min: rangeMin, max: rangeMax },
    retailPrice,
    confidence,
    lowPriceCheckUsed: o.lowPriceCheckUsed,
    lowPriceMarketType,
    conditionAdjustmentUsed: o.conditionAdjustmentUsed,
    reasoning: o.reasoning.trim(),
    sources: [],
  };
}

/**
 * 万円整数または null を正規化する
 */
function toNullableMan(v: unknown, label: string): number | null {
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new Error(`Missing or invalid ${label}`);
  }
  return Math.round(v);
}

/**
 * グレード帯（通常／最上位）をパースし、価格整合性を補正する
 */
function parseEstimateV4GradeBand(raw: unknown, label: string): EstimateV4GradeBand {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Missing or invalid ${label}`);
  }
  const band = raw as Record<string, unknown>;
  let buyPrice = toNullableMan(band.buyPrice, `${label}.buyPrice`);
  let retailPrice = toNullableMan(band.retailPrice, `${label}.retailPrice`);

  let priceRange: { min: number; max: number } | null = null;
  if (band.priceRange === null) {
    priceRange = null;
  } else if (band.priceRange && typeof band.priceRange === "object") {
    const pr = band.priceRange as Record<string, unknown>;
    let rangeMin = toNullableMan(pr.min, `${label}.priceRange.min`);
    let rangeMax = toNullableMan(pr.max, `${label}.priceRange.max`);
    if (rangeMin === null || rangeMax === null) {
      throw new Error(`Missing or invalid ${label}.priceRange`);
    }
    if (rangeMin > rangeMax) {
      const tmp = rangeMin;
      rangeMin = rangeMax;
      rangeMax = tmp;
    }
    priceRange = { min: rangeMin, max: rangeMax };
  } else {
    throw new Error(`Missing or invalid ${label}.priceRange`);
  }

  // buyPrice があるのに priceRange が無い／逆は不正
  if ((buyPrice === null) !== (priceRange === null)) {
    throw new Error(`Missing or invalid ${label} price fields`);
  }

  if (buyPrice !== null && retailPrice !== null && buyPrice > retailPrice) {
    buyPrice = retailPrice;
  }

  // buyPrice がレンジ外なら最小限の整合だけ取る（幅の決め打ちはしない）
  if (buyPrice !== null && priceRange) {
    let { min: rangeMin, max: rangeMax } = priceRange;
    if (buyPrice < rangeMin) rangeMin = buyPrice;
    if (buyPrice > rangeMax) rangeMax = buyPrice;
    priceRange = { min: rangeMin, max: rangeMax };
  }

  const gradesRaw = band.grades;
  const grades = Array.isArray(gradesRaw)
    ? gradesRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
    : [];

  return {
    buyPrice,
    priceRange,
    retailPrice,
    grades,
  };
}

function parseAndValidateEstimateV4Result(
  raw: string,
  opts: { grade?: string }
): EstimateV4Result {
  const grade = opts.grade?.trim() || undefined;
  let json: unknown;
  try {
    json = JSON.parse(extractJsonObjectText(raw));
  } catch {
    throw new Error("AI response is not valid JSON");
  }
  if (!json || typeof json !== "object") {
    throw new Error("AI response is not an object");
  }

  const o = json as Record<string, unknown>;
  const standard = parseEstimateV4GradeBand(o.standard, "standard");
  const top = parseEstimateV4GradeBand(o.top, "top");

  const confidenceRaw = o.confidence;
  if (typeof confidenceRaw !== "string" || !V4_CONFIDENCE_VALUES.includes(confidenceRaw as EstimateV4Confidence)) {
    throw new Error("Missing or invalid confidence");
  }
  const confidence = confidenceRaw as EstimateV4Confidence;

  const lowPriceMarketTypeRaw = o.lowPriceMarketType;
  if (
    typeof lowPriceMarketTypeRaw !== "string" ||
    !V4_LOW_PRICE_MARKET_TYPES.includes(lowPriceMarketTypeRaw as EstimateV4LowPriceMarketType)
  ) {
    throw new Error("Missing or invalid lowPriceMarketType");
  }
  const lowPriceMarketType = lowPriceMarketTypeRaw as EstimateV4LowPriceMarketType;

  if (typeof o.lowPriceCheckUsed !== "boolean") {
    throw new Error("Missing or invalid lowPriceCheckUsed");
  }
  if (typeof o.reasoning !== "string" || !o.reasoning.trim()) {
    throw new Error("Missing or invalid reasoning");
  }

  const sourcesRaw = o.sources;
  const sources: EstimateV4Result["sources"] = [];
  if (Array.isArray(sourcesRaw)) {
    for (const item of sourcesRaw) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const sourceName = typeof s.sourceName === "string" ? s.sourceName.trim() : "";
      const url = typeof s.url === "string" ? s.url.trim() : "";
      const checkedData = typeof s.checkedData === "string" ? s.checkedData.trim() : "";
      if (!sourceName || !url || !checkedData) continue;
      sources.push({ sourceName, url, checkedData });
    }
  }

  let focus: EstimateV4Result["focus"];
  if (grade) {
    const focusRaw = o.focus;
    if (!focusRaw) {
      throw new Error("Missing or invalid focus");
    }
    const focusBand = parseEstimateV4GradeBand(focusRaw, "focus");
    focus = focusBandFromGradeInput(grade, focusBand);
  } else {
    focus = buildOverallFocusBand(standard, top);
  }

  return {
    standard,
    top,
    focus,
    confidence,
    lowPriceCheckUsed: o.lowPriceCheckUsed,
    lowPriceMarketType,
    reasoning: o.reasoning.trim(),
    sources,
  };
}
