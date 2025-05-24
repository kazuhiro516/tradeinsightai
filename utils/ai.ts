import OpenAI from 'openai';
import { OPENAI_MODEL } from '@/utils/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `あなたはFXトレーディングの専門家です。
トレードデータを分析し、以下の点に注意して詳細な分析レポートを作成してください：

1. データに基づいた具体的な分析
2. トレーダーの強みと弱みの特定
3. 改善のための具体的なアドバイス
4. リスク管理の観点からの提案
5. 継続すべき良好なトレード行動の指摘

レポートは日本語でマークダウン形式を使用して作成してください。見出しには適切なマークダウン記法（#, ##, ###など）を使用し、箇条書きリスト、表、強調などのマークダウン記法を活用して読みやすく構造化されたレポートにしてください。専門用語は必要に応じて説明を加えてください。`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0].message.content || '分析レポートの生成に失敗しました。';
  } catch (error) {
    console.error('AIレスポンス生成エラー:', error);
    throw new Error('AIによる分析に失敗しました。');
  }
}
