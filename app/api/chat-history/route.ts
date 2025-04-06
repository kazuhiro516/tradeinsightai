import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    // セッション情報を取得
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      );
    }

    // ユーザーを取得
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // URLパラメータからチャットIDを取得
    const url = new URL(req.url);
    const chatId = url.searchParams.get('chatId');

    // チャットIDが指定されている場合は特定のチャットのメッセージを取得
    if (chatId) {
      const messages = await prisma.chatMessage.findMany({
        where: {
          userId: dbUser.id,
          chatId: chatId
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // メッセージの形式を変換
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message,
        createdAt: msg.createdAt
      }));

      return NextResponse.json({ messages: formattedMessages });
    }

    // チャットIDが指定されていない場合は、ユーザーの全チャットセッションを取得
    const chatSessions = await prisma.chatMessage.groupBy({
      by: ['chatId'],
      where: {
        userId: dbUser.id
      },
      _max: {
        createdAt: true
      },
      orderBy: {
        _max: {
          createdAt: 'desc'
        }
      }
    });

    // 各チャットセッションの最初のメッセージを取得してタイトルとして使用
    const chatHistory = await Promise.all(
      chatSessions.map(async (session) => {
        const firstMessage = await prisma.chatMessage.findFirst({
          where: {
            userId: dbUser.id,
            chatId: session.chatId,
            sender: 'user'
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        return {
          chatId: session.chatId,
          title: firstMessage ? firstMessage.message.substring(0, 50) + (firstMessage.message.length > 50 ? '...' : '') : '新規チャット',
          lastMessageAt: session._max.createdAt
        };
      })
    );

    return NextResponse.json({ chatHistory });
  } catch (error) {
    console.error('チャット履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'チャット履歴の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // セッション情報を取得
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      );
    }

    // ユーザーを取得
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // URLパラメータからチャットIDを取得
    const url = new URL(req.url);
    const chatId = url.searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'チャットIDが指定されていません' },
        { status: 400 }
      );
    }

    // 指定されたチャットIDのメッセージを削除
    await prisma.chatMessage.deleteMany({
      where: {
        userId: dbUser.id,
        chatId: chatId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('チャット履歴削除エラー:', error);
    return NextResponse.json(
      { error: 'チャット履歴の削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 