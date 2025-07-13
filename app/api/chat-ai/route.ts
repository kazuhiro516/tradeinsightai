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

    // メッセージの長さ制限
    const MAX_MESSAGE_LENGTH = 1000; // 例: 1000文字
    if (message && message.length > MAX_MESSAGE_LENGTH) {
      return createErrorResponse(
        `メッセージは${MAX_MESSAGE_LENGTH}文字以下である必要があります`,
        400
      );
    }

    // AIの応答を生成（フィルターを追加）
    const aiResponse = await generateAIResponse(
      message,
      request.headers.get('authorization')?.split(' ')[1] || '',
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
    console.error('チャットAI APIエラー:', error); // エラーログを修正
    return createErrorResponse('AI応答の生成中にエラーが発生しました'); // 一般的なエラーメッセージに変更
  }
}
