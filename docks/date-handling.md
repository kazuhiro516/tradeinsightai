# 📅 日付の扱いに関する仕様書

## 概要

本ドキュメントでは、TradeInsightAIにおける日付データの取り扱いについて定義します。
システム全体で一貫した日付の処理を行うことで、データの整合性を保ち、正確な分析を可能にします。

## タイムゾーンの基本概念

### UTCとGMTの関係
- UTCとGMTは基本的に同じ時刻を示す
- システム内部ではUTCを基準として扱う
- GMTは世界各国の標準時の基準となる時間（グリニッジ標準時）

### 日本時間（JST）
- UTCから+9時間（GMT+9）
- 年間を通じて固定（夏時間なし）
- 例：UTC 00:00 = JST 09:00

### XMのMT4/MT5サーバー時間
- XMサーバー時間から日本時間への変換：
  - 冬時間期間（10月最終日曜日〜3月最終日曜日）：+7時間
  - 夏時間期間（3月最終日曜日〜10月最終日曜日）：+6時間

## 日付処理フロー

### 1. ファイルアップロード時の処理

```typescript
// 1. XMのMT4/MT5エクスポートファイルから日付文字列を読み取り
// 形式: YYYY.MM.DD HH:MM:SS（XMサーバー時間）
const xmTimeStr = "2024.03.15 10:30:00";

// 2. parseXMServerTime関数で解析
// XMサーバー時間をUTCに変換（夏時間/冬時間を考慮）
const utcDate = parseXMServerTime(xmTimeStr);

// 3. データベースに保存
// UTCとして保存
await prisma.tradeRecord.create({
  data: {
    openTime: utcDate,
    // ... その他のフィールド
  }
});
```

### 2. データベースでの永続化

- すべての日時データはUTCとして保存
- Prismaスキーマ定義：

```prisma
model TradeRecord {
  openTime    DateTime    // UTC
  closeTime   DateTime?   // UTC（オプショナル）
  // ... その他のフィールド
}
```

### 3. API応答時の処理

```typescript
// 1. データベースからUTCで取得
const records = await prisma.tradeRecord.findMany();

// 2. ISO文字列に変換
const trades = records.map(record => ({
  ...record,
  openTime: record.openTime?.toISOString() || null,
  closeTime: record.closeTime?.toISOString() || null,
}));

// 3. クライアントに送信
return NextResponse.json({ trades });
```

### 4. フロントエンドでの表示

```typescript
// 1. ISO文字列を受け取り
const trade = {
  openTime: "2024-03-15T10:30:00.000Z",
  // ...
};

// 2. formatJST関数で日本時間に変換（+6時間）
const displayTime = formatJST(trade.openTime);
// 結果：2024年3月15日 16:30:00
```

## 共通関数の使用

### utils/date.ts

```typescript
// 1. XMサーバー時間の解析
export const parseXMServerTime = (dateStr: string): Date | undefined => {
  // ISO形式とXM形式の両方に対応
  // 戻り値はUTC
};

// 2. 日本時間への変換
export const formatJST = (dateStr: string | Date): string => {
  // UTCから+6時間の変換
  // 日本語フォーマットでの表示
};

// 3. 夏時間判定
export const isXMServerDST = (date: Date): boolean => {
  // 3月最後の日曜日から10月最後の日曜日まで
};
```

## 時刻変換の具体例

### ケース1：ファイルアップロード時
```
入力: 2024.03.15 10:30:00（XMサーバー時間）
↓ parseXMServerTime
DB保存: 2024-03-15T10:30:00.000Z（UTC）
```

### ケース2：表示時
```
DB値: 2024-03-15T10:30:00.000Z（UTC）
↓ formatJST
表示: 2024年3月15日 16:30:00（日本時間）
```

### ケース3：冬時間の場合
```
XMのMT4/MT5サーバー時間 14:30:00
→ 日本時間 21:30:00（+7時間）
```

### ケース4：夏時間の場合
```
XMのMT4/MT5サーバー時間 14:30:00
→ 日本時間 20:30:00（+6時間）
```

## データ処理フロー

### 1. HTMLファイルのパース

```typescript
// 日付文字列を解析してDateオブジェクトに変換
private parseDate(text: string): Date | undefined {
  return parseXMServerTime(text); // utils/date.tsの関数を使用
}
```

### 2. データベースでの保存

#### スキーマ定義

```prisma
model TradeRecord {
  openTime    DateTime    // 必須フィールド（UTC）
  closeTime   DateTime?   // オプショナルフィールド（UTC）
  // ... その他のフィールド
}
```

## 注意点

1. **日付操作の一元化**
   - 必ず `utils/date.ts` の関数を使用
   - 独自の日付変換ロジックを実装しない

2. **タイムゾーンの扱い**
   - データベース: 常にUTC
   - API通信: ISO文字列
   - 表示: 日本時間（+6時間）

3. **夏時間/冬時間**
   - XMサーバー時間の解釈時のみ考慮
   - 表示時は常に+6時間

4. **エラー処理**
   - 無効な日付: 空文字列を返す
   - パースエラー: コンソールにログ出力

## エラー処理

### パース時のエラー処理

1. **無効な日付文字列**
   - 空文字列の場合: `undefined`を返す
   - フォーマット不一致の場合: `undefined`を返す
   - 不正な日付の場合: `undefined`を返す

2. **データベース保存時**
   - `openTime`が`undefined`の場合: バリデーションエラー
   - `closeTime`が`undefined`の場合: `null`として保存

### 表示時のエラー処理

1. **無効な日付データ**
   - フォールバック: 「日付なし」と表示
   - エラーログを出力

2. **タイムゾーン変換エラー**
   - フォールバック: UTCのまま表示
   - エラーログを出力

## 実装チェックリスト

- [ ] ファイルアップロード時のXMサーバー時間解析
- [ ] UTCでのデータベース保存
- [ ] API応答でのISO文字列変換
- [ ] フロントエンドでの日本時間表示
- [ ] エラー処理の実装
- [ ] ログ出力の設定

## パフォーマンスに関する考慮事項

1. **データベースクエリ**
   - 日付範囲検索のインデックスを適切に設定
   - 大量データの日付ソートに対する最適化

2. **フロントエンド**
   - 日付変換処理のキャッシュ化
   - 一括変換処理の実装

## 今後の拡張性

1. **多言語対応**
   - 日付フォーマットのローカライズ対応
   - 異なるタイムゾーンのサポート

2. **カスタマイズ機能**
   - ユーザー設定による表示形式の変更
   - タイムゾーンの選択機能

## 参考情報

- [XM Trading Hours](https://xem.fxsignup.com/trade/tradingtime.html)
- [JavaScript Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [Prisma DateTime](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-dates)
