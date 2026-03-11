# KATIX 相場予想ツール（MVP）

中古車の車体写真・メーター写真をアップロードすると、AI が KATIX の相場予想（落札予想レンジ）を推定するツールです。

## 技術スタック

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API（サーバー側のみ）

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に OPENAI_API_KEY を設定
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `OPENAI_API_KEY` | OpenAI API キー（必須） |

## 画面

- **/** … トップ。説明と「相場を予想する」ボタン
- **/estimate** … 車体写真・メーター写真をアップロード（プレビュー表示）、車台番号・メモを入力して「相場を予想する」
- **/result/[id]** … 相場予想結果（対象画像・車両推定・**KATIX相場予想**・業者オークション相場参考・価格変動・総合コメント）

## API

- **POST /api/estimate** … `multipart/form-data`（exteriorImage, meterImage, vin, memo）。成功時は `{ ok: true, id, result, images: { exterior, meter } }` を返却（画像は base64）。
- **GET /api/result/[id]** … 予想結果を返却（同一インスタンスのメモリに保存されている場合。画像は含まない）。

## 注意（MVP）

- 予想結果と画像は **インメモリ + クライアントの sessionStorage** で保持しています。POST 直後のリダイレクトではレスポンスの結果・画像を sessionStorage に保存し、結果ページで表示します。
- 認証・DB・履歴・管理画面は未実装です。

## デプロイ（Vercel）

リポジトリを Vercel に連携し、環境変数 `OPENAI_API_KEY` を設定してデプロイしてください。
