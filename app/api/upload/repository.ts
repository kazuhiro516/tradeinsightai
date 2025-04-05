import { TradeRecord } from './models';

export interface HtmlParserRepository {
  parseHtml(html: string): Promise<TradeRecord[]>;
  validateHtml(html: string): Promise<boolean>;
} 