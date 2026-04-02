export type EstimateV2Input = {
  make: string;
  model: string;
  year?: number;
  mileageKm: number;
};

const INPUT_KEY = "estimate-v2-input";
const EMAIL_KEY = "estimate-v2-email";

export function saveEstimateV2Input(input: EstimateV2Input) {
  sessionStorage.setItem(INPUT_KEY, JSON.stringify(input));
}

export function loadEstimateV2Input(): EstimateV2Input | null {
  try {
    const raw = sessionStorage.getItem(INPUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EstimateV2Input>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.make !== "string" || typeof parsed.model !== "string") return null;
    if (typeof parsed.mileageKm !== "number" || !Number.isFinite(parsed.mileageKm)) return null;
    const yearRaw = parsed.year;
    const year =
      typeof yearRaw === "number" && Number.isFinite(yearRaw) ? Math.round(yearRaw) : undefined;
    return {
      make: parsed.make,
      model: parsed.model,
      ...(year !== undefined ? { year } : {}),
      mileageKm: Math.round(parsed.mileageKm),
    };
  } catch {
    return null;
  }
}

export function saveEstimateV2Email(email: string) {
  sessionStorage.setItem(EMAIL_KEY, email);
}

export function loadEstimateV2Email(): string | null {
  const raw = sessionStorage.getItem(EMAIL_KEY);
  const email = typeof raw === "string" ? raw.trim() : "";
  return email ? email : null;
}

