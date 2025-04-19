import { NextRequest } from 'next/server';
import { authenticateApiRequest, createErrorResponse } from '@/utils/api';
import { generateAIResponse } from '@/utils/openai';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { message } = await request.json();

    // AIの応答を生成
    const aiResponse = await generateAIResponse(message, request.headers.get('authorization')?.split(' ')[1] || '');

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
