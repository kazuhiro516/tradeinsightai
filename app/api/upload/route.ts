import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UploadUseCase } from './usecase';
import { CheerioHtmlParser } from './html-parser';
import { ErrorResponse } from './models';

export async function GET() {
  return NextResponse.json({ message: 'Hello from API' })
}

// トレードファイルをアップロードするAPI
export async function POST(request: NextRequest) {
  try {
    // ユーザー認証
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ファイルの取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // アップロード処理
    const htmlParser = new CheerioHtmlParser();
    const uploadUseCase = new UploadUseCase(htmlParser);
    const result = await uploadUseCase.processUpload(file);

    // エラーレスポンスの処理
    if ('error' in result) {
      const errorResponse = result as ErrorResponse;
      return NextResponse.json(
        { error: errorResponse.error, details: errorResponse.details },
        { status: 400 }
      );
    }

    // 成功レスポンス
    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
