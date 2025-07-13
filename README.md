# TradeInsightAI

TradeInsightAIは、トレーディングデータを分析し、AIを活用した洞察を提供するオープンソースのアプリケーションです。ユーザーは取引履歴をアップロードし、詳細なダッシュボードでパフォーマンスを視覚化したり、AIチャットボットと対話して市場のトレンドや戦略に関する質問をしたりできます。

## 機能

*   **取引履歴のアップロード**: さまざまな形式の取引履歴ファイルをアップロードし、システムに取り込みます。
*   **インタラクティブなダッシュボード**: 損益、勝率、リスクリワード比など、主要なトレーディングメトリクスを視覚的に表示します。
*   **AIチャットボット**: OpenAIのGPTモデルを活用し、アップロードされたデータに基づいた質問応答や市場分析を提供します。
*   **分析レポート生成**: AIが生成した詳細な取引分析レポートを作成します。
*   **リアルタイムチャット**: AIチャットボットとのリアルタイム対話機能。
*   **ユーザー設定**: アプリケーションの動作をカスタマイズするための設定。

## 技術スタック

### フレームワークとコアライブラリ
- **Next.js** (v15.1.6)
  - React Server Components対応
  - App Routerを使用
  - Turbopackによる高速開発環境

- **React** (v19.0.0)
  - Server ComponentsとClient Componentsの併用
  - 最新のReact機能を活用

### データベースと認証
- **Supabase**
  - `@supabase/supabase-js` (v2.49.1) - メインクライアント
  - `@supabase/ssr` (v0.6.1) - SSR対応
  - リアルタイムサブスクリプション機能
  - Row Level Security (RLS)による堅牢なセキュリティ

- **Prisma** (v6.5.0)
  - タイプセーフなデータベース操作
  - マイグレーション管理
  - スキーマ駆動開発

### AI/機械学習
- **OpenAI SDK** (v4.85.2)
  - GPTモデルとの対話
  - AI機能の実装
- **AI SDK** (v4.3.2)
  - AIストリーミングの実装
  - エッジランタイム対応

### UIコンポーネント
- **Radix UI**
  - `@radix-ui/react-scroll-area` (v1.2.3)
  - `@radix-ui/react-slot` (v1.1.2)
  - アクセシビリティ対応コンポーネント

- **Lucide React** (v0.475.0)
  - モダンなアイコンライブラリ
  - カスタマイズ可能なSVGアイコン

### スタイリング
- **Tailwind CSS** (v3.4.17)
  - JITコンパイラ
  - カスタムアニメーション
  - ユーティリティファースト

- **関連ライブラリ**
  - `class-variance-authority` (v0.7.1) - 条件付きスタイリング
  - `tailwind-merge` (v3.1.0) - クラス名の最適化
  - `tailwindcss-animate` (v1.0.7) - アニメーション拡張

### ユーティリティ
- **日付処理**
  - `date-fns` (v4.1.0)

- **ID生成**
  - `cuid` (v3.0.0)
  - `ulid` (v3.0.0)
  - `uuid` (v11.1.0)

- **DOM操作**
  - `jsdom` (v26.0.0)
  - `cheerio` (v1.0.0)

### 開発ツール
- **TypeScript** (v5)
- **ESLint** (v9)
- **PostCSS** (v8.5.2)

## セットアップ

### 前提条件

*   Node.js (v18.x 以降を推奨)
*   npm, yarn, pnpm, または bun
*   Docker (Supabase CLIを使用しない場合)
*   Supabaseプロジェクト (Supabase CLIまたはSupabaseウェブサイトから)
*   OpenAI APIキー

### 環境変数の設定

`.env.example`を参考に、プロジェクトのルートディレクトリに`.env.local`ファイルを作成し、以下の変数を設定してください。

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase公開Anonキー

# Database Configuration
DATABASE_URL=あなたのSupabaseデータベース接続文字列 (Prisma用)
DIRECT_URL=あなたのSupabaseデータベース接続文字列 (Prisma用、直接接続)

# API Configuration
BACKEND_URL=http://localhost:3000 (開発環境の場合)

# OpenAI Configuration
OPENAI_API_KEY=あなたのOpenAI APIキー
```

### 依存関係のインストール

```bash
npm install
```

### データベースのセットアップ (Supabase & Prisma)

1.  **Supabaseプロジェクトの準備**:
    Supabaseのウェブサイトで新しいプロジェクトを作成するか、Supabase CLIを使用してローカルでSupabaseをセットアップします。

    ```bash
    # Supabase CLIをインストールしていない場合
    npm install -g supabase-cli

    # Supabaseログイン (ブラウザが開きます)
    supabase login

    # Supabaseプロジェクトを初期化 (既存のプロジェクトに接続する場合)
    supabase init

    # Supabaseプロジェクトをリンク (既存のプロジェクトIDを指定)
    supabase link --project-ref your-project-id

    # ローカルでSupabaseを起動 (開発用)
    supabase start
    ```

2.  **Prismaマイグレーションの適用**:
    Supabaseデータベースにスキーマを適用します。

    ```bash
    npx prisma migrate dev --name init
    ```

    または、既存のマイグレーションを適用します。

    ```bash
    npx prisma migrate deploy
    ```

### 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、アプリケーションが表示されます。
