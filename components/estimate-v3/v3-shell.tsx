import Image from "next/image";
import Link from "next/link";

function formatMileage(km: number): string {
  return new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.round(km)));
}

const V3_BRAND_GREEN = "rgb(64 162 96)";

export function EstimateV3Header(props: {
  maker?: string;
  carName?: string;
  year?: number;
  grade?: string;
  color?: string;
  mileage?: number;
}) {
  const { maker, carName, year, grade, color, mileage } = props;
  const hasMeta =
    maker ||
    carName ||
    typeof mileage === "number" ||
    typeof year === "number" ||
    grade ||
    color;

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/logo.webp" alt="KATIX" width={78} height={22} priority />
        </Link>
        <div className="flex items-center gap-2" />
      </div>

      {hasMeta && (
        <div className="bg-white">
          <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="font-semibold text-gray-900">
                {maker ?? "—"} {carName ?? "—"}
              </span>
              {typeof year === "number" && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{year}年式</span>
                </>
              )}
              {grade && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{grade}</span>
                </>
              )}
              {color && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{color}</span>
                </>
              )}
              <span className="text-gray-300">•</span>
              <span>{typeof mileage === "number" ? `${formatMileage(mileage)}km` : "—km"}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function EstimateV3Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div
          className="overflow-hidden rounded-2xl shadow-card ring-1"
          style={{ backgroundColor: V3_BRAND_GREEN, borderColor: "rgba(0,0,0,0.06)" }}
        >
          <div className="relative px-4 py-4 sm:px-8 sm:py-6">
            <div className="relative h-[250px] w-full overflow-hidden rounded-xl sm:hidden">
              <Image
                src="/brand/first-view-sp.webp"
                alt="愛車の売却カチエックス"
                fill
                sizes="(max-width: 639px) 100vw, 0px"
                priority
                className="object-cover object-top"
              />
            </div>
            <div className="relative hidden h-[180px] w-full overflow-hidden rounded-xl sm:block lg:h-[200px]">
              <Image
                src="/brand/first-view-pc.webp"
                alt="愛車の売却カチエックス"
                fill
                sizes="(min-width: 640px) 100vw, 0px"
                priority
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EstimateV3Card(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card ring-1 ring-gray-100/80 sm:p-8">
      {props.children}
    </div>
  );
}
