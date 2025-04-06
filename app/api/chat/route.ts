import { OpenAI } from 'openai';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { ulid } from 'ulid';

// OpenAI設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// システムプロンプトを定数として定義
const SYSTEM_PROMPT = `あなたは取引データアナリストアシスタントです。
ユーザーの質問に対して、取引データを分析し、洞察を提供します。`;

export async function POST(req: Request): Promise<Response> {
  try {
    // セッション情報を取得
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new Response(JSON.stringify({
        error: '認証が必要です。ログインしてください。',
        details: 'セッションが見つかりません。'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    
    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { supabaseId: session.user.id }
    });
    
    if (!user) {
      return new Response(JSON.stringify({
        error: 'ユーザーが見つかりません',
        details: 'データベースにユーザーが存在しません'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // チャットスレッドIDが指定されていない場合は新規作成
    let chatThreadId = body.chatId;
    let chatThread;
    
    if (!chatThreadId) {
      // 新しいチャットスレッドを作成
      chatThread = await prisma.chatThread.create({
        data: {
          id: ulid(),
          userId: user.id,
          title: null // 最初のメッセージから後で設定
        }
      });
      chatThreadId = chatThread.id;
    } else {
      // 既存のチャットスレッドを取得
      chatThread = await prisma.chatThread.findUnique({
        where: {
          id: chatThreadId,
          userId: user.id
        }
      });
      
      if (!chatThread) {
        return new Response(JSON.stringify({
          error: 'チャットスレッドが見つかりません',
          details: '指定されたチャットスレッドは存在しないか、アクセス権限がありません'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // ユーザーのメッセージを保存
    if (body.messages?.length > 0) {
      const lastMessage = body.messages[body.messages.length - 1];
      if (lastMessage.role === 'user') {
        await prisma.chatMessage.create({
          data: {
            id: ulid(),
            userId: user.id,
            sender: 'user',
            message: lastMessage.content,
            chatThreadId: chatThreadId
          }
        });
        
        // 新規チャットの場合、最初のメッセージをタイトルとして設定
        if (!chatThread.title) {
          await prisma.chatThread.update({
            where: { id: chatThreadId },
            data: {
              title: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
            }
          });
        }
      }
    }
    
    // AIの応答を生成
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(body.messages || [])
      ],
      stream: true,
    });

    // レスポンスをストリーミング
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(content));
          }
        }
        
        // AIの応答を保存
        await prisma.chatMessage.create({
          data: {
            id: ulid(),
            userId: user.id,
            sender: 'ai',
            message: fullResponse,
            chatThreadId: chatThreadId
          }
        });
        
        // チャットスレッドの更新日時を更新
        await prisma.chatThread.update({
          where: { id: chatThreadId },
          data: { updatedAt: new Date() }
        });
        
        controller.close();
      }
    });

    // ストリーミングレスポンスを返す
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('チャットAPIエラー:', error);
    return new Response(JSON.stringify({
      error: 'チャットの処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
