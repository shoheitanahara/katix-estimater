"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function shouldHideHeader(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/estimate/v2");
}

export function SiteHeader() {
  const pathname = usePathname();
  if (shouldHideHeader(pathname)) return null;

  return (
    <header className="bg-katix shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-white">
          KATIX 相場予想ツール
        </Link>
        <Link
          href="/estimate"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-katix shadow-sm transition-colors hover:bg-katix-light"
        >
          相場を予想
        </Link>
      </div>
    </header>
  );
}

