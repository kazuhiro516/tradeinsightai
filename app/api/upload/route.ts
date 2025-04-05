import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CheerioHtmlParser } from './html-parser';
import { UploadUseCase } from './usecase';
import { PrismaTradeFileRepository } from './repository';
import { PrismaTradeRecordRepository } from '../trade-records/repository';
import { ErrorResponse } from './models';

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// リポジトリとユースケースの初期化
const htmlParser = new CheerioHtmlParser();
const tradeFileRepository = new PrismaTradeFileRepository();
const tradeRecordRepository = new PrismaTradeRecordRepository();
const uploadUseCase = new UploadUseCase(htmlParser, tradeFileRepository, tradeRecordRepository);

export async function GET() {
  return NextResponse.json({ message: 'Hello from API' })
}

// トレードファイルをアップロードするAPI
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 });
    }

    const result = await uploadUseCase.processUpload(file, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}
