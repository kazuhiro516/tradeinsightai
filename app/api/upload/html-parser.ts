import * as cheerio from 'cheerio';
import { HtmlParserRepository } from './repository';
import { CreateTradeRecordRequest } from '../trade-records/models';

export class CheerioHtmlParser implements HtmlParserRepository {
  async validateHtml(html: string): Promise<boolean> {
    const $ = cheerio.load(html);
    const table = $('table');
    return table.length > 0;
  }

  async parseHtml(html: string): Promise<CreateTradeRecordRequest[]> {
    const $ = cheerio.load(html);
    const records: CreateTradeRecordRequest[] = [];

    $('table tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;

      const record: CreateTradeRecordRequest = {
        tradeFileId: '', // 後で設定
        ticket: this.parseNumber(cells.eq(0).text()),
        openTime: this.parseDate(cells.eq(1).text()),
        type: cells.eq(2).text(),
        symbol: cells.eq(3).text(),
        size: this.parseNumber(cells.eq(4).text()),
        openPrice: this.parseNumber(cells.eq(5).text()),
        stopLoss: this.parseNumber(cells.eq(6).text()),
        takeProfit: this.parseNumber(cells.eq(7).text()),
        closeTime: this.parseDate(cells.eq(8).text()),
        closePrice: this.parseNumber(cells.eq(9).text()),
        commission: this.parseNumber(cells.eq(10).text()),
        taxes: this.parseNumber(cells.eq(11).text()),
        swap: this.parseNumber(cells.eq(12).text()),
        profit: this.parseNumber(cells.eq(13).text())
      };

      records.push(record);
    });

    return records;
  }

  private parseNumber(text: string): number | undefined {
    const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  private parseDate(text: string): Date | undefined {
    const date = new Date(text);
    return isNaN(date.getTime()) ? undefined : date;
  }
} 