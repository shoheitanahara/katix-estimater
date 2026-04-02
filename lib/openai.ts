import OpenAI from "openai";
import type { EstimateResult, EstimateV2Result } from "./types";
import {
  ESTIMATE_SYSTEM_PROMPT,
  ESTIMATE_V2_SYSTEM_PROMPT,
  buildUserMessage,
  buildUserMessageV2,
} from "./prompt";

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
      temperature: 0.2,
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
 * v2: メーカー/車種/走行距離（テキストのみ）から「評点4〜5想定」の予想落札価格を取得
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
        temperature: opts?.retry ? 0 : 0.2,
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
      auctionScore: ensureString(assumption.auctionScore, "4〜5点"),
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
