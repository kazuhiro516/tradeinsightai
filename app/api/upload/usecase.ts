import { HtmlParserRepository, TradeFileRepository } from './repository';
import { TradeRecordRepository } from '../trade-records/repository';
import { TradeFile } from './models';
import { CreateTradeRecordRequest } from '../trade-records/models';
import { ulid } from 'ulid';

export class UploadUseCase {
  constructor(
    private htmlParser: HtmlParserRepository,
    private tradeFileRepository: TradeFileRepository,
    private tradeRecordRepository: TradeRecordRepository
  ) {}

  async processUpload(file: File, userId: string) {
    const html = await file.text();
    const isValid = await this.htmlParser.validateHtml(html);
    if (!isValid) {
      throw new Error('無効なHTMLファイルです');
    }

    const records = await this.htmlParser.parseHtml(html);
    const tradeFile: TradeFile = {
      id: ulid(),
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: 'PROCESSING',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const savedFile = await this.tradeFileRepository.create(tradeFile);

    for (const record of records) {
      const tradeRecord: CreateTradeRecordRequest = {
        ...record,
        tradeFileId: savedFile.id
      };
      await this.tradeRecordRepository.create(userId, tradeRecord);
    }

    await this.tradeFileRepository.update(savedFile.id, {
      status: 'COMPLETED'
    });

    return {
      fileId: savedFile.id,
      recordCount: records.length
    };
  }
} 