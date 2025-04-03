import { NextRequest, NextResponse } from 'next/server';

// ユーザー一覧を取得するAPI
export async function GET() {
  try {
    // バックエンドサーバーからユーザー一覧を取得
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: response.status }
      );
    }

    const users = await response.json();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}

// ユーザーを作成するAPI
export async function POST(req: NextRequest) {
  try {
    const userData = await req.json();
    
    // バックエンドサーバーにユーザー作成リクエストを送信
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'ユーザーの作成に失敗しました' }));
      return NextResponse.json(
        { error: errorData.error || 'ユーザーの作成に失敗しました' },
        { status: response.status }
      );
    }

    const newUser = await response.json();
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}
