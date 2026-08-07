export type EstimateV3Input = {
  maker: string;
  carName: string;
  year: number;
  grade?: string;
  color?: string;
  mileage: number;
  formInfo?: string;
};

const INPUT_KEY = "estimate-v3-input";

export function saveEstimateV3Input(input: EstimateV3Input) {
  sessionStorage.setItem(INPUT_KEY, JSON.stringify(input));
}

export function loadEstimateV3Input(): EstimateV3Input | null {
  try {
    const raw = sessionStorage.getItem(INPUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EstimateV3Input>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.maker !== "string" || typeof parsed.carName !== "string") return null;
    if (typeof parsed.year !== "number" || !Number.isFinite(parsed.year)) return null;
    if (typeof parsed.mileage !== "number" || !Number.isFinite(parsed.mileage)) return null;

    const grade =
      typeof parsed.grade === "string" && parsed.grade.trim() ? parsed.grade.trim() : undefined;
    const color =
      typeof parsed.color === "string" && parsed.color.trim() ? parsed.color.trim() : undefined;
    const formInfo =
      typeof parsed.formInfo === "string" && parsed.formInfo.trim()
        ? parsed.formInfo.trim()
        : undefined;

    return {
      maker: parsed.maker,
      carName: parsed.carName,
      year: Math.round(parsed.year),
      mileage: Math.round(parsed.mileage),
      ...(grade ? { grade } : {}),
      ...(color ? { color } : {}),
      ...(formInfo ? { formInfo } : {}),
    };
  } catch {
    return null;
  }
}
