import { NextRequest, NextResponse } from 'next/server';
import { PrismaTradeFileRepository } from './repository';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';

const tradeFileRepository = new PrismaTradeFileRepository();

// ユーザーのTradeFile一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    const tradeFiles = await tradeFileRepository.findByUserId(userId!);
    return NextResponse.json(tradeFiles);
  } catch (error) {
    console.error('TradeFile取得エラー:', error);
    return createErrorResponse(
      'TradeFileの取得に失敗しました',
      500
    );
  }
}

// TradeFileを削除
export async function DELETE(request: NextRequest) {
  try {
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'ファイルIDが必要です' }, { status: 400 });
    }

    // ファイルの存在確認と所有権チェック
    const file = await tradeFileRepository.findById(fileId);
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    }
    if (file.userId !== userId) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    await tradeFileRepository.delete(fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TradeFile削除エラー:', error);
    return createErrorResponse(
      'TradeFileの削除に失敗しました',
      500
    );
  }
} 