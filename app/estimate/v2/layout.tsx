import { V2PageFooter } from "@/components/estimate-v2/v2-page-footer";

export default function EstimateV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex-1">{children}</div>
      <V2PageFooter />
    </div>
  );
}

