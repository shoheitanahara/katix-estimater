# v2 相場予想 API（テキストのみ）

画像なしで、メーカー・車種・年式・走行距離から AI 相場予想を返します。認証はなく、**長い URL を知っている人だけ**が叩ける想定です（身内・友人向け）。

---

## エンドポイント

`POST` のみ。

```
https://katix-estimater.vercel.app/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c
```

---

## リクエスト

- **Content-Type**: `application/json`
- **Body**

| フィールド | 必須 | 説明 |
|------------|------|------|
| `maker` または `make` | はい（どちらか） | メーカー名 |
| `model` | はい | 車種名 |
| `year` | いいえ | 西暦（1980〜2100）。省略可 |
| `mileageKm` | はい | 走行距離（km）。数値または `"45,000"` のような文字列可 |

---

## レスポンス（成功時 HTTP 200）

```json
{
  "ok": true,
  "result": {
    "assumption": { "auctionScore": "美車〜良質車", "notes": "…" },
    "input": { "make": "…", "model": "…", "year": 2019, "mileageKm": 45000 },
    "auctionExpected": { "rangeMinMan": 0, "rangeMaxMan": 0, "centerMan": 0 },
    "comment": "…",
    "confidencePercent": 55
  }
}
```

`confidencePercent` は無いこともある（キー省略）。金額系は **万円（整数の「万」単位）**。

失敗時: `{ "ok": false, "error": "日本語メッセージ" }`（HTTP 400 / 500 など）。

---

## result の見方

読む順の目安: **①前提 → ②金額 → ③コメント・自信度 → ④入力の写し**。

### ① `assumption`

| フィールド | 意味 |
|------------|------|
| `auctionScore` | 車両状態の前提ラベル（例: 「美車〜良質車」）。数値の評点は使わない方針の文言。 |
| `notes` | 前提の補足・不確実性（短い文章）。 |

### ② `auctionExpected`（万円単位）

| フィールド | 位置づけ |
|------------|----------|
| **`centerMan`** | **メイン指標**。予想の中心。代表値として使うならこれを優先。 |
| `rangeMinMan` | **サブ指標**。レンジ下限の目安。 |
| `rangeMaxMan` | **サブ指標**。レンジ上限の目安。 |

円に直す場合は **`centerMan × 10,000` 円**（`rangeMinMan` / `rangeMaxMan` も同様）。

### ③ `comment` と `confidencePercent`

| フィールド | 意味 |
|------------|------|
| `comment` | 短い説明テキスト（改行可）。 |
| `confidencePercent`（任意） | 自信度（整数・パーセント）。予想価格が実際の落札にどれだけ近いかの目安。**10〜90** の範囲で返る。無い場合はキー省略。 |

自信度は参考値（低いほどブレやすい想定、高いほど安定しそう、という読み方）。

### ④ `input`

リクエストを AI が解釈・正規化したメーカー・車種・年式・走行距離。ログや表示の確認用。

---

## curl 例

```bash
curl -sS -X POST "https://katix-estimater.vercel.app/api/katix-shared/v2/estimate-text/7f8a9b2c4d3e4f1a9c6b5d4e3f2a1b0c" \
  -H "Content-Type: application/json" \
  -d '{"maker":"トヨタ","model":"プリウス","year":2019,"mileageKm":45000}'
```
