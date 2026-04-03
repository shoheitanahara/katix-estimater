# v2 相場予想 API（テキストのみ）

画像なしで、メーカー・車種・年式・走行距離から AI 相場予想を返します。認証はなく、**長い URL を知っている人だけ**が叩ける想定です（身内・友人向け）。

## エンドポイント

`POST` のみ。

**本番（デプロイ先）**

```
https://katix-estimater.vercel.app/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c
```

**ローカル開発**

```
http://localhost:3000/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c
```

同じ処理の短い URL（アプリ内 UI 用）: `POST /api/estimate-v2`

## リクエスト

- **Content-Type**: `application/json`
- **Body**

| フィールド | 必須 | 説明 |
|------------|------|------|
| `maker` または `make` | はい（どちらか） | メーカー名 |
| `model` | はい | 車種名 |
| `year` | いいえ | 西暦（1980〜2100）。省略可 |
| `mileageKm` | はい | 走行距離（km）。数値または `"45,000"` のような文字列可 |

## レスポンス

成功時 HTTP 200:

```json
{
  "ok": true,
  "result": {
    "assumption": { "auctionScore": "…", "notes": "…" },
    "input": { "make": "…", "model": "…", "year": 2019, "mileageKm": 45000 },
    "auctionExpected": { "rangeMinMan": 0, "rangeMaxMan": 0, "centerMan": 0 },
    "comment": "…",
    "confidencePercent": 50
  }
}
```

`result` の詳細な型は `lib/types.ts` の `EstimateV2Result`。金額は **万円** 単位。`confidencePercent` は無い場合があります。

失敗時: `{ "ok": false, "error": "日本語メッセージ" }`（HTTP 400 / 500 など）。

## curl 例（本番）

```bash
curl -sS -X POST "https://katix-estimater.vercel.app/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c" \
  -H "Content-Type: application/json" \
  -d '{"maker":"トヨタ","model":"プリウス","year":2019,"mileageKm":45000}'
```

ローカルでは URL を `http://localhost:3000/...` に置き換えてください。

## サーバー要件

デプロイ先に `OPENAI_API_KEY` が必要です（このリポジトリのサーバーが OpenAI を呼びます）。

## パスを変えたいとき

`app/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c/` のフォルダ名をリネームし、このファイルの URL 表記を合わせて更新してください。
