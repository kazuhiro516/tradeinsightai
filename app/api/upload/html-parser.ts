import * as cheerio from 'cheerio';
import { HtmlParserRepository } from './repository';
import { TradeRecord } from './models';

export class CheerioHtmlParser implements HtmlParserRepository {
  async parseHtml(html: string): Promise<TradeRecord[]> {
    const $ = cheerio.load(html);
    const records: TradeRecord[] = [];

    // テーブルのヘッダー行を取得
    const headerRow = $('table tr').first();
    const columnMappings = this.createColumnMappings(headerRow);

    // データ行を処理
    $('table tr').slice(1).each((_, row) => {
      const record = this.extractTradeRecord($(row), columnMappings);
      if (record) {
        records.push(record);
      }
    });

    return records;
  }

  async validateHtml(html: string): Promise<boolean> {
    const $ = cheerio.load(html);
    return $('table').length > 0 && $('table tr').length > 1;
  }

  private createColumnMappings(headerCells: cheerio.Cheerio<cheerio.AnyNode>): Record<string, number> {
    const mappings: Record<string, number> = {};
    headerCells.each((index, cell) => {
      const headerText = $(cell).text().trim().toLowerCase();
      mappings[headerText] = index;
    });
    return mappings;
  }

  private extractTradeRecord(cells: cheerio.Cheerio<cheerio.AnyNode>, mappings: Record<string, number>): TradeRecord | null {
    try {
      return {
        ticket: parseInt(cells.eq(mappings['ticket']).text().trim()),
        openTime: cells.eq(mappings['open time']).text().trim(),
        type: cells.eq(mappings['type']).text().trim(),
        size: parseFloat(cells.eq(mappings['size']).text().trim()),
        item: cells.eq(mappings['item']).text().trim(),
        openPrice: parseFloat(cells.eq(mappings['open price']).text().trim()),
        stopLoss: parseFloat(cells.eq(mappings['s/l']).text().trim()),
        takeProfit: parseFloat(cells.eq(mappings['t/p']).text().trim()),
        closeTime: cells.eq(mappings['close time']).text().trim(),
        closePrice: parseFloat(cells.eq(mappings['close price']).text().trim()),
        commission: parseFloat(cells.eq(mappings['commission']).text().trim()),
        taxes: parseFloat(cells.eq(mappings['taxes']).text().trim()),
        swap: parseFloat(cells.eq(mappings['swap']).text().trim()),
        profit: parseFloat(cells.eq(mappings['profit']).text().trim())
      };
    } catch (error) {
      console.error('Error extracting trade record:', error);
      return null;
    }
  }
} 