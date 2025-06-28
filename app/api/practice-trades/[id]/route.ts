import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { memo } = body;

    // ユーザーの取引であることを確認し、メモを更新
    const updatedTrade = await prisma.practiceTrade.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        memo,
        updatedAt: new Date(),
      },
    });

    if (updatedTrade.count === 0) {
      return NextResponse.json(
        { error: 'Trade not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Memo updated successfully',
    });

  } catch (error) {
    console.error('Practice trade update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
