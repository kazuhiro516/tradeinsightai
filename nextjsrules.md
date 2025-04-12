# Next.js ベストプラクティス & ルール

## 1. パフォーマンス最適化

### 画像最適化
- `next/image`コンポーネントを使用する
  - 自動的な画像最適化
  - レスポンシブ対応
  - 遅延読み込み
```typescript
import Image from 'next/image'

<Image
  src="/path/to/image.jpg"
  alt="説明文"
  width={500}
  height={300}
  priority={true} // 重要な画像の場合
/>
```

### コード分割とレイジーローディング
- `next/dynamic`を使用した動的インポート
```typescript
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(() => import('../components/Heavy'))
```

### ルーティング最適化
- `next/link`を使用したクライアントサイドナビゲーション
```typescript
import Link from 'next/link'

<Link href="/about">About</Link>
```

## 2. アプリケーション構造

### ディレクトリ構造
```
app/
├── components/     # 再利用可能なコンポーネント
├── lib/           # ユーティリティ関数
├── hooks/         # カスタムフック
├── styles/        # グローバルスタイル
└── (routes)/      # ページとルート
```

### コンポーネント設計
- Server ComponentsとClient Componponentsの適切な使い分け
```typescript
// Server Component
export default async function Page() {
  const data = await fetchData()
  return <Component data={data} />
}

// Client Component
'use client'
export default function InteractiveComponent() {
  const [state, setState] = useState()
  // ...
}
```

## 3. データフェッチング

### サーバーサイドでのデータ取得
- Server Componentsでの非同期データフェッチ
```typescript
async function getData() {
  const res = await fetch('https://api.example.com/data')
  return res.json()
}
```

### キャッシュと再検証
- 適切なキャッシュ戦略の選択
```typescript
fetch(url, { next: { revalidate: 3600 } }) // 1時間ごとに再検証
```

## 4. セキュリティ

### 環境変数
- `.env.local`を使用した機密情報の管理
- 環境変数の型定義
```typescript
// types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string
    DATABASE_URL: string
  }
}
```

### APIルート
- 適切な認証・認可の実装
```typescript
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ...
}
```

## 5. SEO対策

### メタデータ
- 動的メタデータの実装
```typescript
export const metadata = {
  title: 'ページタイトル',
  description: 'ページの説明',
  openGraph: {
    title: 'OGタイトル',
    description: 'OG説明'
  }
}
```

## 6. エラーハンドリング

### エラーページ
- カスタムエラーページの実装
```typescript
// app/error.tsx
'use client'
export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <button onClick={() => reset()}>再試行</button>
    </div>
  )
}
```

## 7. テスト

### ユニットテスト
- Jest + React Testing Libraryの使用
```typescript
import { render, screen } from '@testing-library/react'
import Home from './page'

describe('Home', () => {
  it('renders heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })
})
```

## 8. デプロイメント

### ビルド最適化
- 不要な依存関係の削除
- 適切なキャッシュ戦略の設定
- 環境変数の適切な管理

### モニタリング
- パフォーマンスメトリクスの監視
- エラー追跡の実装

## 9. アクセシビリティ

### WAI-ARIA
- 適切なARIAラベルの使用
```typescript
<button
  aria-label="メニューを開く"
  aria-expanded={isOpen}
>
  <MenuIcon />
</button>
```

### キーボードナビゲーション
- すべての機能がキーボードで操作可能であることを確認

## 10. 開発フロー

### コード品質
- ESLintとPrettierの設定
- TypeScriptの厳格モード有効化
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### バージョン管理
- 意味のあるコミットメッセージ
- ブランチ戦略の統一
- PRテンプレートの活用
