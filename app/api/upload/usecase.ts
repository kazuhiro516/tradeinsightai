import { HtmlParser } from './html-parser';
import { TradeFileRepository } from './repository';
import { ulid } from 'ulid';
// import { CreateTradeRecordInput } from '@/types/trade'; // ←未使用なので削除
import { prisma } from '@/lib/prisma';

/**
 * アップロード処理を行うユースケースクラス
 */
export class UploadUseCase {
  constructor(
    private htmlParser: HtmlParser,
    private tradeFileRepository: TradeFileRepository
  ) {}

  /**
   * アップロードファイルの処理を行う
   * @param file アップロードされたファイル
   * @param userId ユーザーID
   * @returns 処理結果
   */
  async processUpload(file: File, userId: string) {
    try {
      // ファイルの内容を読み込む
      const fileContent = await file.text();

      // HTMLを解析して取引データを抽出
      const tradeData = await this.htmlParser.parseHtml(fileContent);

      // 既存のticket一覧を一括取得
      const tickets = tradeData.map((d) => d.ticket);
      const existingRecords = await prisma.tradeRecord.findMany({
        where: {
          userId,
          ticket: { in: tickets }
        },
        select: { ticket: true }
      });
      const existingTickets = new Set(existingRecords.map(r => r.ticket));

      // 重複を除外した新規データのみ抽出
      const newRecords = tradeData.filter(d => !existingTickets.has(d.ticket));
      const skippedCount = tradeData.length - newRecords.length;

      // トランザクションでファイル・レコード作成
      const fileId = ulid();
      await prisma.$transaction(async (tx) => {
        // 取引ファイルレコードを作成
        await this.tradeFileRepository.create({
          id: fileId,
          fileName: file.name,
          uploadDate: new Date(),
          fileSize: file.size,
          fileType: file.type,
          status: 'processing',
          recordsCount: tradeData.length,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          errorMessage: null
        });

        // 新規レコードをbulk insert
        if (newRecords.length > 0) {
          await tx.tradeRecord.createMany({
            data: newRecords.map((data) => ({
              id: ulid(),
              ticket: data.ticket,
              openTime: data.openTime,
              type: data.type,
              size: data.size ?? 0,
              item: data.item,
              openPrice: data.openPrice ?? 0,
              stopLoss: data.stopLoss ?? null,
              takeProfit: data.takeProfit ?? null,
              closeTime: data.closeTime,
              closePrice: data.closePrice ?? 0,
              commission: data.commission ?? null,
              taxes: data.taxes ?? null,
              swap: data.swap ?? null,
              profit: data.profit ?? null,
              tradeFileId: fileId,
              userId: userId
            }))
          });
        }

        // 取引ファイルのステータスを更新
        await this.tradeFileRepository.updateStatus(fileId, 'completed');
      });

      return {
        success: true,
        recordCount: newRecords.length,
        skippedCount,
        fileId: fileId
      };
    } catch (error) {
      console.error('アップロード処理中にエラーが発生しました:', error);
      throw error;
    }
  }
}
