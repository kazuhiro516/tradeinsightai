import { NextRequest, NextResponse } from 'next/server';
import { CheerioHtmlParser } from './html-parser';
import { UploadUseCase } from './usecase';
import { PrismaTradeFileRepository } from './repository';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';

// リポジトリとユースケースの初期化
const htmlParser = new CheerioHtmlParser();
const tradeFileRepository = new PrismaTradeFileRepository();
const uploadUseCase = new UploadUseCase(htmlParser, tradeFileRepository);

/**
 * アップロードAPIの状態確認
 */
export async function GET() {
  return NextResponse.json({ status: 'ready' });
}

/**
 * トレードファイルをアップロードするAPI
 */
export async function POST(request: NextRequest) {
  try {
    // APIリクエストの認証と、ユーザーIDの取得
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) {
      return errorResponse;
    }

    // ファイルの取得と検証
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        error: 'ファイルが見つかりません',
        details: 'リクエストにファイルが含まれていません'
      }, { status: 400 });
    }

    // MIMEタイプの検証
    if (file.type !== 'text/html') {
      return NextResponse.json({
        error: '無効なファイル形式です',
        details: 'HTMLファイルのみアップロード可能です'
      }, { status: 400 });
    }

    // ファイル処理
    const result = await uploadUseCase.processUpload(file, userId!);

    return NextResponse.json(result);
  } catch (error) {
    console.error('アップロードエラー:', error);
    return createErrorResponse(
      'ファイルのアップロードに失敗しました',
      500
    );
  }
}
