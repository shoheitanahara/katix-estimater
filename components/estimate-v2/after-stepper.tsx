const BRAND = "rgb(64 162 96)";

type Step = 1 | 2;

export function V2AfterStepper(props: { active: Step }) {
  const { active } = props;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      <div
        className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 sm:px-4"
        style={{
          backgroundColor: active === 1 ? "rgba(64, 162, 96, 0.12)" : "#f3f4f6",
          color: active === 1 ? "rgb(30, 30, 30)" : "#6b7280",
        }}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: active === 1 ? BRAND : "#9ca3af" }}
        >
          1
        </span>
        <span className="text-xs font-semibold sm:text-sm">写真</span>
      </div>
      <div className="text-gray-300">→</div>
      <div
        className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 sm:px-4"
        style={{
          backgroundColor: active === 2 ? "rgba(64, 162, 96, 0.12)" : "#f3f4f6",
          color: active === 2 ? "rgb(30, 30, 30)" : "#6b7280",
        }}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: active === 2 ? BRAND : "#9ca3af" }}
        >
          2
        </span>
        <span className="text-xs font-semibold sm:text-sm">車両情報</span>
      </div>
    </div>
  );
}
