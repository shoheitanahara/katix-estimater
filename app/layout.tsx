import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KATIX 相場予想ツール",
  description: "写真2枚でKATIX相場を予想。AIが車種・KATIX落札予想を推定します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="min-h-screen bg-[var(--surface)] font-sans antialiased">
        <header className="bg-katix shadow-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-semibold text-white">
              KATIX 相場予想ツール
            </a>
            <a
              href="/estimate"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-katix shadow-sm transition-colors hover:bg-katix-light"
            >
              相場を予想
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
