<div align="center">

# 💸 GitHub Copilot Cost Estimator

### Plan it. Model it. Share it.

**An open-source what-if calculator to simulate and estimate GitHub Copilot Business & Enterprise costs.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-2ea44f?style=for-the-badge&logo=githubpages&logoColor=white)](https://h-morozumi.github.io/ghc-calc/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](./LICENSE)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](#)

[**🚀 Open the Estimator**](https://h-morozumi.github.io/ghc-calc/) · [日本語](#-日本語) · [Roadmap](#-roadmap) 

</div>

---

## 🎯 Why this exists

The Azure Pricing Calculator doesn't cover GitHub Copilot. And now that Copilot usage is metered in **GitHub AI Credits** — a usage-based billing unit where 1 credit = $0.01 — the seat price is only half the story. The AI Credit consumption on top of it is the part that's hard to predict.

> *"We're rolling out Copilot. How much will it actually cost per month?"*

**GitHub Copilot Cost Estimator** turns that question into a concrete, shareable estimate — pick your plans, model the usage, and see the number.

---

## ✨ What it does

| | Feature | What it gives you |
|---|---|---|
| 🪑 | **Seat + included credits modeling** | Combine seat counts with the AI Credits bundled into each plan, instead of guessing. |
| 📈 | **Overage simulation** | Project what happens when usage runs past the included credit pool — before the invoice does it for you. |
| ⚖️ | **Business vs. Enterprise, head-to-head** | Charts that show which plan actually wins for *your* mix of seats and usage. |
| 👥 | **Per-user credit allocation** | Real teams aren't uniform. Assign light, average, and heavy users and watch the pool drain accordingly. |
| 🔮 | **Consumption what-if** | Tweak allocations and instantly see total credit burn and projected spend. |
| 💳 | **Pre-Purchase Plan (PPP) modeling** | Apply GitHub Pre-Purchase Plan commit-unit discount tiers — the upfront, term-commit way to save on GitHub usage. |
| 🔗 | **Shareable estimate links** | Encode the whole scenario into a URL and send it on — just like the Azure Pricing Calculator. |
| 🖨️ | **Print / PDF layout** | A clean, print-optimized view for turning an estimate into a PDF. |

---

## 🧮 How it works

- **Everything runs in your browser.** No backend, no account, no telemetry. Your scenario never leaves your machine until *you* choose to share the link.
- **Estimates are encoded in the URL.** Sharing is just copy-paste. Nothing is stored on a server.

> ⚠️ **Disclaimer:** This is an unofficial, community-built estimator. Bundled prices are best-effort and may lag behind GitHub's official figures. Always confirm against [GitHub's official Copilot billing documentation](https://docs.github.com/en/copilot/concepts/billing/organizations-and-enterprises) before signing anything.

---

## 🗺️ Roadmap

**Phase 1 — now**
- [x] GitHub Copilot **Business** & **Enterprise** estimation
- [x] AI Credit allocation & overage simulation
- [x] Shareable links · print/PDF layout · Pre-Purchase Plan (PPP) modeling

**Later**
- [ ] Additional plans, including **individual** tiers
- [ ] Per-model selection (including **Auto**)
- [ ] Fixed-model vs. **role-optimized** model strategies
- [ ] Heavy / "super-heavy" developer usage profiles

---

## 📄 License

Released under the [MIT License](./LICENSE).

Not affiliated with or endorsed by GitHub, Inc. "GitHub" and "GitHub Copilot" are trademarks of GitHub, Inc.

---

## 🇯🇵 日本語

### GitHub Copilot 見積もりツール

**GitHub Copilot Business / Enterprise の料金をシミュレーションし、コストを算出するオープンソースツールです。**

Azure 料金計算ツールでは Copilot の費用は計算できません。さらに Copilot の利用は **GitHub AI Credits**（1 クレジット = $0.01 の従量課金単位）で計測されるようになり、シート料金に加えて **AI Credit の消費量** が読めない——そんな「結局いくらかかるの？」を、共有・印刷できる見積もりに変えます。

**主な機能**
| | 機能 | 得られるもの |
|---|---|---|
| 🪑 | **シート＋含有クレジットのモデリング** | シート数と、各プランに同梱される AI Credit を組み合わせて試算。当てずっぽうは不要です。 |
| 📈 | **超過分のシミュレーション** | 使用量が含有クレジットの枠を超えたらどうなるかを予測——請求書が教えてくれる前に。 |
| ⚖️ | **Business 対 Enterprise の直接比較** | *あなたの* シート数と使用量の組み合わせで、どちらのプランが実際に有利かをグラフで表示。 |
| 👥 | **ユーザーごとのクレジット配分** | 実際のチームは均一ではありません。ライト／平均／ヘビーなユーザーを割り当て、クレジットプールが減っていく様子を確認できます。 |
| 🔮 | **消費量の What-if** | 配分を調整すると、総クレジット消費量と予測コストが即座に反映されます。 |
| 💳 | **Pre-Purchase Plan (PPP) のモデリング** | GitHub Pre-Purchase Plan のコミットユニット割引ティアを適用——前払い・期間コミットで GitHub の利用料を節約する方法です。 |
| 🔗 | **共有可能な見積もりリンク** | シナリオ全体を URL にエンコードして送信——Azure 料金計算ツールと同じ感覚で。 |
| 🖨️ | **印刷 / PDF レイアウト** | 見積もりを PDF に変換するための、印刷に最適化されたクリーンなビューです。 |

> ⚠️ **免責事項:** 本ツールは非公式のコミュニティ製です。金額は最新でない場合があります。契約前に必ず [GitHub 公式の課金ドキュメント](https://docs.github.com/en/copilot/concepts/billing/organizations-and-enterprises) をご確認ください。

**仕組み**
- **すべてブラウザ内で完結。** バックエンドもアカウントもテレメトリもありません。シナリオは、あなたがリンクを共有するまで端末の外に出ません。
- **見積もりは URL にエンコード。** 共有はコピー＆ペーストするだけ。サーバーには何も保存されません。

**ロードマップ**

*フェーズ 1 — 提供中*
- [x] GitHub Copilot **Business** / **Enterprise** の見積もり
- [x] AI Credit の配分・超過シミュレーション
- [x] 共有リンク・印刷 / PDF レイアウト・Pre-Purchase Plan (PPP) のモデリング

*今後*
- [ ] **個人**プランを含む、その他のプラン
- [ ] モデル別の選択（**Auto** を含む）
- [ ] モデル固定 vs **役割最適化**のモデル戦略
- [ ] ヘビー／「スーパーヘビー」開発者の利用プロファイル

<div align="center">

**[🚀 見積もりを開く](https://h-morozumi.github.io/ghc-calc/)**

</div>

GitHub, Inc. とは提携しておらず、同社の承認も受けていません。「GitHub」および「GitHub Copilot」は GitHub, Inc. の商標です。