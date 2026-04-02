"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { V2AfterStepper } from "@/components/estimate-v2/after-stepper";
import { EstimateV2Header } from "@/components/estimate-v2/v2-shell";
import { loadEstimateV2Input } from "@/components/estimate-v2/v2-storage";

export default function EstimateV2UploadVehicleMockPage() {
  const router = useRouter();
  const input = useMemo(() => (typeof window === "undefined" ? null : loadEstimateV2Input()), []);

  const [accident, setAccident] = useState<string>("none");
  const [transmission, setTransmission] = useState<string>("at");
  const [smellNone, setSmellNone] = useState(true);
  const [smellPet, setSmellPet] = useState(false);
  const [smellTobacco, setSmellTobacco] = useState(false);
  const [smellOther, setSmellOther] = useState(false);
  const [petHistory, setPetHistory] = useState(false);
  const [comments, setComments] = useState("");
  const [loan, setLoan] = useState<string>("unknown");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push("/estimate/v2/complete");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <EstimateV2Header
        make={input?.make}
        model={input?.model}
        year={input?.year}
        mileageKm={input?.mileageKm}
      />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-2xl sm:px-6">
        <div className="mb-6">
          <V2AfterStepper active={2} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-100 sm:p-6">
            <h1 className="text-lg font-extrabold text-gray-900">車両の詳細（モック）</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              事故・修復歴や内装の状態などを入力してください。送信はローカルのみで、サーバーには保存されません。
            </p>
          </div>

          <VehicleSection title="事故・修復歴">
            <div className="flex flex-wrap gap-3">
              <RadioChip name="accident" value="none" checked={accident === "none"} onChange={setAccident} label="なし" />
              <RadioChip name="accident" value="yes" checked={accident === "yes"} onChange={setAccident} label="あり" />
              <RadioChip name="accident" value="unknown" checked={accident === "unknown"} onChange={setAccident} label="不明" />
            </div>
          </VehicleSection>

          <VehicleSection title="ミッション">
            <div className="flex flex-wrap gap-3">
              <RadioChip name="tm" value="at" checked={transmission === "at"} onChange={setTransmission} label="AT" />
              <RadioChip name="tm" value="mt" checked={transmission === "mt"} onChange={setTransmission} label="MT" />
            </div>
          </VehicleSection>

          <VehicleSection title="内装のニオイ">
            <div className="flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={smellNone}
                  onChange={(e) => setSmellNone(e.target.checked)}
                  className="rounded border-gray-300 text-[rgb(64,162,96)] focus:ring-[rgb(64,162,96)]"
                />
                特になし
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={smellPet}
                  onChange={(e) => setSmellPet(e.target.checked)}
                  className="rounded border-gray-300 text-[rgb(64,162,96)] focus:ring-[rgb(64,162,96)]"
                />
                ペット
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={smellTobacco}
                  onChange={(e) => setSmellTobacco(e.target.checked)}
                  className="rounded border-gray-300 text-[rgb(64,162,96)] focus:ring-[rgb(64,162,96)]"
                />
                タバコ
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={smellOther}
                  onChange={(e) => setSmellOther(e.target.checked)}
                  className="rounded border-gray-300 text-[rgb(64,162,96)] focus:ring-[rgb(64,162,96)]"
                />
                その他
              </label>
            </div>
          </VehicleSection>

          <VehicleSection title="ペット同乗歴">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={petHistory}
                onChange={(e) => setPetHistory(e.target.checked)}
                className="rounded border-gray-300 text-[rgb(64,162,96)] focus:ring-[rgb(64,162,96)]"
              />
              ペット同乗歴あり（イメージ）
            </label>
          </VehicleSection>

          <VehicleSection title="オーナーからのコメント">
            <textarea
              id="comments"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="気になる点があれば自由に記入（モック）"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-[rgb(64,162,96)] focus:outline-none focus:ring-1 focus:ring-[rgb(64,162,96)]"
            />
          </VehicleSection>

          <VehicleSection title="ローン残債">
            <div className="flex flex-wrap gap-3">
              <RadioChip name="loan" value="none" checked={loan === "none"} onChange={setLoan} label="なし" />
              <RadioChip name="loan" value="yes" checked={loan === "yes"} onChange={setLoan} label="あり" />
              <RadioChip name="loan" value="unknown" checked={loan === "unknown"} onChange={setLoan} label="不明" />
            </div>
          </VehicleSection>

          <div className="flex flex-col gap-3 pb-10 sm:flex-row sm:justify-between">
            <Link
              href="/estimate/v2/upload-photos"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              ← 写真に戻る
            </Link>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
              style={{ backgroundColor: "rgb(64 162 96)" }}
            >
              入力を完了する
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function VehicleSection(props: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-gray-100 sm:p-6">
      <h2 className="text-sm font-semibold leading-snug text-gray-900">{props.title}</h2>
      <div className="mt-3">{props.children}</div>
    </section>
  );
}

function RadioChip(props: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        props.checked
          ? "border-[rgb(64,162,96)] bg-[rgba(64,162,96,0.1)] text-gray-900"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <input
        type="radio"
        name={props.name}
        value={props.value}
        checked={props.checked}
        onChange={() => props.onChange(props.value)}
        className="border-gray-300 text-[rgb(64,162,96)] focus:ring-[rgb(64,162,96)]"
      />
      {props.label}
    </label>
  );
}
