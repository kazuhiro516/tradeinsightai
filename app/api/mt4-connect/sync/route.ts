import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';
import crypto from 'crypto';
import { ulid } from 'ulid';
import { TradeRecordUseCase } from '../../trade-records/usecase';
import { CreateTradeRecordInput } from '@/types/trade';

const ENCRYPTION_KEY = process.env.MT4_ENCRYPTION_KEY;
const MT_CONNECT_API_KEY = process.env.MT_CONNECT_API_KEY;

function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('MT4_ENCRYPTION_KEYが未設定、または長さが不正です（32バイト=64文字の16進数で設定してください）');
  }
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function POST(request: NextRequest) {
  // 先頭で認証
  const { userId, errorResponse } = await authenticateApiRequest(request);
  if (errorResponse) return errorResponse;

  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
      return createErrorResponse('MT4_ENCRYPTION_KEYが未設定、または長さが不正です（32バイト=64文字の16進数で設定してください）');
    }
    if (!MT_CONNECT_API_KEY) {
      return createErrorResponse('MT_CONNECT_API_KEYが未設定です');
    }
    if (!userId) {
      return createErrorResponse('ユーザーが見つかりません。');
    }
    // 最新のMT4連携情報を取得
    const account = await prisma.userMt4Account.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!account) {
      return createErrorResponse('MT4連携情報が登録されていません');
    }
    const investorPassword = decrypt(account.encryptedInvestorPassword);

    // MTConnectAPIのAPI呼び出し
    const body = new URLSearchParams({
      caller: MT_CONNECT_API_KEY, // APIキー（環境変数などで管理）
      tradeserver: account.server, // トレードサーバーのIPアドレスとポート番号（例：'111.222.333.444:443'）
      uid: account.userId, // 任意のユーザーID（最大20文字の英数字）
      uacc: account.loginId, // MT4アカウント番号
      upass: investorPassword, // 投資家パスワード（読み取り専用）
      lastticket: '0', // 全履歴を取得する場合は'0'を指定
      // suffix: '', // 必要に応じてチャートのサフィックスを指定
    });

    const res = await fetch('https://app.mtconnectapi.com/api/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      return createErrorResponse('外部API呼び出しに失敗しました');
    }
    const csv = await res.text();
    // CSVパース
    const lines = csv.split('\n').filter(line => line.startsWith('T,')); // トレードレコードのみ
    if (lines.length === 0) {
      return NextResponse.json({ message: 'トレード履歴がありません' });
    }

    // TradeFileのエントリーを作成または取得
    let tradeFileId = 'mt4-connect';
    const existingTradeFile = await prisma.tradeFile.findFirst({
      where: {
        userId,
        fileName: 'MT4連携'
      }
    });

    if (!existingTradeFile) {
      const tradeFile = await prisma.tradeFile.create({
        data: {
          id: tradeFileId,
          fileName: 'MT4連携',
          uploadDate: new Date(),
          fileSize: csv.length,
          fileType: 'csv',
          status: 'completed',
          userId,
        }
      });
      tradeFileId = tradeFile.id;
    } else {
      tradeFileId = existingTradeFile.id;
    }

    // トレードレコードのユースケースを使用
    const tradeRecordUseCase = new TradeRecordUseCase();

    // CSVからトレードレコードの配列を作成
    const tradeRecords: CreateTradeRecordInput[] = [];

    for (const line of lines) {
      const cols = line.split(',');
      // 例: T,74069785,2024.10.22 17:06:21,0,0.91,USDCHF,0.86628,0.86428,0.87394,2024.10.23 00:00:48,0.86419,0.00000,762.00000,-33176.00000,0,JPY,[sl]
      // [0]T(レコードタイプ), [1]チケット番号, [2]オープン日時, [3]タイプ(0=buy,1=sell), [4]ロット数, [5]通貨ペア, [6]オープン価格,
      // [7]S/L(ストップロス), [8]T/P(テイクプロフィット), [9]クローズ日時, [10]クローズ価格, [11]コミッション, [12]スワップ,
      // [13]利益(通貨単位), [14]マジックナンバー, [15]通貨単位, [16]コメント
      if (cols.length < 15) continue;

      const ticket = Number(cols[1]);
      const openTimeStr = cols[2].replace('.', '-').replace('.', '-');
      const openTime = new Date(openTimeStr.replace(' ', 'T') + '+09:00');
      const typeCode = Number(cols[3]);
      const type = typeCode === 0 ? 'BUY' : 'SELL';
      const size = Number(cols[4]);
      const item = cols[5];
      const openPrice = Number(cols[6]);
      const stopLoss = cols[7] !== '0.000' ? Number(cols[7]) : undefined;
      const takeProfit = cols[8] !== '0.000' ? Number(cols[8]) : undefined;
      const closeTimeStr = cols[9]?.replace('.', '-').replace('.', '-');
      const closeTime = closeTimeStr && closeTimeStr.trim() ? new Date(closeTimeStr.replace(' ', 'T') + '+09:00') : undefined;
      const closePrice = cols[10] && cols[10] !== '0.00000' ? Number(cols[10]) : undefined;
      const commission = cols[11] && cols[11] !== '0.00000' ? Number(cols[11]) : undefined;
      const swap = cols[12] && cols[12] !== '0.00000' ? Number(cols[12]) : undefined;
      const profit = cols[13] && cols[13] !== '0.00000' ? Number(cols[13]) : undefined;
      const comment = cols[16] ? cols[16].replace('\r', '') : undefined;

      tradeRecords.push({
        id: ulid(),
        ticket,
        openTime,
        type,
        size,
        item,
        openPrice,
        stopLoss,
        takeProfit,
        closeTime,
        closePrice,
        commission,
        taxes: undefined,
        swap,
        profit,
        tradeFileId,
      });
    }

    // バッチ処理で一括保存
    const savedRecords = await tradeRecordUseCase.createTradeRecordsBatch(userId, tradeRecords);
    const saved = savedRecords.length;

    // TradeFileの保存レコード数を更新
    if (saved > 0) {
      await prisma.tradeFile.update({
        where: { id: tradeFileId },
        data: { recordsCount: { increment: saved } },
      });
    }

    return NextResponse.json({ message: `${saved}件のトレード履歴を保存しました` });
  } catch (error) {
    const err = error as Error;
    console.error('MT4同期エラー:', err);
    return createErrorResponse(err.message || 'MT4同期に失敗しました');
  }
}
