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
| フィルター適用 | ユーザーが設定したフィルターをメタデータとして保存し、AIに伝達する |

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
    userFilter?: TradeFilter; // 追加: ユーザーが設定したフィルター
  };
}
```

### TradeFilter

```typescript
interface TradeFilter {
  type?: 'buy' | 'sell';    // 取引タイプ
  item?: string;            // 通貨ペア
  startDate?: Date;         // 開始日
  endDate?: Date;           // 終了日
  profitMin?: number;       // 最小利益
  profitMax?: number;       // 最大利益
  // その他のフィルター条件
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

## 処理フロー

### ユーザーメッセージ送信からAI応答までの流れ

1. **ユーザーがメッセージを送信**
   - `sendMessage(message, filter?)` 関数を呼び出し
   - フィルター情報があれば `metadata.userFilter` としてメッセージに保存
   - メッセージを Supabase の `chat_messages` テーブルに挿入

2. **リアルタイム購読がメッセージを検知**
   - Supabase Realtime の INSERT イベントを検知
   - `sender: 'user'` の場合、AI応答生成プロセスを開始

3. **AI応答の生成**
   - リアルタイムイベントから直接フィルター情報を取得
   - `/api/chat-ai` エンドポイントにリクエスト送信
   - リクエストにはユーザーメッセージとフィルター情報を含める

4. **APIエンドポイントの処理**
   - OpenAI API を使用して応答を生成
   - フィルターがある場合は事前に取引データを取得
   - 取得したデータをプロンプトに含める、またはツール呼び出し結果として使用

5. **AI応答の保存と表示**
   - AI応答を `chat_messages` テーブルに保存
   - ツール実行結果がある場合は `metadata.toolCallResult` として保存
   - リアルタイム購読が INSERT イベントを検知し、UI に応答を表示

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
      if (payload.eventType === 'INSERT') {
        // 新しいメッセージをUI表示用に変換
        const newMsg = payload.new as DbMessage;
        const formattedMsg = {
          id: newMsg.id,
          role: newMsg.sender === 'user' ? 'user' : 'assistant',
          content: newMsg.message,
          createdAt: newMsg.createdAt,
          metadata: newMsg.metadata
        };

        // メッセージリストに追加
        setMessages((prev) => [...prev, formattedMsg]);

        // ユーザーメッセージの場合、AI応答を生成
        if (newMsg.sender === 'user') {
          // リアルタイムイベントから直接メタデータを取得
          generateAIResponse(newMsg.message, newMsg.metadata?.userFilter);
        }
      }
      // その他のイベントタイプ（UPDATE, DELETE）の処理
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

## 最適化ポイント

### フィルター情報の伝達

#### 実装方法
1. **メタデータとして保存**
   ```typescript
   // ユーザーメッセージ送信時
   const { error } = await supabaseClient.from('chat_messages').insert({
     // 基本情報
     id: cuid(),
     chatRoomId: chatId,
     message,
     sender: 'user',
     userId,
     createdAt: new Date().toISOString(),
     // フィルター情報をメタデータに保存
     metadata: filter ? { userFilter: filter } : undefined
   });
   ```

2. **リアルタイムイベントから直接取得**
   ```typescript
   // リアルタイムイベント処理時
   if (newMsg.sender === 'user') {
     // ペイロードから直接メタデータを取得してAI応答生成関数に渡す
     generateAIResponse(newMsg.message, newMsg.metadata?.userFilter);
   }
   ```

3. **APIリクエストに含める**
   ```typescript
   // AI応答生成関数内
   const response = await fetch('/api/chat-ai', {
     method: 'POST',
     headers: { /* ヘッダー情報 */ },
     body: JSON.stringify({
       message: userMessage,
       filter: userFilter, // リアルタイムイベントから取得したフィルター
     }),
   });
   ```

### パフォーマンス最適化

- 不要なデータベースクエリの削除（リアルタイムイベントから直接メタデータを取得）
- React状態更新の最適化（状態変数の削減）
- 必要なメッセージのみを取得するページング実装

## セキュリティ要件

- 各チャットルームはユーザーごとに分離
- メッセージのアクセス制御はRLSで実装
- APIエンドポイントは認証必須
- センシティブな情報はメタデータとして保存

## エラー処理

### クライアントサイド

| エラー状況 | 対応 |
|-----------|------|
| メッセージ送信失敗 | エラーメッセージを表示し、再送信オプションを提供 |
| WebSocket接続切断 | 自動再接続を試行 |
| データ取得エラー | エラー状態を表示し、再試行ボタンを提供 |
| AI応答生成エラー | フォールバックメッセージを表示 |

### サーバーサイド

| エラー状況 | 対応 |
|-----------|------|
| OpenAI API エラー | フォールバックメッセージを返却 |
| データベースエラー | エラーレスポンスを返却 |
| 認証エラー | 401/403ステータスを返却 |
| フィルターパースエラー | デフォルトフィルターを使用 |

## 注意点とベストプラクティス

1. **リアルタイム機能の利用**
   - Supabaseのリアルタイム機能を有効化する必要がある
   - WebSocket接続数に制限があることに注意

2. **AIレスポンスの生成**
   - レスポンス生成に時間がかかる場合がある
   - エラー時はフォールバックメッセージを用意

3. **データの永続化**
   - チャット履歴は永続化が必要
   - 大量のメッセージ蓄積に対する考慮が必要

4. **フィルター情報の管理**
   - フィルター情報はメタデータとして保存し、直接取得する
   - React状態に依存せず、データベースの値を信頼する
   - 複雑なフィルター条件はサーバー側で整形・検証する
