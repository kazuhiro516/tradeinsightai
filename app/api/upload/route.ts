import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CheerioHtmlParser } from './html-parser';
import { UploadUseCase } from './usecase';
import { PrismaTradeFileRepository } from './repository';
import { PrismaTradeRecordRepository } from '../trade-records/repository';

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
  console.log('アップロードAPIが呼び出されました');
  
  try {
    // 認証ヘッダーの取得と検証
    const authHeader = request.headers.get('authorization');
    console.log('認証ヘッダー:', authHeader ? '存在します' : '存在しません');
    
    if (!authHeader) {
      console.log('認証ヘッダーがありません');
      return NextResponse.json({ 
        error: '認証が必要です', 
        details: 'Authorization ヘッダーが含まれていません' 
      }, { status: 401 });
    }

    // Bearer トークンの抽出
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('認証ヘッダーの形式が不正です:', authHeader);
      return NextResponse.json({ 
        error: '認証ヘッダーの形式が不正です', 
        details: 'Authorization ヘッダーは "Bearer {token}" の形式である必要があります' 
      }, { status: 401 });
    }

    const token = parts[1];
    console.log('トークン:', token ? '存在します' : '存在しません');
    
    if (!token) {
      console.log('トークンがありません');
      return NextResponse.json({ 
        error: '認証トークンが無効です', 
        details: 'トークンが空です' 
      }, { status: 401 });
    }
    
    // Supabase認証
    console.log('Supabase認証を開始します');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Supabase認証エラー:', authError);
      return NextResponse.json({ 
        error: '認証に失敗しました', 
        details: authError.message 
      }, { status: 401 });
    }
    
    if (!user) {
      console.log('ユーザーが見つかりません');
      return NextResponse.json({ 
        error: 'ユーザーが見つかりません', 
        details: 'トークンに対応するユーザーが存在しません' 
      }, { status: 401 });
    }
    
    console.log('認証成功:', user.id);

    // ファイルの取得と検証
    const formData = await request.formData();
    const file = formData.get('file') as File;
    console.log('ファイル:', file ? `存在します (${file.name}, ${file.size} bytes)` : '存在しません');
    
    if (!file) {
      console.log('ファイルがありません');
      return NextResponse.json({ 
        error: 'ファイルが見つかりません', 
        details: 'リクエストにファイルが含まれていません' 
      }, { status: 400 });
    }

    // ファイル処理
    console.log('ファイル処理を開始します');
    const result = await uploadUseCase.processUpload(file, user.id);
    console.log('ファイル処理が完了しました:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('アップロードエラー:', error);
    return NextResponse.json(
      { 
        error: 'ファイルのアップロードに失敗しました', 
        details: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    );
  }
}
