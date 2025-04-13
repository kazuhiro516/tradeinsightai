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
    const chatRoomId = url.searchParams.get('chatId');

    // チャットIDが指定されている場合は特定のチャットのメッセージを取得
    if (chatRoomId) {
      const messages = await prisma.chatMessage.findMany({
        where: {
          userId: dbUser.id,
          chatRoomId: chatRoomId
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

    // チャットIDが指定されていない場合は、ユーザーの全チャットスレッドを取得
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        userId: dbUser.id
      },
      include: {
        chatMessages: {
          orderBy: {
            createdAt: 'asc'
          },
          take: 1,
          where: {
            sender: 'user'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // チャット履歴の形式を変換
    const chatHistory = chatRooms.map(room => ({
      chatId: room.id,
      title: room.title || (room.chatMessages[0]?.message.substring(0, 50) + (room.chatMessages[0]?.message.length > 50 ? '...' : '') || '新規チャット'),
      lastMessageAt: room.updatedAt
    }));

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
    const chatRoomId = url.searchParams.get('chatId');

    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'チャットIDが指定されていません' },
        { status: 400 }
      );
    }

    // 指定されたチャットルームを削除（関連するメッセージは自動的に削除される）
    await prisma.chatRoom.delete({
      where: {
        id: chatRoomId,
        userId: dbUser.id
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