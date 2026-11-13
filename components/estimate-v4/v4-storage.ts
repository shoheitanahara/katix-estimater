import type {
  EstimateV4ColorFamily,
  EstimateV4MileageBand,
  EstimateV4OriginType,
} from "@/lib/types";
import { ESTIMATE_V4_COLOR_FAMILIES, ESTIMATE_V4_MILEAGE_BANDS, ESTIMATE_V4_ORIGIN_TYPES } from "@/lib/types";

export type EstimateV4Input = {
  maker: string;
  carName: string;
  year: number;
  mileageBand: EstimateV4MileageBand;
  colorFamily: EstimateV4ColorFamily;
  originType: EstimateV4OriginType;
  grade?: string;
};

const INPUT_KEY = "estimate-v4-input";

function isMileageBand(value: unknown): value is EstimateV4MileageBand {
  return typeof value === "string" && (ESTIMATE_V4_MILEAGE_BANDS as readonly string[]).includes(value);
}

function isColorFamily(value: unknown): value is EstimateV4ColorFamily {
  return typeof value === "string" && (ESTIMATE_V4_COLOR_FAMILIES as readonly string[]).includes(value);
}

function isOriginType(value: unknown): value is EstimateV4OriginType {
  return typeof value === "string" && (ESTIMATE_V4_ORIGIN_TYPES as readonly string[]).includes(value);
}

export function saveEstimateV4Input(input: EstimateV4Input) {
  sessionStorage.setItem(INPUT_KEY, JSON.stringify(input));
}

export function loadEstimateV4Input(): EstimateV4Input | null {
  try {
    const raw = sessionStorage.getItem(INPUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EstimateV4Input>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.maker !== "string" || typeof parsed.carName !== "string") return null;
    if (typeof parsed.year !== "number" || !Number.isFinite(parsed.year)) return null;
    if (!isMileageBand(parsed.mileageBand)) return null;
    if (!isColorFamily(parsed.colorFamily)) return null;

    const originType: EstimateV4OriginType = isOriginType(parsed.originType) ? parsed.originType : "domestic";

    const grade =
      typeof parsed.grade === "string" && parsed.grade.trim() ? parsed.grade.trim() : undefined;

    if (originType === "domestic" && grade) return null;

    return {
      maker: parsed.maker,
      carName: parsed.carName,
      year: Math.round(parsed.year),
      mileageBand: parsed.mileageBand,
      colorFamily: parsed.colorFamily,
      originType,
      ...(grade ? { grade } : {}),
    };
  } catch {
    return null;
  }
}
