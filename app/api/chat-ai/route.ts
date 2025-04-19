import { NextRequest } from 'next/server';
import { TradeFilter } from '@/types/trade';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';
import { PrismaTradeRecordRepository } from '@/app/api/trade-records/database';
import { generateAIResponse } from '@/utils/openai';

function parseTradeFilter(message: string): TradeFilter {
  const filter: TradeFilter = {};

  // 日付の抽出
  const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/g);
  if (dateMatch && dateMatch.length >= 2) {
    filter.startDate = new Date(dateMatch[0]);
    filter.endDate = new Date(dateMatch[1]);
  }

  // チケット番号の抽出
  const ticketMatch = message.match(/チケット(?:番号)?[:：]?\s*(\d+)/);
  if (ticketMatch) {
    filter.ticket = parseInt(ticketMatch[1]);
  }

  // 取引タイプの抽出
  const typeMatch = message.match(/タイプ[:：]?\s*(\w+)/);
  if (typeMatch) {
    filter.type = typeMatch[1];
  }

  // 通貨ペアの抽出
  const itemMatch = message.match(/通貨ペア[:：]?\s*(\w+)/);
  if (itemMatch) {
    filter.item = itemMatch[1];
  }

  // ロットサイズの抽出
  const sizeMatch = message.match(/ロットサイズ[:：]?\s*([\d.]+)/);
  if (sizeMatch) {
    filter.sizeMin = parseFloat(sizeMatch[1]);
    filter.sizeMax = parseFloat(sizeMatch[1]);
  }

  // 利益の抽出
  const profitMatch = message.match(/利益[:：]?\s*([\d.]+)/);
  if (profitMatch) {
    filter.profitMin = parseFloat(profitMatch[1]);
    filter.profitMax = parseFloat(profitMatch[1]);
  }

  return filter;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { message } = await request.json();

    // メッセージから取引記録の検索条件を抽出
    const filter = parseTradeFilter(message);
    filter.userId = auth.userId as string;

    // トレードレコードリポジトリを初期化
    const repository = new PrismaTradeRecordRepository();

    // 取引記録を検索
    const result = await repository.findMany(auth.userId as string, filter);

    // AIの応答を生成
    const aiResponse = await generateAIResponse(message, request.headers.get('authorization')?.split(' ')[1] || '');

    // レスポンスを返す
    return new Response(JSON.stringify({
      message: aiResponse,
      hasToolCalls: true,
      toolCallResults: result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in chat-ai API:', error);
    return createErrorResponse(error as string);
  }
}
