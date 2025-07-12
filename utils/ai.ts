import OpenAI from 'openai';
import { OPENAI_MODEL } from '@/utils/openai'
import { getAnalysisReportSystemPrompt } from '@/utils/analysisReportPrompt';
import { getCurrentJST } from '@/utils/date';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    // 現在の日時を取得（日本時間）
    const currentDateTime = getCurrentJST();

    // Few-Shot Promptingを含むシステムプロンプトを取得（日時付き）
    const systemPrompt = getAnalysisReportSystemPrompt(currentDateTime);

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return completion.choices[0].message.content || '分析レポートの生成に失敗しました。';
  } catch (error) {
    console.error('AIレスポンス生成エラー:', error);
    throw new Error('AIによる分析に失敗しました。');
  }
}
