import { ResultView } from "@/components/result-view";

interface ResultPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  return <ResultView id={id} />;
}
