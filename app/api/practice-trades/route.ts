import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      symbol,
      timeframe,
      entryTime,
      entryPrice,
      exitTime,
      exitPrice,
      volume,
      tradeType,
      profit,
      memo,
      tags,
      stopLoss,
      takeProfit,
    } = body;

    // Prismaを使用してデータベースに保存
    const practiceTrade = await prisma.practiceTrade.create({
      data: {
        userId: user.id,
        symbol,
        timeframe,
        entryTime: new Date(entryTime * 1000),
        entryPrice,
        exitTime: exitTime ? new Date(exitTime * 1000) : null,
        exitPrice,
        volume,
        tradeType,
        profit,
        status: exitTime ? 'CLOSED' : 'OPEN',
        memo,
        tags,
        stopLoss,
        takeProfit,
      },
    });

    return NextResponse.json({
      success: true,
      trade: practiceTrade,
    });

  } catch (error) {
    console.error('Practice trade creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');

    const where: any = {
      userId: user.id,
    };

    if (symbol) {
      where.symbol = symbol;
    }

    if (status) {
      where.status = status;
    }

    // トレード履歴を取得
    const trades = await prisma.practiceTrade.findMany({
      where,
      orderBy: {
        entryTime: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 総件数を取得
    const total = await prisma.practiceTrade.count({ where });

    return NextResponse.json({
      trades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Practice trades fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
