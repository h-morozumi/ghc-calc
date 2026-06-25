# 仕様書: Azure Retail Prices API による価格・為替の自動同期 + 画面FXレート編集

> 本書は GitHub Copilot Coding Agent (GHC) にそのまま渡して実装できることを目的とした実装仕様である。
> 対象リポジトリ: `ghc-calc`（React + TypeScript + Vite + Tailwind + shadcn/ui + pnpm、GitHub Pages 配信）。

## 0. 背景とゴール

`src/data/pricing.json` のシート単価・AI Credit 単価・PPP ティア・USD→JPY 為替レートは現在ハードコードされている（例 `fx.rates.JPY: 160`）。これを次の2つで改善する。

1. **Azure Retail Prices API（認証不要・無料）から月次で自動同期**し、差分があれば PR を自動起票する。
2. **画面から為替レートを編集可能にし、URL state にシリアライズして共有リンクで復元**できるようにする。「最新レートに戻す」操作でバンドル JSON の最新値へリセットする。

### 検証済みの前提（この仕様の根拠）

- Azure Retail Prices API に `serviceName eq 'GitHub'` のメーターが存在し、Copilot Business/Enterprise シート、AI Credit、PPP、Premium Request、および **JPY 建て価格**がすべて取得できる。
- 為替レートは全 GitHub Copilot メーターで**単一**（現時点 **159.505**）。API は JPY を**フル精度（丸めなし）**で返す（例: Business = `3030.595`）。
- API の JPY 生値を **round half-up(2桁)** すると、Azure 公式料金計算ツールの表示（例 Business `3030.60` / Enterprise `6220.70`）と**1円単位まで一致**する。
- 計算ツールの表示レート「159.51」は 159.505 を四捨五入表示したものにすぎず、API とレート差はない。

## 1. スコープ

### In

1. 価格同期スクリプト `scripts/sync-pricing.ts`（Node 20+ のネイティブ `fetch` を使用。外部 HTTP ライブラリ禁止）。
2. `src/data/pricing.json` のスキーマ拡張（FX メタデータ追加、後方互換維持）と値同期。
3. GitHub Actions ワークフロー（月次 cron + 手動実行、差分時のみ PR 起票）。
4. フロントの金額フォーマッタ `roundHalfUp` / `formatMoney`（`src/lib/money.ts`）と Vitest テスト。
5. 画面の**為替レート編集 UI**と、URL state への `fxRate` シリアライズ/復元。

### Out（やらないこと・自動上書き禁止）

- `plans[].includedCreditsPerSeat` と `promotions` は GitHub のポリシー値であり API に存在しない。スクリプトは**これらを必ず保持**し、一切変更しない。
- **過去の USD 価格は追跡しない。** 価格バージョニング（per-version JSON、`pv` 等）は実装しない。価格更新は JSON 上書きのみ。
- バックエンド/サーバーサイドランタイム/外部ストレージは作らない（client-only の原則維持。同期スクリプトは CI/ローカルでのみ動作する開発ツール）。

## 2. データソース仕様（Azure Retail Prices API）

- ベース URL: `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview`
- 通貨指定クエリ: `&currencyCode='USD'` / `&currencyCode='JPY'`。**1リクエスト = 1通貨**。
- OData フィルタ: `&$filter=...`。**フィルタ値は大文字小文字を厳密一致**させること（2023-01-01-preview の仕様）。
- ページング: レスポンス JSON の `NextPageLink` が非 `null` の間ループし、全 `Items` を結合する。
- リトライ: HTTP 非 200 / ネットワークエラー時は指数バックオフで最大3回。最終失敗時は**部分書き込みを行わず**非ゼロ終了する。

### 使用フィルタ

| 用途 | `$filter` の値 |
|---|---|
| Copilot シート / AI Credit / Premium Request | `serviceName eq 'GitHub' and productName eq 'GitHub Copilot'` |
| PPP ティア | `serviceName eq 'GitHub' and productName eq 'GitHub AI Credits Pre-Purchase Plan'` |

## 3. メーター → `pricing.json` マッピング（USD 値で取得）

| 更新先（pricing.json） | productName | skuName | meterName | 期待 USD |
|---|---|---|---|---|
| `plans[id=business].seatPriceMonthly` | GitHub Copilot | `Business` | `Business User` | 19 |
| `plans[id=enterprise].seatPriceMonthly` | GitHub Copilot | `Enterprise` | `Enterprise User` | 39 |
| `overage.creditUnitPrice` | GitHub Copilot | `AI Credit` | `AI Credit GAC` | 0.01 |
| `premiumRequestPrice`（新規・任意） | GitHub Copilot | `Premium Request` | `Premium Request` | 0.04 |
| `pppTiers[commitUnits=20000]` の単価 | GitHub AI Credits Pre-Purchase Plan | `20,000 GHAICCUs` | — | 19,000 |
| `pppTiers[commitUnits=100000]` の単価 | 同上 | `100,000 GHAICCUs` | — | 90,000 |
| `pppTiers[commitUnits=500000]` の単価 | 同上 | `500,000 GHAICCUs` | — | 425,000 |

実装上の注意:

- 同一メーターが重複して返却され得るため、**`(skuName, meterName)` で一意化**する。`meterId` は PPP の3ティアで重複するため**キーに使わない**。
- `priceType` を確認する（シート/AI Credit/Premium は `Consumption`、PPP は `Reservation`）。
- PPP の `discountPct` は `round((1 - (commitUnitPrice / commitUnits)) * 100)` で再計算する（20,000→5、100,000→10、500,000→15）。`commitUnits` は GHAICCUs 数（1 CU = 1 USD 相当）。

## 4. 為替レート復元ルール（最重要）

- レートは**最大金額メーター（PPP 500,000 GHAICCUs）**から復元する: `rate = JPY(500k) / USD(500k)`（= 67,789,625 / 425,000 = **159.505**）。丸め誤差を最小化するため、必ず最大金額のメーターを使う。
- **整合性ガード**: GitHub Copilot の全メーターについて `JPY_raw / USD` を計算し、復元 `rate` との差が **±0.001 を超える**メーターが1つでもあれば、**異常としてジョブを失敗させ、ファイルを書き換えない**（Azure がサービス別レートを導入した等の異常検知）。
- `fx.rates.JPY` には**フル精度の rate**（例 `159.505`）を格納する。表示用に丸めてはならない。

## 5. JPY 表示丸めルール（フロント）

- 内部計算はすべて USD（または USD × rate のフル精度）で行い、**表示・小計・合計の最終段でのみ** round half-up(2桁) を適用する。
- JavaScript の浮動小数点誤差対策が必須。`6220.695 * 100 = 622069.4999…` となり `Math.round` が `6220.69` に落ちる罠があるため、`Number.EPSILON` 補正を入れる。
- `Number.prototype.toFixed()` の直接使用は禁止（環境により銀行丸めになる）。
- `Intl.NumberFormat` の JPY は既定で小数 0 桁になるため、JPY でも `maximumFractionDigits: 2` を明示する。

```ts
// src/lib/money.ts
export function roundHalfUp(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function formatMoney(value: number, currency: "USD" | "JPY"): string {
  const rounded = roundHalfUp(value, 2);
  return new Intl.NumberFormat(currency === "JPY" ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}
```

## 6. 画面 FX レート編集 + シリアライズ仕様

### 6.1 セマンティクス

URL state に**任意フィールド** `fxRate?: number` を持たせ、「ユーザーによる上書きの有無」を表現する。

| 状況 | 挙動 |
|---|---|
| ユーザーがレートを編集 | state に `fxRate` をセット → URL に乗る → 共有先で**その値で復元** |
| 「最新レートに戻す」ボタン | `fxRate` を**クリア（undefined）** → バンドル `pricing.json.fx.rates.JPY` の最新値を使用 |
| URL に `fxRate` 無し（新規訪問/未操作） | バンドル JSON の最新値を使用 |
| `fxRate` が不正値（NaN/0以下/数値でない） | 沈黙してデフォルトへリセット（throw しない。AGENTS.md の URL state 方針に準拠） |

- **シリアライズは上書き時のみ**。未操作ユーザーは将来の JSON 更新で自動的に最新レートへ追従し、明示的に上書きしたユーザーだけが値を固定（＝共有リンクで再現）できる。
- 計算で用いる実効レートは `effectiveRate = state.fxRate ?? pricing.fx.rates.JPY`。
- すべての JPY 表示は `formatMoney(usdAmount * effectiveRate, "JPY")` を通す（内部で round half-up）。

### 6.2 UI

- 表示通貨が JPY のとき、「為替レート（JPY/USD）」の数値入力フィールドと「最新レートに戻す」ボタンを表示する。
- 入力は正の数のみ受け付ける。空欄・不正値は無視し、実効レートはデフォルトにフォールバックする。
- ボタン押下で `fxRate` を `undefined` にし、`pricing.json` の値に戻す（**ネットワーク取得は行わない**。JSON はバンドル済みのためローカルリセット）。
- 補助テキスト: 「Azure の月次請求レート（既定 159.505）。実勢為替ではありません。」

## 7. 同期スクリプト仕様 `scripts/sync-pricing.ts`

- 実行: `pnpm sync:pricing`。`package.json` に `"sync:pricing": "tsx scripts/sync-pricing.ts"` を追加し、devDependency に `tsx` を追加する。Node 20+ のグローバル `fetch` を使用（外部 HTTP ライブラリ禁止）。
- 振る舞い:
  1. USD で §2 の2フィルタを取得し、ページング・`(skuName, meterName)` 一意化を行う。
  2. §3 の各値を抽出する。期待 USD と ±1% を超えて乖離した場合は**警告ログ**を出す（失敗はさせず値は更新する）。
  3. JPY で PPP 500,000 を取得し §4 で `rate` を復元、整合性ガードを実行する。
  4. 既存 `src/data/pricing.json` を読み込み、**§1 Out の項目を保持**したまま対象フィールドのみ更新する。`version` を実行月の `YYYY-MM` に、`fx` メタ（§8）を更新する。
  5. 更新後オブジェクトを既存ファイルと**深い等価比較**する。差分が無ければ**書き込まず**、ログに `no changes` を出力して正常終了（コード 0）。
  6. 差分がある場合のみ、整形済み JSON（2スペースインデント、末尾改行 1 個）で上書き保存する。
- 終了コード: 正常 = 0。ネットワーク全失敗・整合性ガード失敗 = 1（このとき**ファイルを書き換えない**）。

## 8. `pricing.json` スキーマ変更（後方互換）

`fx` を以下のように拡張する（既存 `rates` は維持）。

```jsonc
"fx": {
  "base": "USD",
  "rates": { "JPY": 159.505 },          // フル精度。画面FXのデフォルト兼「最新レートに戻す」先
  "capturedAt": "2026-07-02T03:00:00Z", // ISO8601(UTC)。同期実行時刻
  "source": "Azure Retail Prices API (api-version=2023-01-01-preview)",
  "recoveredFromSku": "500,000 GHAICCUs",
  "note": "Azureの月次請求レート。USD価格に一律適用。表示はround half-up(2dp)で公式計算ツールと一致。実勢為替ではない。"
}
```

- `version` は同期実行月の `YYYY-MM`。
- 新規任意フィールド `premiumRequestPrice`（USD, number）を追加してよい（UI 未使用なら非表示）。
- 既存の `plans` / `overage` / `promotions` / `pppTiers` / `pppNote` / `disclaimer` / `source` の構造は維持する。

## 9. ワークフロー `.github/workflows/sync-pricing.yml`

- トリガ:
  - `schedule: - cron: '0 3 1-3 * *'`（毎月 1〜3 日 03:00 UTC。GitHub Actions のスケジュール遅延/スキップに対する取りこぼし保険）。
  - `workflow_dispatch`（手動実行）。
- ステップ: checkout → `pnpm/action-setup` → `actions/setup-node`（Node 20, pnpm キャッシュ）→ `pnpm install --frozen-lockfile` → `pnpm sync:pricing` → `pnpm test` → 差分があれば PR 起票。
- 冪等性: `git status --porcelain` で `src/data/pricing.json` に差分があるときのみ PR を作成する。差分が無ければ PR を作らない。
- PR 起票: `peter-evans/create-pull-request` を使用。
  - branch: `bot/pricing-sync`
  - title: `chore(pricing): monthly Azure Retail Prices sync`
  - body: 取得日時、復元 `rate`、主要値の変更前後（Business / Enterprise / AI Credit / PPP 3 ティア）、および「best-effort、無料含有クレジットは API 非対象」の注記を含める。
- 権限: `permissions: { contents: write, pull-requests: write }`。

## 10. テスト（Vitest）

### 10.1 `src/lib/money.test.ts`

| 入力 | 期待 |
|---|---|
| `roundHalfUp(3030.595)` | `3030.6` |
| `roundHalfUp(6220.695)` | `6220.7` |
| `roundHalfUp(1.59505)` | `1.6` |
| `roundHalfUp(6.3802)` | `6.38` |
| `roundHalfUp(19 * 159.505)` | `3030.6` |
| `roundHalfUp(39 * 159.505)` | `6220.7` |
| `formatMoney(6220.695, "JPY")` | 文字列に `6,220.7` を含む（小数 2 桁が保持されること） |
| `formatMoney(19, "USD")` | 文字列に `19` を含む |

### 10.2 実効レート解決のテスト（FX state）

- `fxRate` が指定されている → その値が実効レートになる。
- `fxRate` が `undefined` → `pricing.json` の `fx.rates.JPY` が実効レートになる。
- `fxRate` が不正（`NaN` / `0` / 負数 / 数値でない）→ `pricing.json` の値にフォールバックする。

> AGENTS.md の方針に従い、価格計算関数はすべて単体テストを持つこと。テストファイルはソースと同階層に `.test.ts(x)` で配置する。

## 11. 成果物（追加/変更ファイル）

```
scripts/sync-pricing.ts             # 新規: API取得 → pricing.json 更新
src/lib/money.ts                    # 新規: roundHalfUp / formatMoney
src/lib/money.test.ts               # 新規: Vitest
src/data/pricing.json               # 変更: fx メタ拡張・値同期
.github/workflows/sync-pricing.yml  # 新規: 月次同期 + PR
package.json                        # 変更: "sync:pricing" script, devDep "tsx"
（FX編集UIは既存の見積もりコンポーネントへ統合。URL state 型に fxRate? を追加）
```

## 12. 受け入れ条件（Acceptance Criteria）

1. `pnpm sync:pricing` をネットワークありで実行すると、`pricing.json` の `fx.rates.JPY` が API 由来の値（**159.505 近傍**）に更新され、`fx.capturedAt` / `source` / `recoveredFromSku` が設定される。
2. `plans` のシート単価が 19 / 39、`overage.creditUnitPrice` が 0.01、PPP 3 ティアの USD が 19,000 / 90,000 / 425,000 に同期される。
3. `includedCreditsPerSeat` と `promotions` は実行前後で**不変**である。
4. 整合性ガード: いずれかの Copilot メーターの暗黙レートが復元 rate から ±0.001 を超えて乖離した場合、ジョブが**失敗し、`pricing.json` は変更されない**。
5. ネットワーク全失敗時、`pricing.json` は変更されず、ジョブが失敗する。
6. 画面で為替レートを変更すると JPY 表示が即時に更新され、その state を含む共有 URL を開くと**同じレートで復元**される。
7. 「最新レートに戻す」を押すと `fxRate` がクリアされ、`pricing.json` のレートに戻る（ネットワークアクセスは発生しない）。
8. JPY 表示はすべて round half-up(2桁) で、Business = `￥3,030.60`、Enterprise = `￥6,220.70` のように公式計算ツールと一致する。
9. `pnpm test` が緑（§10 の全ケースを含む）。
10. ワークフローを `workflow_dispatch` で実行すると、差分があれば `bot/pricing-sync` ブランチに PR が起票され、差分が無ければ PR は作られない。
11. `pnpm build`（`tsc -b` 込み）が型エラーなく通る。

## 13. 既知の注意（PR 説明・UI 注記にも反映）

- これは **Azure Marketplace 経由**の小売価格である。GitHub.com 直契約の建値と差がある場合は best-effort 扱い（AGENTS.md の非公式ツール方針に準拠）。
- **無料含有クレジット**（`includedCreditsPerSeat`）は Retail Prices API に存在しないため自動化対象外。GitHub ドキュメント更新時は手動更新が必要。
- `fx` は Azure の**月次固定請求レート**であり、実勢為替ではない（README / UI 注記と整合させる）。
- 過去の USD 価格は保持しない。共有リンクで固定されるのは FX レートのみであり、USD 建て価格が将来改定された場合、古い共有リンクは「固定された FX × 最新 USD 価格」で再計算される（許容済み）。
