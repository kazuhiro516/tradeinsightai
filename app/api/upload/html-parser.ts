import * as cheerio from 'cheerio';
import { CreateTradeRecordRequest } from '../trade-records/models';

export interface HtmlParser {
  parseHtml(html: string): Promise<CreateTradeRecordRequest[]>;
  validateHtml(html: string): Promise<boolean>;
}

export class CheerioHtmlParser implements HtmlParser {
  async validateHtml(html: string): Promise<boolean> {
    const $ = cheerio.load(html);
    const table = $('table');
    return table.length > 0;
  }

  async parseHtml(html: string): Promise<CreateTradeRecordRequest[]> {
    const $ = cheerio.load(html);
    const records: CreateTradeRecordRequest[] = [];

    // ヘッダー行をスキップするためのフラグ
    let isHeader = true;
    let isClosedTransactions = false;

    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;

      // セクションの識別
      const firstCellText = cells.eq(0).text().trim();
      
      if (firstCellText === 'Closed Transactions:') {
        isClosedTransactions = true;
        isHeader = true;
        return;
      }
      
      if (firstCellText === 'Open Trades:' || firstCellText === 'Working Orders:') {
        isClosedTransactions = false;
        isHeader = true;
        return;
      }
      
      // ヘッダー行をスキップ
      if (isHeader) {
        isHeader = false;
        return;
      }
      
      // 取引データの行を処理
      if (isClosedTransactions && cells.length >= 14) {
        // 取引データの行を処理
        const ticketText = cells.eq(0).text().trim();
        
        // チケット番号が数値でない場合はスキップ（サマリー行など）
        if (!/^\d+$/.test(ticketText)) {
          return;
        }
        
        const record: CreateTradeRecordRequest = {
          tradeFileId: '', // 後で設定
          ticket: parseInt(ticketText, 10),
          openTime: this.parseDate(cells.eq(1).text()) || new Date(),
          type: cells.eq(2).text().trim().toLowerCase(),
          size: this.parseNumber(cells.eq(3).text()) || 0,
          item: cells.eq(4).text().trim().toLowerCase(),
          openPrice: this.parseNumber(cells.eq(5).text()) || 0,
          stopLoss: this.parseNumber(cells.eq(6).text()),
          takeProfit: this.parseNumber(cells.eq(7).text()),
          closeTime: this.parseDate(cells.eq(8).text()),
          closePrice: this.parseNumber(cells.eq(9).text()),
          commission: this.parseNumber(cells.eq(10).text()),
          taxes: this.parseNumber(cells.eq(11).text()),
          swap: this.parseNumber(cells.eq(12).text()),
          profit: this.parseNumber(cells.eq(13).text())
        };

        // 有効な取引データのみ追加
        if (record.ticket && record.item && record.item !== '') {
          records.push(record);
        }
      }
    });

    console.log(`解析結果: ${records.length}件の取引記録を抽出しました`);
    if (records.length > 0) {
      console.log('最初の取引記録:', records[0]);
    }

    return records;
  }

  private parseNumber(text: string): number | undefined {
    if (!text || text.trim() === '') return undefined;
    
    // 数値以外の文字を削除（カンマ、通貨記号など）
    const cleanText = text.replace(/[^0-9.-]/g, '');
    if (cleanText === '') return undefined;
    
    const num = parseFloat(cleanText);
    return isNaN(num) ? undefined : num;
  }

  private parseDate(text: string): Date | undefined {
    if (!text || text.trim() === '') return undefined;
    
    // 日付形式: YYYY.MM.DD HH:MM:SS
    const dateParts = text.trim().split(' ');
    if (dateParts.length !== 2) return undefined;
    
    const dateStr = dateParts[0].replace(/\./g, '-');
    const timeStr = dateParts[1];
    
    const date = new Date(`${dateStr}T${timeStr}`);
    return isNaN(date.getTime()) ? undefined : date;
  }
} 