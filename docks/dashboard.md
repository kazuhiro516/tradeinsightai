# 📊 ダッシュボード機能 要件定義書

## 概要

ユーザーがログイン後に最初に表示される画面として、自身のトレード履歴に基づく基本分析データをダッシュボード形式で提供する。

## 目的

ユーザーが自身のトレードパフォーマンスを直感的かつ効率的に把握し、改善ポイントを素早く確認できるようにする。

## 対象データ

- XM Tradingからアップロードされたトレード履歴データ

## 市場区分（セッション）の仕様

本アプリケーションでは、すべて日本時間（JST）で以下の区分を採用します。

| 区分         | 時間帯（JST）         |
|------------|----------------------|
| 東京時間     | 8:00 ~ 14:59         |
| ロンドン時間 | 15:00 ~ 20:59        |
| NY時間      | 21:00 ~ 翌2:00        |
| その他      | 2:00 ~ 7:59           |

- サマータイム・冬時間等は一切考慮しません。
- すべての市場区分判定はこの仕様に統一されています。

## AI分析コメント機能

### 機能概要
- ダッシュボード画面に、AI（OpenAI API）によるトレード履歴の自動分析コメントを表示する。
- ユーザーのトレードデータの特徴や傾向、注意点を日本語で簡潔に要約し、改善ポイントや注目すべき点を示す。

### 目的
- 数値やグラフだけでは気づきにくいパターンやリスクをAIが補足し、ユーザーの自己分析を支援する。
- 初心者でも直感的にトレード状況を把握できるようにする。

### 表示例
```
- 直近3ヶ月の勝率は安定していますが、最大ドローダウンがやや大きくなっています。リスク管理の見直しを推奨します。
- USDJPYの取引で損失が目立ちます。通貨ペアごとの戦略再検討をおすすめします。
```

### 注意点
- AI分析コメントはダッシュボードデータが変化した場合のみ再生成されます。
- 表示のたびにAI APIを呼ばず、コスト最適化のためキャッシュを利用します。
- キャッシュ利用中もユーザー体験に影響はありません。

## AI分析APIのキャッシュ戦略

### 仕組み
- ダッシュボードデータ（フィルター内容含む）とAIプロンプトの組み合わせからハッシュ値を生成し、サーバー側でキャッシュキーとします。
- キャッシュはプロセス内メモリ（Map）で管理し、同一データ・プロンプトでのAI API呼び出しを抑制します。
- キャッシュ有効期間（TTL）は6時間。TTL経過後は再度AI APIを実行し、結果をキャッシュします。

### 理由
- OpenAI APIの利用コスト削減
- ユーザー体験（レスポンス速度）の向上

### 今後の拡張性
- 本番運用やサーバーレス環境ではRedis等の永続キャッシュ導入を推奨
- キャッシュ粒度や有効期限は運用状況に応じて調整可能

### 注意点
- サーバー再起動時やサーバーレス環境ではキャッシュがリセットされる場合があります
- キャッシュヒット時はAPIレスポンスに`cached: true`が含まれます（内部利用）

## 基本分析項目（表示必須）

以下の項目を分析し、ダッシュボードに表示すること。

| 項目名                                   | 内容                    |
| ------------------------------------- | --------------------- |
| 総利益（Gross Profit）                     | 勝ちトレードの合計利益           |
| 総損失（Gross Loss）                       | 負けトレードの合計損失           |
| 純利益（Net Profit）                       | 総利益から総損失を引いた利益        |
| 取引回数（Total Trades）                    | 期間内の取引総数              |
| 勝率（Win Rate）                          | 勝ちトレード数 ÷ 全取引数        |
| プロフィットファクター（Profit Factor）            | 総利益 ÷ 総損失             |
| 平均利益・平均損失（Average Profit/Loss）        | 利益取引および損失取引それぞれの平均値   |
| 最大利益・最大損失（Largest Profit/Loss）        | 期間内における単一取引の最大利益と最大損失 |
| 最大連勝・連敗数（Max Consecutive Wins/Losses） | 期間内の最大連勝数と最大連敗数       |
| 最大ドローダウン（Maximal Drawdown）            | 資金ピーク時からの最大下落額と割合     |
| リスクリワード比率（Risk-Reward Ratio）          | 平均利益 ÷ 平均損失           |

## 表示方法

### 数値表示

各分析項目をカード形式で一覧表示する。

単位は円としてください。

例）

- 「総利益」: ¥315,477
- 「純利益」: ¥-80,389

### グラフ表示

以下のグラフを必須表示する。

- **利益推移グラフ**（折れ線グラフ）

  - 時系列での純利益の推移を表示

- **勝率推移グラフ**（棒グラフ）

  - 期間（月単位）ごとの勝率を表示

- **ドローダウン推移グラフ**（折れ線グラフ）

  - 時系列でのドローダウンの推移を表示

- **市場区分別・通貨ペア別・曜日別の成績グラフ**

  - 市場区分（東京・ロンドン・NY・その他）は上記のアプリ独自仕様に基づく

## 技術要件

- クライアント・サーバサイド共に **Next.js** を利用
- グラフ描画には **Recharts** を利用
- スタイリングは **Tailwind CSS** を採用
- データ取得はAPIルート（Next.js API Routes）経由で行う
- クライアントサイドで取得したデータを用いてリアクティブに描画する

## 画面遷移

- ログイン後、ルートURL (`/`) にアクセスすると本ダッシュボード画面を表示する

## 非機能要件

- 分析データは画面表示時に毎回最新のデータをサーバーサイドから取得し表示
- レスポンシブデザインで、モバイル・デスクトップ両方に対応
- 表示速度を最適化し、ストレスのないユーザー体験を提供
- AI分析コメントはキャッシュ戦略によりコスト最適化されている
- キャッシュ利用時も常に最新のダッシュボードデータに基づく分析結果を表示

## エラー処理

- データ取得エラー時にはユーザーに分かりやすいメッセージを表示する（例：「データ取得に失敗しました。再試行してください。」）
- AI分析コメント取得エラー時は「AI分析コメントの取得に失敗しました」等のメッセージを表示し、ユーザー体験を損なわないようにする

## 算出ロジック

（※市場区分の判定はすべてJSTで上記仕様に従うこと。サマータイム・冬時間は考慮しない）

各指標の算出ロジックは以下の通りです。なお、すべての計算は有効なトレード（`openTime`と`profit`が存在するもの）のみを対象としています。

### 基本指標の算出

```typescript
// 有効なトレードのフィルタリング
const validTrades = trades.filter(trade =>
  trade.openTime && trade.profit !== null && trade.profit !== undefined
);

// 勝ちトレードと負けトレードの分類
const profitTrades = validTrades.filter(trade => trade.profit > 0);
const lossTrades = validTrades.filter(trade => trade.profit < 0);
```

| 指標 | 算出ロジック | コード例 |
|-----|------------|---------|
| 総利益（Gross Profit） | 勝ちトレードの利益合計 | `const grossProfit = profitTrades.reduce((sum, trade) => sum + trade.profit, 0);` |
| 総損失（Gross Loss） | 負けトレードの損失合計 | `const grossLoss = lossTrades.reduce((sum, trade) => sum + trade.profit, 0);` |
| 純利益（Net Profit） | 総利益 + 総損失 | `const netProfit = grossProfit + grossLoss;` |
| 取引回数（Total Trades） | 有効なトレードの総数 | `const totalTrades = validTrades.length;` |
| 勝率（Win Rate） | 勝ちトレード数 ÷ 全トレード数 | `const winRate = (profitTrades.length / totalTrades) * 100;` |
| プロフィットファクター | 総利益 ÷ 総損失の絶対値 | `const profitFactor = Math.abs(grossProfit / grossLoss);` |
| 平均利益 | 勝ちトレードの平均値 | `const avgProfit = grossProfit / profitTrades.length;` |
| 平均損失 | 負けトレードの平均値 | `const avgLoss = grossLoss / lossTrades.length;` |
| 最大利益 | 単一トレードの最大利益 | `const largestProfit = Math.max(...profitTrades.map(t => t.profit));` |
| 最大損失 | 単一トレードの最大損失 | `const largestLoss = Math.min(...lossTrades.map(t => t.profit));` |
| リスクリワード比率 | 平均利益 ÷ 平均損失の絶対値 | `const riskRewardRatio = Math.abs(avgProfit / avgLoss);` |

### 連勝・連敗の算出

```typescript
// 連勝・連敗の計算
let currentStreak = 0;
let maxWinStreak = 0;
let maxLossStreak = 0;

validTrades.forEach((trade, i) => {
  if (trade.profit > 0) {
    if (currentStreak > 0) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    maxWinStreak = Math.max(maxWinStreak, currentStreak);
  } else {
    if (currentStreak < 0) {
      currentStreak--;
    } else {
      currentStreak = -1;
    }
    maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
  }
});
```

### ドローダウンの算出

```typescript
// ドローダウンの時系列データを取得する関数
function getDrawdownTimeSeries(trades: TradeRecord[]) {
  // 有効なトレードのみフィルタリングして日付順にソート
  const validTrades = trades
    .filter(trade => trade.openTime !== null && trade.profit !== null)
    .sort((a, b) => new Date(a.openTime!).getTime() - new Date(b.openTime!).getTime());

  if (validTrades.length === 0) {
    return [];
  }

  // 結果を格納する配列
  const result = [];

  // 初期値の設定
  let cumulativeProfit = 0;
  let peak = 0;
  let highWaterMark = 0; // 資金の最高到達点を記録

  // 各トレードごとにドローダウンを計算
  for (const trade of validTrades) {
    // 累積利益を更新
    cumulativeProfit += trade.profit!;

    // 資金曲線の最高値を更新
    highWaterMark = Math.max(highWaterMark, cumulativeProfit);

    // ドローダウンの計算
    const drawdown = highWaterMark - cumulativeProfit;

    // ドローダウン率の計算（最高値が0の場合は0%）
    let drawdownPercent = 0;
    if (highWaterMark > 0) {
      drawdownPercent = (drawdown / highWaterMark) * 100;
    }

    // 結果を配列に追加
    result.push({
      date: new Date(trade.openTime!).toISOString().split('T')[0],
      profit: trade.profit!,
      cumulativeProfit,
      peak: highWaterMark,
      drawdown,
      drawdownPercent: Number(drawdownPercent.toFixed(2))
    });
  }

  return result;
}
```

### 時系列データの生成

#### 月次勝率

```typescript
const monthlyWinRates = trades
  .filter(trade => trade.openTime)
  .reduce((acc, trade) => {
    const month = new Date(trade.openTime).toISOString().slice(0, 7);
    if (!acc[month]) {
      acc[month] = { wins: 0, total: 0 };
    }
    acc[month].total++;
    if (trade.profit > 0) {
      acc[month].wins++;
    }
    return acc;
  }, {});
```

#### 利益推移

```typescript
const profitTimeSeries = validTrades
  .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime())
  .reduce((acc, trade) => {
    const date = new Date(trade.openTime).toISOString().slice(0, 10);
    const lastCumulativeProfit = acc.length > 0 ? acc[acc.length - 1].cumulativeProfit : 0;
    return [...acc, {
      date,
      profit: trade.profit,
      cumulativeProfit: lastCumulativeProfit + trade.profit
    }];
  }, []);
```

#### ドローダウン推移

```typescript
const drawdownTimeSeries = validTrades
  .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime())
  .reduce((acc, trade) => {
    const date = new Date(trade.openTime).toISOString().slice(0, 10);
    const lastBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    const currentBalance = lastBalance + trade.profit;
    const peak = Math.max(currentBalance, acc.length > 0 ? acc[acc.length - 1].peak : 0);
    const drawdown = peak - currentBalance;
    const drawdownPercentage = (drawdown / peak) * 100;

    return [...acc, {
      date,
      balance: currentBalance,
      peak,
      drawdown,
      drawdownPercentage
    }];
  }, []);
```

## 指標の解説と評価基準

各指標の意味と一般的に良いとされる数値について解説します。これらの基準値は、あくまでも参考値であり、取引戦略や市場環境によって適切な値は変動する可能性があります。

### 基本指標

| 指標 | 説明 | 一般的な評価基準 |
|-----|------|--------------|
| 総利益（Gross Profit） | 勝ちトレードから得られた利益の合計額 | 単独での評価は適切ではなく、総損失との比率（プロフィットファクター）で評価 |
| 総損失（Gross Loss） | 負けトレードで被った損失の合計額 | 同上 |
| 純利益（Net Profit） | 総利益から総損失を引いた実質的な利益 | リスク資産に対して年率10%以上が望ましい |
| 取引回数（Total Trades） | 期間内の全取引回数 | 最低30回以上が統計的に有意とされる |
| 勝率（Win Rate） | 全取引に対する勝ちトレードの割合 | 40%以上が一般的な目安。50%以上であれば良好 |
| プロフィットファクター（Profit Factor） | 総利益÷総損失の絶対値 | 1.3以上：安定した運用が可能<br>1.5以上：優秀な戦略<br>2.0以上：極めて優秀な戦略 |
| 平均利益（Average Profit） | 勝ちトレード1回あたりの平均利益 | 平均損失の1.5倍以上が望ましい |
| 平均損失（Average Loss） | 負けトレード1回あたりの平均損失 | リスク許容額の2%以内が推奨 |
| 最大利益（Largest Profit） | 単一トレードでの最大の利益額 | 平均利益の3倍以内が望ましい |
| 最大損失（Largest Loss） | 単一トレードでの最大の損失額 | 平均損失の3倍以内が望ましい |
| リスクリワード比率（Risk-Reward Ratio） | 平均利益÷平均損失の絶対値 | 1.5以上：良好<br>2.0以上：優秀<br>3.0以上：極めて優秀 |

### 連続性指標

| 指標 | 説明 | 一般的な評価基準 |
|-----|------|--------------|
| 最大連勝数（Max Consecutive Wins） | 連続して利益を出した最大回数 | 単独での評価は適切ではなく、取引回数に対する比率で評価 |
| 最大連敗数（Max Consecutive Losses） | 連続して損失を出した最大回数 | 資金管理上、10回以下が望ましい |

### リスク指標

| 指標 | 説明 | 一般的な評価基準 |
|-----|------|--------------|
| 最大ドローダウン（Max Drawdown） | 資金残高のピークから底値までの最大下落率 | 20%以下：良好<br>15%以下：優秀<br>10%以下：極めて優秀 |
| シャープレシオ（Sharpe Ratio） | リスクフリーレートを上回るリターンを<br>ボラティリティで割った値 | 1.0以上：良好<br>2.0以上：優秀<br>3.0以上：極めて優秀 |
| カルマー比率（CAR/MDD） | 年率リターンを最大ドローダウンで割った値 | 2.0以上：良好<br>3.0以上：優秀<br>5.0以上：極めて優秀 |

### 時系列指標の評価

| 指標 | 評価ポイント | 望ましい特徴 |
|-----|------------|------------|
| 月次勝率推移 | 勝率の安定性 | 月次での大きな変動がないこと |
| 利益推移 | 資金曲線の形状 | 右肩上がりで急激な変動がないこと |
| ドローダウン推移 | 下落の深さと期間 | 短期間での回復と緩やかな下落 |

### 注意点

1. これらの基準値は一般的な目安であり、以下の要因により適切な値は変動します：
   - 取引市場の特性
   - 取引時間軸（短期・中期・長期）
   - リスク許容度
   - 取引戦略の特性

2. 単一の指標だけでなく、複数の指標を組み合わせて総合的に評価することが重要です。

3. バックテスト結果と実運用では、以下の要因により結果が異なる可能性があります：
   - スリッページ
   - 取引コスト
   - 市場インパクト
   - 運用資金量の違い

## 曜日別集計・市場区分の仕様

- 曜日別集計・表示は「月曜日〜金曜日」のみとする。
- 金曜日のニューヨーク時間（JSTで土曜0:00〜2:00）の取引は「金曜日」として集計する。
- 土曜日・日曜日の取引は一切集計・表示しない（データ上も存在しない前提）。
- 市場区分（セッション）は従来通りJST基準で判定するが、曜日集計は上記ルールを厳守する。

### サンプル（曜日別集計のイメージ）

| 曜日 | 集計対象 | 備考 |
|------|----------|------|
| 月   | 月曜0:00〜23:59 |  |
| 火   | 火曜0:00〜23:59 |  |
| 水   | 水曜0:00〜23:59 |  |
| 木   | 木曜0:00〜23:59 |  |
| 金   | 金曜0:00〜23:59＋JST土曜0:00〜2:00 | 金曜NY時間は金曜日扱い |

---

### 集計ロジック例（TypeScript）

```typescript
// JSTで土曜0:00〜2:00は金曜日扱い
let wd = jst.getDay();
if (wd === 6 && jst.getHours() < 2) {
  wd = 5; // 金曜日
}
if (wd >= 1 && wd <= 5) {
  // 月〜金のみ集計
}
```

---

## 表示方法

- 曜日別グラフ・ヒートマップ・テーブル等は「月〜金」だけを表示する。
- UI上も「土曜日」「日曜日」は一切表示しない。
- 金曜日のNY時間（JST土曜0:00〜2:00）の取引も「金曜日」列に含める。

