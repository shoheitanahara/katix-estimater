export default function EstimateV4Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex-1">{children}</div>
    </div>
  );
}
