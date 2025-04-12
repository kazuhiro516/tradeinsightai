import { HtmlParser } from './html-parser';
import { TradeFileRepository } from './repository';
import { TradeRecordRepository } from '../trade-records/repository';
import { ulid } from 'ulid';
import { CreateTradeRecordRequest } from '../trade-records/models';
import { prisma } from '@/lib/prisma';

/**
 * アップロード処理を行うユースケースクラス
 */
export class UploadUseCase {
  constructor(
    private htmlParser: HtmlParser,
    private tradeFileRepository: TradeFileRepository,
    private tradeRecordRepository: TradeRecordRepository
  ) {}

  /**
   * アップロードファイルの処理を行う
   * @param file アップロードされたファイル
   * @param supabaseId ユーザーのSupabase ID
   * @returns 処理結果
   */
  async processUpload(file: File, supabaseId: string) {
    try {
      // ユーザーIDを取得
      const user = await prisma.user.findUnique({
        where: { supabaseId }
      });

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // ファイルの内容を読み込む
      const fileContent = await file.text();

      // HTMLを解析して取引データを抽出
      const tradeData = await this.htmlParser.parseHtml(fileContent);

      // 取引ファイルレコードを作成
      const fileId = ulid();
      const tradeFile = await this.tradeFileRepository.create({
        id: fileId,
        fileName: file.name,
        uploadDate: new Date(),
        fileSize: file.size,
        fileType: file.type,
        status: 'processing',
        recordsCount: tradeData.length,
        userId: user.id
      });

      // 取引記録を作成
      const records = await Promise.all(
        tradeData.map(async (data: CreateTradeRecordRequest) => {
          const recordId = ulid();
          return this.tradeRecordRepository.create(user.id, {
            id: recordId,
            ticket: data.ticket,
            openTime: data.openTime,
            type: data.type,
            size: data.size,
            item: data.item,
            openPrice: data.openPrice,
            stopLoss: data.stopLoss,
            takeProfit: data.takeProfit,
            closeTime: data.closeTime,
            closePrice: data.closePrice,
            commission: data.commission,
            taxes: data.taxes,
            swap: data.swap,
            profit: data.profit,
            tradeFileId: fileId
          });
        })
      );

      // 取引ファイルのステータスを更新
      await this.tradeFileRepository.updateStatus(fileId, 'completed');

      return {
        success: true,
        recordCount: records.length,
        fileId: fileId
      };
    } catch (error) {
      console.error('アップロード処理中にエラーが発生しました:', error);
      throw error;
    }
  }
}
