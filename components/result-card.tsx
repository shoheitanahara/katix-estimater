import type { EstimateResult } from "@/lib/types";

/** 結果表示用に一時保存した画像（base64） */
export interface ResultImages {
  exterior: string;
  meter: string;
}

interface ResultCardProps {
  result: EstimateResult;
  images?: ResultImages | null;
}

function Section({
  title,
  children,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-5 shadow-card transition-shadow sm:p-6 ${
        muted ? "border border-gray-100" : "border border-gray-100/80"
      }`}
    >
      <h2
        className={`mb-4 text-sm font-semibold tracking-wide ${
          muted ? "text-gray-400" : "text-gray-700"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function DlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

/** base64 を data URL に変換（プレフィックスが無い場合のみ） */
function toDataUrl(base64: string, mime = "image/jpeg"): string {
  if (base64.startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
}

/** KATIX 相場カード：落札予想を主役に、最低保証は補足 */
function KatixPriceCard({
  label,
  rangeMin,
  rangeMax,
  guarantee,
}: {
  label: string;
  rangeMin: number;
  rangeMax: number;
  guarantee: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-gray-100/80 transition-shadow hover:shadow-card-hover sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-katix-dark sm:text-4xl">
        {rangeMin}
        <span className="mx-1 font-normal text-gray-400">〜</span>
        {rangeMax}
        <span className="ml-1 text-xl font-semibold text-gray-600 sm:text-2xl">万円</span>
      </p>
      <p className="mt-2 text-xs text-gray-500">
        最低保証 {guarantee}万円
      </p>
    </div>
  );
}

export function ResultCard({ result, images }: ResultCardProps) {
  const { vehicleEstimate, auctionMarket, katixPrediction, priceFactors, comment } =
    result;
  const v = vehicleEstimate;
  const kGood = katixPrediction.goodCondition;
  const kUsed = katixPrediction.usedCondition;

  return (
    <div className="space-y-6">
      {/* 対象画像 */}
      {images?.exterior && images?.meter && (
        <Section title="対象の画像">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-400">車体</p>
              <img
                src={toDataUrl(images.exterior)}
                alt="車体"
                className="max-h-40 w-full rounded-xl border border-gray-100 object-cover object-center"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-400">メーター</p>
              <img
                src={toDataUrl(images.meter)}
                alt="メーター"
                className="max-h-40 w-full rounded-xl border border-gray-100 object-cover object-center"
              />
            </div>
          </div>
        </Section>
      )}

      <Section title="車両推定">
        <dl className="space-y-0">
          <DlRow label="車種" value={`${v.make} ${v.model}`.trim() || v.model} />
          <DlRow label="世代（型式）" value={v.generation} />
          <DlRow label="年式推定" value={v.yearEstimate} />
          <DlRow label="走行距離" value={v.mileage} />
          <DlRow label="グレード推定" value={v.gradeEstimate} />
          <DlRow label="ボディカラー" value={v.bodyColor} />
          <DlRow label="状態評価" value={v.condition} />
        </dl>
      </Section>

      {/* KATIX 相場予想：落札予想を主役に */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-katix-light to-white p-6 shadow-card ring-1 ring-katix/10 sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-katix/15 px-2.5 py-0.5 text-xs font-semibold text-katix-dark">
            KATIX
          </span>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            相場予想
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <KatixPriceCard
            label="美車（評価4〜4.5）"
            rangeMin={kGood.rangeMinMan}
            rangeMax={kGood.rangeMaxMan}
            guarantee={kGood.guaranteeMan}
          />
          <KatixPriceCard
            label="使用感あり（評価3〜3.5）"
            rangeMin={kUsed.rangeMinMan}
            rangeMax={kUsed.rangeMaxMan}
            guarantee={kUsed.guaranteeMan}
          />
        </div>
      </section>

      {/* 業者オークション相場：控えめ */}
      <Section title="業者オークション相場（参考）" muted>
        <p className="text-sm text-gray-500">
          {auctionMarket.rangeMinMan}万円 〜 {auctionMarket.rangeMaxMan}万円
        </p>
      </Section>

      <Section title="価格変動の可能性">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-katix-dark">
              上振れ可能性
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {priceFactors.upside.length > 0
                ? priceFactors.upside.map((item, i) => <li key={i}>・{item}</li>)
                : <li className="text-gray-400">—</li>}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              下振れ可能性
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {priceFactors.downside.length > 0
                ? priceFactors.downside.map((item, i) => <li key={i}>・{item}</li>)
                : <li className="text-gray-400">—</li>}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="総合コメント">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {comment || "—"}
        </p>
      </Section>
    </div>
  );
}
