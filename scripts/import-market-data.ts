#!/usr/bin/env node

/**
 * 市場データインポートスクリプト
 *
 * 使用方法:
 * npm run import-data -- --symbol USDJPY --timeframe 1d --period 10y
 * node scripts/import-market-data.ts --symbol USDJPY --timeframe 1d --period 10y
 */

import { PrismaClient } from '@prisma/client';
import { fetchYahooFinanceData, generateRealisticSampleData, formatForDatabase } from '../utils/market-data-fetcher';
import console from 'console';

const prisma = new PrismaClient();

interface ImportOptions {
  symbol: string;
  timeframe: string;
  period: string;
  source: 'yahoo' | 'sample' | 'dukascopy';
  startDate?: string;
  endDate?: string;
}

async function importMarketData(options: ImportOptions) {
  console.log(`🚀 市場データインポート開始: ${options.symbol} (${options.timeframe})`);

  try {
    let marketData;

    if (options.source === 'yahoo') {
      console.log('📡 Yahoo Financeからデータ取得中...');
      marketData = await fetchYahooFinanceData(options.symbol, options.period);
    } else if (options.source === 'dukascopy') {
      console.log('⚠️ Dukascopyデータ取得は専用スクリプトを使用してください:');
      console.log('npm run import-dukascopy -- --symbol', options.symbol, '--timeframe', options.timeframe);
      throw new Error('Use import-dukascopy script for Dukascopy data');
    } else {
      console.log('🎲 サンプルデータ生成中...');
      const count = getPeriodCount(options.period, options.timeframe);
      const startDate = options.startDate || '2015-01-01';
      marketData = generateRealisticSampleData(options.symbol, options.timeframe, count, startDate);
    }

    console.log(`📊 ${marketData.length}件のデータを取得しました`);

    // データベース形式に変換
    const dbData = formatForDatabase(marketData, options.symbol, options.timeframe);

    console.log('💾 データベースに保存中...');

    // バッチインサート（chunked）
    const BATCH_SIZE = 1000;
    let inserted = 0;

    for (let i = 0; i < dbData.length; i += BATCH_SIZE) {
      const batch = dbData.slice(i, i + BATCH_SIZE);

      try {
        // Note: 実際のPrismaでは、正しいモデル名を使用してください
        // エラーログから推測すると、正しい名前が必要です
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

function getPeriodCount(period: string, timeframe: string): number {
  const periodMap: { [key: string]: number } = {
    '1d': 1,
    '1w': 7,
    '1m': 30,
    '3m': 90,
    '6m': 180,
    '1y': 365,
    '2y': 730,
    '5y': 1825,
    '10y': 3650,
  };

  const timeframeMultiplier: { [key: string]: number } = {
    '1d': 1,
    '4h': 6,
    '1h': 24,
    '30m': 48,
    '15m': 96,
    '5m': 288,
    '1m': 1440,
  };

  const days = periodMap[period] || 365;
  const multiplier = timeframeMultiplier[timeframe] || 1;

  return days * multiplier;
}

// 全通貨ペアのデータインポート
async function importAllCurrencyPairs() {
  const symbols = ['USDJPY', 'EURJPY', 'GBPJPY', 'EURUSD', 'GBPUSD'];
  const timeframes = ['1d', '4h', '1h'];

  console.log('🌍 全通貨ペアのデータインポート開始');

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      try {
        await importMarketData({
          symbol,
          timeframe,
          period: '10y',
          source: 'sample', // 実際のAPIキーがある場合は 'yahoo' に変更
          startDate: '2015-01-01',
        });

        // レート制限を避けるための待機
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ ${symbol}-${timeframe} のインポートに失敗:`, error);
      }
    }
  }

  console.log('🎉 全通貨ペアのインポートが完了しました');
}

// メイン実行部分
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    await importAllCurrencyPairs();
    return;
  }

  const options: ImportOptions = {
    symbol: getArgValue(args, '--symbol') || 'USDJPY',
    timeframe: getArgValue(args, '--timeframe') || '1d',
    period: getArgValue(args, '--period') || '1y',
    source: (getArgValue(args, '--source') as 'yahoo' | 'sample') || 'sample',
    startDate: getArgValue(args, '--start-date'),
    endDate: getArgValue(args, '--end-date'),
  };

  await importMarketData(options);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// ヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📊 市場データインポートスクリプト

使用方法:
  npm run import-data -- [オプション]
  node scripts/import-market-data.ts [オプション]

オプション:
  --symbol SYMBOL       通貨ペア (例: USDJPY, EURUSD)
  --timeframe FRAME     時間足 (例: 1m, 5m, 1h, 1d)
  --period PERIOD       期間 (例: 1d, 1w, 1m, 1y, 10y)
  --source SOURCE       データソース (yahoo|sample)
  --start-date DATE     開始日 (YYYY-MM-DD)
  --end-date DATE       終了日 (YYYY-MM-DD)
  --all                 全通貨ペアをインポート
  --help, -h            このヘルプを表示

例:
  npm run import-data -- --symbol USDJPY --timeframe 1d --period 5y
  npm run import-data -- --all
  `);
  process.exit(0);
}

// スクリプト実行
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ インポート処理が正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ インポート処理でエラーが発生しました:', error);
      process.exit(1);
    });
}
