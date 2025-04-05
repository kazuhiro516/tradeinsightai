import { HtmlParser } from './html-parser';
import { TradeFileRepository } from './repository';
import { TradeRecordRepository } from '../trade-records/repository';
import { ulid } from 'ulid';
import { CreateTradeRecordRequest } from '../trade-records/models';
import { PrismaClient } from '@prisma/client';

export class UploadUseCase {
  private prisma: PrismaClient;

  constructor(
    private htmlParser: HtmlParser,
    private tradeFileRepository: TradeFileRepository,
    private tradeRecordRepository: TradeRecordRepository
  ) {
    this.prisma = new PrismaClient();
  }

  async processUpload(file: File, supabaseId: string) {
    console.log('アップロード処理を開始します:', {
      fileName: file.name,
      fileSize: file.size,
      supabaseId: supabaseId
    });

    try {
      // ユーザーIDを取得
      console.log('ユーザー情報を取得します');
      const user = await this.prisma.user.findUnique({
        where: { supabaseId }
      });

      if (!user) {
        console.error('ユーザーが見つかりません:', supabaseId);
        throw new Error('ユーザーが見つかりません');
      }

      console.log('ユーザー情報を取得しました:', user.id);

      // ファイルの内容を読み込む
      const fileContent = await file.text();
      console.log('ファイルの内容を読み込みました');

      // HTMLを解析して取引データを抽出
      console.log('HTMLの解析を開始します');
      const tradeData = await this.htmlParser.parseHtml(fileContent);
      console.log('HTMLの解析が完了しました:', {
        recordCount: tradeData.length,
        firstRecord: tradeData[0]
      });

      // 取引ファイルレコードを作成
      const fileId = ulid();
      console.log('取引ファイルレコードを作成します:', fileId);
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
      console.log('取引ファイルレコードを作成しました:', tradeFile);

      // 取引記録を作成
      console.log('取引記録の作成を開始します');
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
      console.log('取引記録の作成が完了しました:', {
        count: records.length,
        firstRecord: records[0]
      });

      // 取引ファイルのステータスを更新
      console.log('取引ファイルのステータスを更新します');
      await this.tradeFileRepository.updateStatus(fileId, 'completed');
      console.log('取引ファイルのステータスを更新しました');

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