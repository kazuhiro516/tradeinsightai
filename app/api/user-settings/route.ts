import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/utils/api';
import { generateULID } from '@/utils/ulid';

// AIモデルのシステムプロンプト設定の取得
export async function GET(request: NextRequest) {
  try {
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const settings = await prisma.aIModelSystemPrompt.findUnique({
      where: { userId },
    });

    return NextResponse.json(settings || { systemPrompt: '' });
  } catch (error) {
    console.error('AIモデルのシステムプロンプト設定の取得エラー:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// AIモデルのシステムプロンプト設定の更新
export async function POST(request: NextRequest) {
  try {
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const { systemPrompt } = await request.json();

    const settings = await prisma.aIModelSystemPrompt.upsert({
      where: { userId },
      update: { systemPrompt },
      create: {
        id: generateULID(),
        userId,
        systemPrompt,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('AIモデルのシステムプロンプト設定の更新エラー:', error);
    return NextResponse.json(
      { error: '設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// AIモデルのシステムプロンプト設定の削除
export async function DELETE(request: NextRequest) {
  try {
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    await prisma.aIModelSystemPrompt.delete({
      where: { userId },
    });

    return NextResponse.json({ message: '設定を削除しました' });
  } catch (error) {
    console.error('AIモデルのシステムプロンプト設定の削除エラー:', error);
    return NextResponse.json(
      { error: '設定の削除に失敗しました' },
      { status: 500 }
    );
  }
}
