以下は、トレード履歴分析アプリにおける OpenAI Function Calling 機能の仕様書です。現状実装済みの「フィルターされたトレード履歴取得処理」をベースに、AIチャットと連携するための関数定義をまとめています。

---

## 1. 目的
- ユーザーの自然言語要求をもとに、AIが適切なサーバーサイド関数（ツール）を呼び出し、取得結果を踏まえた高度な応答を生成する。
- トレード履歴のフィルタリング・統計分析・シミュレーション機能を AI チャット経由でシームレスに利用できるようにする。

## 2. 前提
- **既存実装**：API 側に「フィルター条件に基づくトレード履歴取得機能(fetchTradeRecords)」がある。
- Next.js API Routes 経由で、アクセストークン付きリクエストで取得可能。
- レスポンスは JSON の配列 (`TradeRecord[]`)。
- 日付は ISO 8601 形式（例：`"2025-02-01T00:00:00Z"`）とする。

## 3. 関数定義

```jsonc
[
  {
    "name": "fetch_trade_records",
    "description": "指定した条件でトレード履歴を取得する。",
    "parameters": {
      "type": "object",
      "properties": {
        "types": {
          "type": "array",
          "items": { "type": "string", "enum": ["buy", "sell"] },
          "description": "取得対象の注文タイプ（buy/sell）。未指定時は全件。"
        },
        "items": {
          "type": "array",
          "items": { "type": "string" },
          "description": "通貨ペアコードのリスト（例：\"USDJPY\",\"EURUSD\"）。"
        },
        "startDate": {
          "type": "string",
          "format": "date-time",
          "description": "検索開始日時（ISO 8601）。"
        },
        "endDate": {
          "type": "string",
          "format": "date-time",
          "description": "検索終了日時（ISO 8601）。"
        },
        "minRRRatio": {
          "type": "number",
          "description": "最低リスク・リワード比率（例：1.5）。"
        },
        "result": {
          "type": "string",
          "enum": ["profit", "loss"],
          "description": "勝ちトレードのみ profit、負けトレードのみ loss を抽出。"
        },
        "page": {
          "type": "integer",
          "minimum": 1,
          "description": "ページ番号（省略時は 1）。"
        },
        "pageSize": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "1ページあたり件数（省略時は 20）。"
        }
      },
      "required": []
    }
  },
  {
    "name": "compute_statistics",
    "description": "指定期間・通貨ペアにおける統計情報を計算する。",
    "parameters": {
      "type": "object",
      "properties": {
        "metrics": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["win_rate", "profit_factor", "average_rr", "max_drawdown"]
          },
          "description": "計算したい指標リスト。"
        },
        "startDate": {
          "type": "string",
          "format": "date-time",
          "description": "集計開始日時（ISO 8601）。"
        },
        "endDate": {
          "type": "string",
          "format": "date-time",
          "description": "集計終了日時（ISO 8601）。"
        },
        "items": {
          "type": "array",
          "items": { "type": "string" },
          "description": "集計対象の通貨ペアリスト。"
        }
      },
      "required": ["metrics"]
    }
  },
  {
    "name": "scenario_simulation",
    "description": "過去データを元に仮説的シナリオをシミュレーションする。",
    "parameters": {
      "type": "object",
      "properties": {
        "adjustStopLossPips": {
          "type": "number",
          "description": "ストップロスを何pips調整するか（正で狭める、負で広げる）。"
        },
        "adjustTakeProfitPips": {
          "type": "number",
          "description": "テイクプロフィットを何pips調整するか。"
        },
        "types": {
          "type": "array",
          "items": { "type": "string", "enum": ["buy", "sell"] },
          "description": "シミュレーション対象の注文タイプ。"
        },
        "items": {
          "type": "array",
          "items": { "type": "string" },
          "description": "シミュレーション対象の通貨ペアリスト。"
        },
        "startDate": {
          "type": "string",
          "format": "date-time"
        },
        "endDate": {
          "type": "string",
          "format": "date-time"
        }
      },
      "required": ["adjustStopLossPips"]
    }
  }
]
```

### 3.1 `fetch_trade_records`
- **説明**：ユーザーのフィルター要求（通貨ペア・期間・勝敗など）を受け取り、該当するトレード履歴を返却。
- **レスポンス例**（簡略化）：
  ```json
  [
    {
      "ticket": "75460725",
      "openTime": "2024-12-02T14:47:32Z",
      "type": "sell",
      "size": 1.10,
      "item": "EURUSD",
      "price": 1.05099,
      "stopLoss": 1.05190,
      "takeProfit": 1.03500,
      "closeTime": "2024-12-02T23:46:11Z",
      "closePrice": 1.05010,
      "profit": 14643
    },
    …
  ]
  ```

### 3.2 `compute_statistics`
- **説明**：取得済みトレード履歴をもとに、勝率・プロフィットファクター・平均RR・最大ドローダウンなどを計算。
- **レスポンス例**：
  ```json
  {
    "win_rate": { "value": 28.0, "unit": "%" },
    "profit_factor": { "value": 0.8 },
    "average_rr": { "value": 2.05 },
    "max_drawdown": { "value": 274659, "unit": "JPY" }
  }
  ```

### 3.3 `scenario_simulation`
- **説明**：シナリオパラメータ（SL/TP調整量）を適用し、過去データ上で仮想的に再計算した結果を返す。
- **レスポンス例**：
  ```json
  {
    "win_rate_before": 28.0,
    "win_rate_after": 26.5,
    "net_profit_before": -80389,
    "net_profit_after": -56000,
    "delta_profit": 24389
  }
  ```

## 4. メッセージフロー

1. **ユーザー発話**
   ```
   「先月のUSDJPYの負けトレードを見せて」
   ```
2. **AI（assistant）解析**
   - フィルター条件をパース
   - 関数呼び出し決定 → `fetch_trade_records`
3. **関数呼び出し**
   ```json
   {
     "name": "fetch_trade_records",
     "arguments": {
       "items": ["USDJPY"],
       "startDate": "2025-03-01T00:00:00Z",
       "endDate": "2025-03-31T23:59:59Z",
       "result": "loss"
     }
   }
   ```
4. **サーバー → レスポンス**
   ```json
   [ …TradeRecord… ]
   ```
5. **AI（assistant）最終応答**
   - 関数結果を自然言語で整形して返却

## 5. エラー処理

- **パラメータ不足/不正**：400 Bad Request → ChatGPT がユーザーに再入力を促す。
- **結果ゼロ件**：空配列返却 → 「該当するトレードが見つかりませんでした」と応答。
- **タイムアウト/サーバーエラー**：500 Error → 「サーバーで一時的な問題が発生しました。しばらく待って再度お試しください」と案内。

## 6. 今後の拡張案
- 月次勝率推移取得用の `get_monthly_win_rates` 関数
- ドローダウン時系列取得用の `get_drawdown_series` 関数
- 通貨ペア間のパフォーマンス比較機能

---

以上の仕様に従って実装・ドキュメント化することで、ユーザーは自然言語で高度なトレード分析を直感的に利用できるようになります。
