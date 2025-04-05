import { HtmlParserRepository } from './repository';
import { TradeFile, TradeRecord, ErrorResponse } from './models';

export class UploadUseCase {
  constructor(private htmlParser: HtmlParserRepository) {}

  async processUpload(file: File): Promise<TradeFile | ErrorResponse> {
    try {
      // ファイルの検証
      if (!this.validateFile(file)) {
        return {
          error: 'Invalid file',
          details: 'File must be an HTML file and less than 5MB'
        };
      }

      // ファイルの内容を読み取り
      const html = await file.text();

      // HTMLの検証
      const isValid = await this.htmlParser.validateHtml(html);
      if (!isValid) {
        return {
          error: 'Invalid HTML',
          details: 'File must contain a valid trade history table'
        };
      }

      // トレードレコードの解析
      const records = await this.htmlParser.parseHtml(html);

      // トレードファイルの作成
      const tradeFile: TradeFile = {
        id: Date.now(),
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        fileSize: file.size,
        fileType: file.type,
        status: 'completed',
        recordsCount: records.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return tradeFile;
    } catch (error) {
      console.error('Error processing upload:', error);
      return {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private validateFile(file: File): boolean {
    return (
      file.type === 'text/html' &&
      file.size <= 5 * 1024 * 1024 // 5MB
    );
  }
} 