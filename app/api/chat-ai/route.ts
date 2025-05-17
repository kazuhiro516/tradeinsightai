import { NextRequest } from 'next/server';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';
import { generateAIResponse } from '@/utils/openai';
import { TradeFilter } from '@/types/trade';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { message, filter } = await request.json();
    const userFilter: TradeFilter = filter || {};

    // AIの応答を生成（フィルターを追加）
    const aiResponse = await generateAIResponse(
      message,
      request.headers.get('authorization')?.split(' ')[1] || '',
      userFilter
    );

    // レスポンスを返す
    return new Response(JSON.stringify({
      message: aiResponse.message,
      hasToolCalls: !!aiResponse.toolCallResults,
      toolCallResults: aiResponse.toolCallResults
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in chat-ai API:', error);
    return createErrorResponse(error as string);
  }
}
