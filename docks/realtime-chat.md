# 💬 リアルタイムチャット機能 要件定義書

## 概要

ユーザーがAIアシスタントとリアルタイムでチャットを行い、取引データに関する質問や分析を行うことができる機能を提供する。

## 目的

- ユーザーが自身の取引データについて、自然言語で質問し、即座に回答を得られるようにする
- AIアシスタントとの対話を通じて、取引パフォーマンスの分析や改善点の発見を支援する
- チャット形式のインターフェースにより、直感的な操作を実現する

## 対象データ

- XM Tradingからアップロードされたトレード履歴データ
- ユーザーとAIアシスタントの会話履歴

## 基本機能要件

### チャットルーム管理

| 機能 | 説明 |
|-----|------|
| チャットルーム作成 | 新規チャットルームを作成する |
| チャットルーム一覧表示 | 既存のチャットルームを一覧表示する |
| チャットルーム選択 | 既存のチャットルームを選択して会話を継続する |
| チャットルーム名編集 | チャットルーム名を編集する |
| チャットルーム削除 | 不要なチャットルームを削除する |

### メッセージ管理

| 機能 | 説明 |
|-----|------|
| メッセージ送信 | ユーザーがメッセージを送信する |
| メッセージ表示 | 会話履歴をリアルタイムで表示する |
| AI応答生成 | ユーザーのメッセージに対してAI応答を生成する |
| ツール実行結果表示 | 取引データ検索などのツール実行結果を表示する |

## データモデル

### ChatRoom

```typescript
interface ChatRoom {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  metadata?: {
    toolCallResult?: {
      type: 'trade_records';
      data: TradeRecordsResponse;
    };
  };
}
```

## 技術要件

- フロントエンド
  - Next.js
  - Tailwind CSS
  - shadcn/ui
  - Supabase Realtime Client

- バックエンド
  - Next.js API Routes
  - OpenAI API
  - Supabase Database
  - Prisma ORM

## リアルタイム同期の実装

### Supabase Realtimeの設定

```typescript
// チャットルーム内のメッセージをリアルタイムで監視
const subscription = supabaseClient
  .channel(`chat_room:${chatId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'chat_messages',
      filter: `chatRoomId=eq.${chatId}`
    },
    (payload) => {
      // メッセージの追加・更新・削除をリアルタイムで処理
    }
  )
  .subscribe();
```

### イベントタイプ

| イベント | 説明 | 処理内容 |
|---------|------|---------|
| INSERT | 新規メッセージの追加 | メッセージリストに追加し、AIの応答を生成 |
| UPDATE | メッセージの更新 | 該当メッセージの内容を更新 |
| DELETE | メッセージの削除 | メッセージリストから削除 |

## 画面遷移

1. ログイン後、チャット画面（`/chat`）にアクセス
2. 既存のチャットルームがない場合は自動的に新規作成
3. チャットルーム選択時に該当ルームの会話履歴を表示

## エラー処理

### クライアントサイド

| エラー状況 | 対応 |
|-----------|------|
| メッセージ送信失敗 | エラーメッセージを表示し、再送信オプションを提供 |
| WebSocket接続切断 | 自動再接続を試行 |
| データ取得エラー | エラー状態を表示し、再試行ボタンを提供 |

### サーバーサイド

| エラー状況 | 対応 |
|-----------|------|
| OpenAI API エラー | フォールバックメッセージを返却 |
| データベースエラー | エラーレスポンスを返却 |
| 認証エラー | 401/403ステータスを返却 |

## パフォーマンス要件

- WebSocketの接続状態を監視し、切断時は自動再接続
- メッセージの取得は必要な分だけページング
- AIの応答待ち中はローディング表示
- メッセージの送信はデバウンス処理を実装

## セキュリティ要件

- 各チャットルームはユーザーごとに分離
- メッセージのアクセス制御はRLSで実装
- APIエンドポointは認証必須
- センシティブな情報はメタデータとして保存

## 使用例

### 取引データの検索と分析

```typescript
// ユーザーのメッセージ
「2024年1月のUSD/JPYの取引を教えて」

// AIの応答生成とツール実行
const response = await generateAIResponse(message, accessToken);

// ツール実行結果の保存
await supabaseClient.from('chat_messages').insert({
  id: cuid(),
  chatRoomId: chatId,
  message: response,
  sender: 'assistant',
  userId,
  metadata: {
    toolCallResult: {
      type: 'trade_records',
      data: result
    }
  }
});
```

## 注意点

1. リアルタイム機能の利用
   - Supabaseのリアルタイム機能を有効化する必要がある
   - WebSocket接続数に制限があることに注意

2. AIレスポンスの生成
   - レスポンス生成に時間がかかる場合がある
   - エラー時はフォールバックメッセージを用意

3. データの永続化
   - チャット履歴は永続化が必要
   - 大量のメッセージ蓄積に対する考慮が必要
