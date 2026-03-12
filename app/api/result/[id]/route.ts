import { NextResponse } from "next/server";
import { getResult } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID is required" },
      { status: 400 }
    );
  }

  const stored = getResult(id);
  if (!stored) {
    return NextResponse.json(
      { error: "相場予想結果が見つかりません。セッションが切れた可能性があります。" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    result: stored.result,
    images: stored.images,
    input: stored.input,
  });
}
