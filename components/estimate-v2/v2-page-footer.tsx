/**
 * 開発用注記（v2 / モック等）。本番前にこのブロックごと削除しやすいよう1ファイルに集約。
 */
export function V2PageFooter() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-gray-50/90 py-8">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-[10px] leading-relaxed text-gray-400">
          ※テキスト査定フローは検証用の画面構成を含みます。表示・文言は実運用と異なる場合があります（v2 / モック表記は開発時の整理用です）。
        </p>
      </div>
    </footer>
  );
}
