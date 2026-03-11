import { EstimateForm } from "@/components/estimate-form";

export default function EstimatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">相場予想</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          車体写真・メーター写真をアップロードし、任意で車台番号・メモを入力してください。
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card ring-1 ring-gray-100/80 sm:p-8">
        <EstimateForm />
      </div>
    </div>
  );
}
