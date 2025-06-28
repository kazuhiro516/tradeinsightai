#!/usr/bin/env node

/**
 * Dukascopy市場データインポートスクリプト
 *
 * 使用方法:
 * npm run import-dukascopy -- --symbol USDJPY --timeframe 1d --from 2020-01-01 --to 2024-01-01
 * npm run import-dukascopy -- --all
 */

import { PrismaClient } from '@prisma/client';
import { formatForDatabase } from '../utils/market-data-fetcher';

const prisma = new PrismaClient();

// Dukascopy APIの簡易実装（dukascopy-nodeが動作しない場合の代替）
interface DukascopyOptions {
  symbol: string;
  timeframe: string;
  from: Date;
  to: Date;
}

// 実際のDukascopy APIを模擬する関数（将来的にdukascopy-nodeライブラリに置き換え）
async function fetchDukascopyDataMock(options: DukascopyOptions) {
  const { symbol, timeframe, from, to } = options;

  console.log(`📡 Dukascopyからデータ取得中: ${symbol} (${timeframe})`);
  console.log(`📅 期間: ${from.toISOString().split('T')[0]} → ${to.toISOString().split('T')[0]}`);

  // 実際の実装では、ここでDukascopy APIを呼び出す
  // 現在は改良されたサンプルデータで代替
  const { generateRealisticSampleData } = await import('../utils/market-data-fetcher');

  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const timeframeMultiplier: { [key: string]: number } = {
    '1d': 1,
    '4h': 6,
    '1h': 24,
    '30m': 48,
    '15m': 96,
    '5m': 288,
    '1m': 1440,
  };

  const count = days * (timeframeMultiplier[timeframe] || 1);
  const data = generateRealisticSampleData(symbol, timeframe, count, from.toISOString().split('T')[0]);

  console.log(`📊 取得完了: ${data.length}件のデータ`);
  return data;
}

interface ImportOptions {
  symbol: string;
  timeframe: string;
  from: string;
  to: string;
}

async function importDukascopyData(options: ImportOptions) {
  console.log(`🚀 Dukascopy市場データインポート開始: ${options.symbol} (${options.timeframe})`);

  try {
    const fromDate = new Date(options.from);
    const toDate = new Date(options.to);

    // Dukascopyからデータ取得
    const marketData = await fetchDukascopyDataMock({
      symbol: options.symbol,
      timeframe: options.timeframe,
      from: fromDate,
      to: toDate,
    });

    if (marketData.length === 0) {
      console.log('⚠️ 取得データが空です');
      return;
    }

    // データベース形式に変換
    const dbData = formatForDatabase(marketData, options.symbol, options.timeframe);

    console.log('💾 データベースに保存中...');

    // バッチインサート（chunked）
    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < dbData.length; i += BATCH_SIZE) {
      const batch = dbData.slice(i, i + BATCH_SIZE);

      try {
        const results = await Promise.allSettled(
          batch.map(item =>
            prisma.$executeRaw`
              INSERT INTO ohlcv_data (id, symbol, timeframe, timestamp, open, high, low, close, volume, created_at)
              VALUES (gen_random_uuid(), ${item.symbol}, ${item.timeframe}, ${item.timestamp}, ${item.open}, ${item.high}, ${item.low}, ${item.close}, ${item.volume}, NOW())
              ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET
                open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume;
            `
          )
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        inserted += successful;

        console.log(`📝 バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${successful}/${batch.length}件保存`);

      } catch (error) {
        console.error(`❌ バッチ保存エラー:`, error);
      }
    }

    console.log(`✅ 完了: ${inserted}/${dbData.length}件のデータを保存しました`);

  } catch (error) {
    console.error('❌ インポートエラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 仕様で定義された全通貨ペアのDukascopyデータインポート
async function importAllDukascopyData() {
  const symbols = ['USDJPY', 'EURJPY', 'GBPJPY', 'EURUSD', 'GBPUSD'];
  const timeframes = ['1d', '4h', '1h'];
  const from = '2015-01-01';
  const to = '2024-12-31';

  console.log('🌍 全通貨ペアのDukascopyデータインポート開始');
  console.log(`📅 期間: ${from} → ${to}`);
  console.log(`💱 通貨ペア: ${symbols.join(', ')}`);
  console.log(`⏰ 時間足: ${timeframes.join(', ')}`);

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      try {
        console.log(`\n🔄 処理中: ${symbol} - ${timeframe}`);

        await importDukascopyData({
          symbol,
          timeframe,
          from,
          to,
        });

        console.log(`✅ ${symbol} - ${timeframe} 完了`);

        // レート制限を避けるための待機
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ ${symbol} - ${timeframe} のインポートに失敗:`, error);
      }
    }
  }

  console.log('\n🎉 全通貨ペアのDukascopyインポートが完了しました');
}

// メイン実行部分
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    await importAllDukascopyData();
    return;
  }

  const options: ImportOptions = {
    symbol: getArgValue(args, '--symbol') || 'USDJPY',
    timeframe: getArgValue(args, '--timeframe') || '1d',
    from: getArgValue(args, '--from') || '2015-01-01',
    to: getArgValue(args, '--to') || '2024-12-31',
  };

  await importDukascopyData(options);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📊 Dukascopy市場データインポートスクリプト

使用方法:
  npm run import-dukascopy -- [オプション]
  npx tsx scripts/import-dukascopy-data.ts [オプション]

オプション:
  --symbol SYMBOL       通貨ペア (例: USDJPY, EURUSD)
  --timeframe FRAME     時間足 (例: 1m, 5m, 1h, 1d)
  --from DATE           開始日 (YYYY-MM-DD)
  --to DATE             終了日 (YYYY-MM-DD)
  --all                 仕様定義の全通貨ペアをインポート
  --help, -h            このヘルプを表示

対応通貨ペア:
  USDJPY, EURJPY, GBPJPY, EURUSD, GBPUSD

対応時間足:
  1m, 5m, 15m, 30m, 1h, 4h, 1d

例:
  # USDJPY 1日足 2020-2024年をインポート
  npm run import-dukascopy -- --symbol USDJPY --timeframe 1d --from 2020-01-01 --to 2024-01-01

  # EURUSD 1時間足 2023年をインポート
  npm run import-dukascopy -- --symbol EURUSD --timeframe 1h --from 2023-01-01 --to 2023-12-31

  # 全通貨ペアを一括インポート（2015-2024年）
  npm run import-dukascopy -- --all

注意:
  現在はDukascopy APIの代わりに改良されたサンプルデータを使用しています。
  実際のDukascopy APIを使用する場合は、utils/dukascopy-fetcher.tsを修正してください。
  `);
  process.exit(0);
}

// スクリプト実行
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Dukascopyインポート処理が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Dukascopyインポート処理でエラーが発生しました:', error);
      process.exit(1);
    });
}
