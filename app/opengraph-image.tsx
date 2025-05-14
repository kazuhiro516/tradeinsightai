import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};
export const alt = 'TradeInsightAI | AIでFXトレード分析・改善';
export const contentType = 'image/png';
export const runtime = 'edge';

export default async function og() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #38bdf8 100%)',
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: 32,
            letterSpacing: '-2px',
          }}
        >
          TradeInsightAI
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#e0e7ef',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: 900,
            marginBottom: 8,
          }}
        >
          「自覚は規律を促す」
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#e0e7ef',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          裁量トレーダーのためのAIエージェントサービス
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
