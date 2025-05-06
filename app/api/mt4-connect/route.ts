import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';
import crypto from 'crypto';
import { ulid } from 'ulid';

const ENCRYPTION_KEY = process.env.MT4_ENCRYPTION_KEY; // 32 bytes (256bit)
const IV_LENGTH = 16; // AES block size

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('MT4_ENCRYPTION_KEYが未設定、または長さが不正です（32バイト=64文字の16進数で設定してください）');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function POST(request: NextRequest) {
  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
      return createErrorResponse('MT4_ENCRYPTION_KEYが未設定、または長さが不正です（32バイト=64文字の16進数で設定してください）');
    }
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) return errorResponse;

    if (!userId) {
      return createErrorResponse('ユーザーが見つかりません。');
    }

    const { broker, server, loginId, investorPassword } = await request.json();
    if (!broker || !server || !loginId || !investorPassword) {
      return createErrorResponse('全ての項目を入力してください。');
    }

    // パスワード暗号化
    const encryptedInvestorPassword = encrypt(investorPassword);

    // 保存
    await prisma.userMt4Account.create({
      data: {
        id: ulid(),
        userId,
        broker,
        server,
        loginId,
        encryptedInvestorPassword,
      },
    });

    return NextResponse.json({ message: 'MT4連携情報を保存しました。' }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('MT4連携情報保存エラー:', err);
    return createErrorResponse(err.message || 'MT4連携情報の保存に失敗しました');
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log([...request.headers]);
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
      return createErrorResponse('MT4_ENCRYPTION_KEYが未設定、または長さが不正です（32バイト=64文字の16進数で設定してください）');
    }
    const { userId, errorResponse } = await authenticateApiRequest(request);
    if (errorResponse) return errorResponse;

    if (!userId) {
      return createErrorResponse('ユーザーが見つかりません。');
    }

    const account = await prisma.userMt4Account.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        broker: true,
        server: true,
        loginId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    const err = error as Error;
    console.error('MT4連携情報取得エラー:', err);
    return createErrorResponse(err.message || 'MT4連携情報の取得に失敗しました');
  }
}
