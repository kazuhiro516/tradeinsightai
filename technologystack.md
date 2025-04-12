# TradeInsightAI 技術スタック

## フレームワークとコアライブラリ
- **Next.js** (v15.1.6)
  - React Server Components対応
  - App Routerを使用
  - Turbopackによる高速開発環境

- **React** (v19.0.0)
  - Server ComponentsとClient Componentsの併用
  - 最新のReact機能を活用

## データベースと認証
- **Supabase**
  - `@supabase/supabase-js` (v2.49.1) - メインクライアント
  - `@supabase/ssr` (v0.6.1) - SSR対応
  - リアルタイムサブスクリプション機能
  - Row Level Security (RLS)による堅牢なセキュリティ

- **Prisma** (v6.5.0)
  - タイプセーフなデータベース操作
  - マイグレーション管理
  - スキーマ駆動開発

## AI/機械学習
- **OpenAI SDK** (v4.85.2)
  - GPTモデルとの対話
  - AI機能の実装
- **AI SDK** (v4.3.2)
  - AIストリーミングの実装
  - エッジランタイム対応

## UIコンポーネント
- **Radix UI**
  - `@radix-ui/react-scroll-area` (v1.2.3)
  - `@radix-ui/react-slot` (v1.1.2)
  - アクセシビリティ対応コンポーネント

- **Lucide React** (v0.475.0)
  - モダンなアイコンライブラリ
  - カスタマイズ可能なSVGアイコン

## スタイリング
- **Tailwind CSS** (v3.4.17)
  - JITコンパイラ
  - カスタムアニメーション
  - ユーティリティファースト

- **関連ライブラリ**
  - `class-variance-authority` (v0.7.1) - 条件付きスタイリング
  - `tailwind-merge` (v3.1.0) - クラス名の最適化
  - `tailwindcss-animate` (v1.0.7) - アニメーション拡張

## ユーティリティ
- **日付処理**
  - `date-fns` (v4.1.0)

- **ID生成**
  - `cuid` (v3.0.0)
  - `ulid` (v3.0.0)
  - `uuid` (v11.1.0)

- **DOM操作**
  - `jsdom` (v26.0.0)
  - `cheerio` (v1.0.0)

## 開発ツール
- **TypeScript** (v5)
- **ESLint** (v9)
- **PostCSS** (v8.5.2)

## 開発環境設定
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

## 特徴
- 最新のNext.js機能を活用した高パフォーマンスなアプリケーション
- Supabaseによるリアルタイムデータ同期
- OpenAIを活用したAI機能の実装
- アクセシビリティを考慮したUIコンポーネント
- 型安全なデータベース操作
- モダンな開発環境とツールチェーン
