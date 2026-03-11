import OpenAI from "openai";
import type { EstimateResult } from "./types";
import { ESTIMATE_SYSTEM_PROMPT, buildUserMessage } from "./prompt";

/** サーバー側でのみ使用。APIキーはクライアントに露出しない */
function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: key });
}

/**
 * 車体画像・メーター画像と付帯情報から査定JSONを取得
 * @param exteriorImageBase64 - 車体写真（base64）
 * @param meterImageBase64 - メーター写真（base64）
 * @param vin - 車台番号（任意）
 * @param memo - メモ（任意）
 */
export async function getEstimateFromOpenAI(
  exteriorImageBase64: string,
  meterImageBase64: string,
  vin: string | null,
  memo: string | null
): Promise<EstimateResult> {
  const openai = getOpenAIClient();
  const userText = buildUserMessage(vin, memo);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    messages: [
      { role: "system", content: ESTIMATE_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userText,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${exteriorImageBase64}`,
              detail: "high",
            },
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${meterImageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  const parsed = parseAndValidateEstimateResult(content);
  return parsed;
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

  return {
    vehicleEstimate: {
      make: ensureString(vehicleEstimate.make, ""),
      model: ensureString(vehicleEstimate.model, ""),
      generation: ensureString(vehicleEstimate.generation, ""),
      yearEstimate: ensureString(vehicleEstimate.yearEstimate, ""),
      mileage: ensureString(vehicleEstimate.mileage, ""),
      gradeEstimate: ensureString(vehicleEstimate.gradeEstimate, ""),
      bodyColor: ensureString(vehicleEstimate.bodyColor, ""),
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
  };
}
