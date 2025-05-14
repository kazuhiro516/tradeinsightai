以下は、トレード履歴分析アプリにおける OpenAI Function Calling 機能の仕様書です。現状実装済みの「フィルターされたトレード履歴取得処理」をベースに、AIチャットと連携するための関数定義をまとめています。

---

## 1. 目的
- ユーザーの自然言語要求をもとに、AIが適切なサーバーサイド関数（ツール）を呼び出し、取得結果を踏まえた高度な応答を生成する。
- トレード履歴のフィルタリング・統計分析・シミュレーション機能を AI チャット経由でシームレスに利用できるようにする。

## 2. 前提
- **既存実装**：API 側に「フィルター条件に基づくトレード履歴取得機能(trade_records)」がある。
- Next.js API Routes 経由で、アクセストークン付きリクエストで取得可能。
- レスポンスは JSON の配列 (`TradeRecord[]`)。
- 日付は ISO 8601 形式（例：`"2025-02-01T00:00:00Z"`）とする。

## 3. 関数定義

```jsonc
[
  {
    "name": "trade_records",
    "description": "指定した条件でトレード履歴を取得する。",
    "parameters": {
      "type": "object",
      "properties": {
        "types": {
          "type": "array",
          "items": { "type": "string", "enum": ["buy", "sell", "all"] },
          "description": "取得対象の注文タイプ（buy/sell/all）。未指定時は全件。"
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
        "profitType": {
          "type": "string",
          "enum": ["win", "lose", "all"],
          "description": "勝ちトレード(win)、負けトレード(lose)、全件(all)を抽出。"
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
        },
        "sortBy": {
          "type": "string",
          "enum": ["startDate", "profit"],
          "description": "ソート対象カラム。"
        },
        "sortOrder": {
          "type": "string",
          "enum": ["asc", "desc"],
          "description": "昇順/降順。"
        }
      },
      "required": [
        "types", "items", "startDate", "endDate", "profitType", "page", "pageSize", "sortBy", "sortOrder"
      ],
      "additionalProperties": false
    },
    "strict": true
  }
]
```

### 3.1 `trade_records`
- **説明**：ユーザーのフィルター要求（通貨ペア・期間・勝敗など）を受け取り、該当するトレード履歴を返却。
- **リクエスト例**：
  ```json
  {
    "types": ["sell"],
    "items": ["USDJPY"],
    "startDate": "2025-03-01T00:00:00Z",
    "endDate": "2025-03-31T23:59:59Z",
    "profitType": "lose",
    "page": 1,
    "pageSize": 20,
    "sortBy": "startDate",
    "sortOrder": "desc"
  }
  ```
- **レスポンス例**（`TradeRecordsResponse` 型）：
  ```json
  {
    "records": [
      {
        "id": 1,
        "ticketId": 75460725,
        "type": "sell",
        "item": "USDJPY",
        "size": 1.10,
        "openPrice": 1.05099,
        "closePrice": 1.05010,
        "profit": -14643,
        "startDate": "2025-03-01T14:47:32Z",
        "endDate": "2025-03-01T23:46:11Z",
        "userId": "user-xxxx"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
  ```

### 3.2 `compute_statistics`/`scenario_simulation` について
- 現時点では未実装です。今後の拡張時に本ドキュメントを更新してください。

## 4. メッセージフロー

1. **ユーザー発話**
   ```
   「先月のUSDJPYの負けトレードを見せて」
   ```
2. **AI（assistant）解析**
   - フィルター条件をパース
   - 関数呼び出し決定 → `trade_records`
3. **関数呼び出し**
   ```json
   {
     "name": "trade_records",
     "arguments": {
       "types": ["sell"],
       "items": ["USDJPY"],
       "startDate": "2025-03-01T00:00:00Z",
       "endDate": "2025-03-31T23:59:59Z",
       "profitType": "lose",
       "page": 1,
       "pageSize": 20,
       "sortBy": "startDate",
       "sortOrder": "desc"
     }
   }
   ```
4. **サーバー → レスポンス**
   ```json
   {
     "records": [ ... ],
     "total": 1,
     "page": 1,
     "pageSize": 20
   }
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
