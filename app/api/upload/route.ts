import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { parseHTML } from '@/lib/html-parser';

// エラーレスポンスのインターフェース
interface ErrorResponse {
  error: string;
  details?: string;
}

// トレードファイルのステータス
type TradeFileStatus = 'pending' | 'processing' | 'completed' | 'failed';

// トレードファイルのインターフェース
interface TradeFile {
  id: number;
  fileName: string;
  uploadDate: string;
  fileSize: number;
  fileType: string;
  status: TradeFileStatus;
  recordsCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  return NextResponse.json({ message: 'Hello from API' })
}

// トレードファイルをアップロードするAPI
export async function POST(request: NextRequest) {
  try {
    // 認証ユーザーを取得
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // ユーザーを取得
    const dbUser = await prisma.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // フォームデータを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (!file.type.includes('html') && !file.type.includes('text')) {
      return NextResponse.json(
        { error: 'HTMLファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズの検証（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    // ファイルの内容を取得
    const fileContent = await file.text();

    // トレードファイルを作成
    const tradeFile = await prisma.tradeFile.create({
      data: {
        fileName: file.name,
        uploadDate: new Date(),
        fileSize: file.size,
        fileType: file.type,
        status: 'pending',
        recordsCount: 0,
      },
    });

    // 非同期でHTMLを解析してトレードレコードを作成
    processHTMLFile(fileContent, tradeFile.id, dbUser.id).catch(error => {
      console.error('HTMLファイル処理エラー:', error);
      // エラーをログに記録するだけで、ユーザーへのレスポンスは既に返されている
    });

    return NextResponse.json(tradeFile, { status: 201 });
  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    return NextResponse.json(
      { error: 'ファイルのアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

// HTMLファイルを解析してトレードレコードを作成する非同期関数
async function processHTMLFile(
  htmlContent: string,
  fileId: number,
  userId: string
): Promise<void> {
  try {
    // ファイルのステータスを処理中に更新
    await prisma.tradeFile.update({
      where: { id: fileId },
      data: { status: 'processing' },
    });

    // HTMLを解析してトレードレコードを取得
    const records = parseHTML(htmlContent);

    // トレードレコードを作成
    if (records.length > 0) {
      // バッチサイズを設定（一度に処理するレコード数）
      const batchSize = 100;

      // バッチ処理でレコードを作成
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await prisma.tradeRecord.createMany({
          data: batch.map(record => ({
            ...record,
            userId,
          })),
        });
      }
    }

    // ファイルのステータスを完了に更新
    await prisma.tradeFile.update({
      where: { id: fileId },
      data: {
        status: 'completed',
        recordsCount: records.length,
      },
    });
  } catch (error) {
    console.error('HTMLファイル処理エラー:', error);
    // ファイルのステータスを失敗に更新
    await prisma.tradeFile.update({
      where: { id: fileId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '不明なエラー',
      },
    });
  }
}
