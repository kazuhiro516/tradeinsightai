# 📅 日付の扱いに関する仕様書

## 概要

本ドキュメントでは、TradeInsightAIにおける日付データの取り扱いについて定義します。
システム全体で一貫した日付の処理を行うことで、データの整合性を保ち、正確な分析を可能にします。

## 入力データの形式

### XM Tradingエクスポートファイル

- フォーマット: `YYYY.MM.DD HH:MM:SS`
- 例: `2024.12.02 14:47:32`
- タイムゾーン: MT4サーバー時間（GMT+2 または GMT+3）

## データ処理フロー

### 1. HTMLファイルのパース

```typescript
// 日付文字列を解析してDateオブジェクトに変換
private parseDate(text: string): Date | undefined {
  if (!text || text.trim() === '') return undefined;

  // 日付形式: YYYY.MM.DD HH:MM:SS
  const dateParts = text.trim().split(' ');
  if (dateParts.length !== 2) return undefined;

  const dateStr = dateParts[0].replace(/\./g, '-');
  const timeStr = dateParts[1];

  const date = new Date(`${dateStr}T${timeStr}`);
  return isNaN(date.getTime()) ? undefined : date;
}
```

### 2. データベースでの保存

#### スキーマ定義

```prisma
model TradeRecord {
  openTime    DateTime    // 必須フィールド
  closeTime   DateTime?   // オプショナルフィールド
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
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
};
```

#### 表示仕様

- タイムゾーン: Asia/Tokyo（日本時間）
- 表示形式: `YYYY年MM月DD日 HH:mm`
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

- 夏時間（DST）の考慮は不要
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
