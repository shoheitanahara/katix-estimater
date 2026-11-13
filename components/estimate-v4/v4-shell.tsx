import Image from "next/image";
import Link from "next/link";

const V4_BRAND_GREEN = "rgb(64 162 96)";

export function EstimateV4Header(props: {
  maker?: string;
  carName?: string;
  year?: number;
  mileageBand?: string;
  colorFamily?: string;
  originType?: "domestic" | "import";
  grade?: string;
}) {
  const { maker, carName, year, mileageBand, colorFamily, originType, grade } = props;
  const hasMeta =
    maker ||
    carName ||
    typeof year === "number" ||
    mileageBand ||
    colorFamily ||
    originType ||
    grade;

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
              {mileageBand && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{mileageBand}</span>
                </>
              )}
              {colorFamily && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{colorFamily}</span>
                </>
              )}
              {originType && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{originType === "import" ? "輸入車" : "国産車"}</span>
                </>
              )}
              {grade && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>{grade}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function EstimateV4Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div
          className="overflow-hidden rounded-2xl shadow-card ring-1"
          style={{ backgroundColor: V4_BRAND_GREEN, borderColor: "rgba(0,0,0,0.06)" }}
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

export function EstimateV4Card(props: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card ring-1 ring-gray-100/80 sm:p-8">
      {props.children}
    </div>
  );
}
