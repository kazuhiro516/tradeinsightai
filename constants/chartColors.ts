export const CHART_COLORS = {
  winRate: '#2b6cb0',      // 勝率（ブルー）
  totalProfit: '#38a169',  // 総利益（グリーン）
  profit: '#48bb78',       // 利益（明るいグリーン）
  loss: '#e53e3e',         // 損失（レッド）
  drawdown: '#dd6b20',     // ドローダウン（オレンジ）
  drawdownPercent: '#c53030', // ドローダウン率（ダークレッド）
  symbol: '#1a202c',       // 通貨ペア名（ダークグレー）
  label: '#718096',        // ラベル・補助テキスト（グレー）
};

export const CHART_COLORS_DARK = {
  winRate: '#60a5fa',      // 勝率（ライトブルー）
  totalProfit: '#68d391',  // 総利益（ライトグリーン）
  profit: '#81e6d9',       // 利益（シアン）
  loss: '#f87171',         // 損失（ライトレッド）
  drawdown: '#f6ad55',     // ドローダウン（ライトオレンジ）
  drawdownPercent: '#f87171', // ドローダウン率（ライトレッド）
  symbol: '#e2e8f0',       // 通貨ペア名（ライトグレー）
  label: '#cbd5e1',        // ラベル・補助テキスト（グレー）
};

export function getChartColors(theme: 'light' | 'dark' | 'system') {
  // "system"はwindow.matchMediaで判定するのが理想だが、呼び出し元で解決する前提
  return theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS;
}
