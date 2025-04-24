# 📅 日付の扱いに関する仕様書

## 概要

本ドキュメントでは、TradeInsightAIにおける日付データの取り扱いについて定義します。
システム全体で一貫した日付の処理を行うことで、データの整合性を保ち、正確な分析を可能にします。

## タイムゾーンの基本概念

### UTCとGMTの関係
- UTCとGMTは基本的に同じ時刻を示す
- 夏時間（DST）を除いて時差はない
- システム内部ではUTCを基準として扱う

### 日本時間（JST）
- UTCから+9時間
- 年間を通じて固定（夏時間なし）
- 例：UTC 00:00 = JST 09:00

### MT4サーバー時間
- 冬時間：GMT+2（UTC+2）
- 夏時間：GMT+3（UTC+3）
- 夏時間期間：3月最後の日曜日から10月最後の日曜日まで

## 入力データの形式

### XM Tradingエクスポートファイル

- フォーマット: `YYYY.MM.DD HH:MM:SS`
- 例: `2024.12.02 14:47:32`
- タイムゾーン: MT4サーバー時間（GMT+2 または GMT+3）

## 時刻変換の流れ

### 1. MT4サーバー時間からUTCへの変換

```typescript
// MT4サーバー時間（例：2024.03.15 14:30:00）が入力された場合
// 1. 夏時間かどうかを判定
// 2. 夏時間の場合：-3時間
// 3. 冬時間の場合：-2時間
// 結果：UTCとして保存
```

### 2. データベースでの保存

- すべての日時データはUTCとして保存
- 例：MT4サーバー時間 14:30:00（冬時間）→ UTC 12:30:00として保存

### 3. UTCから日本時間への変換

```typescript
// UTCから日本時間への変換
// 1. UTCに+9時間
// 2. 日本時間として表示
// 例：UTC 12:30:00 → JST 21:30:00
```

## 時刻変換の具体例

### ケース1：冬時間の場合
```
MT4サーバー時間（UTC+2） 14:30:00
→ UTC 12:30:00（-2時間）
→ 日本時間（UTC+9） 21:30:00（+9時間）
```

### ケース2：夏時間の場合
```
MT4サーバー時間（UTC+3） 14:30:00
→ UTC 11:30:00（-3時間）
→ 日本時間（UTC+9） 20:30:00（+9時間）
```

## データ処理フロー

### 1. HTMLファイルのパース

```typescript
// 日付文字列を解析してDateオブジェクトに変換
private parseDate(text: string): Date | undefined {
  return parseMT4ServerTime(text); // utils/date.tsの関数を使用
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

#### 保存時の処理

- `openTime`: 必須フィールド、nullは許可されない
- `closeTime`: オプショナルフィールド、nullが許可される
- 日付はUTCとして保存される

### 3. フロントエンドでの表示

#### 日時のフォーマット

```typescript
const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return formatJST(date); // utils/date.tsの関数を使用
};
```

#### 表示仕様

- タイムゾーン: Asia/Tokyo（日本時間）
- 表示形式: `YYYY年MM月DD日 HH:mm:ss`
- ロケール: ja-JP（日本語）

### 4. フィルタリング処理

#### UTCへの変換

```typescript
const convertToUTC = (date: Date): Date => {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ));
};
```

#### フィルター条件の適用

- 開始日時と終了日時は常にUTCとして処理
- 日付範囲検索時は指定された日時を含む（inclusive）

## タイムゾーンの取り扱い

### システム全体での方針

1. **データベース保存時**
   - すべての日時データはUTCで保存
   - タイムゾーン情報は保持しない

2. **フロントエンド表示時**
   - 常に日本時間（Asia/Tokyo）で表示
   - ユーザーの現地時間は考慮しない

3. **フィルタリング時**
   - ユーザー入力の日時はUTCに変換して処理
   - 日付範囲検索は指定された日時を含む

### タイムゾーン変換の注意点

- MT4サーバー時間の夏時間（DST）は考慮が必要
- 日本時間は夏時間なし（年間固定）
- MT4サーバー時間からの変換時は、サーバーのタイムゾーン（GMT+2/GMT+3）を考慮

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

- MT4サーバー時間: [MetaTrader 4 Server Time](https://www.metatrader4.com/en/trading-platform/help/userguide/server_time)
- JavaScript Date: [MDN Web Docs - Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- Prisma DateTime: [Prisma - Working with Dates](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-dates)
