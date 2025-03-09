import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello from API' })
}

export async function POST(req: NextRequest) {
  try {
    // FormDataを取得
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // ファイルの存在確認
    if (!file) {
      return NextResponse.json(
        { message: 'ファイルが見つかりません' },
        { status: 400 }
      );
    }

    // ファイルタイプのバリデーション
    const fileType = file.type;
    const fileName = file.name;
    const isHtml =
      fileType === 'text/html' ||
      fileName.endsWith('.html') ||
      fileName.endsWith('.htm');

    if (!isHtml) {
      return NextResponse.json(
        { message: 'HTMLファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズのバリデーション（10MB以下）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    // バックエンドサーバーにファイルを転送
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    // FormDataを新規作成してファイルを追加
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const response = await fetch(`${backendUrl}/api/upload`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `サーバーエラー (${response.status})` }));
      return NextResponse.json(
        { message: errorData.message || 'ファイルのアップロードに失敗しました' },
        { status: response.status }
      );
    }

    // バックエンドからのレスポンスを転送
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: 'アップロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
