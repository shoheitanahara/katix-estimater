import type { Metadata } from "next";

import reportJson from "@/data/validate-v2-report.json";
import type { ValidateV2Report } from "@/lib/validate-v2-report";

import { ValidationReportClient } from "./validation-report-client";

export const metadata: Metadata = {
  title: "検証レポート（v2） | KATIX",
  description: "AI相場予想（v2）のバッチ検証結果（経営向け）",
  robots: { index: false, follow: false },
};

export default function ValidationReportPage() {
  const data = reportJson as ValidateV2Report;
  return <ValidationReportClient data={data} />;
}
