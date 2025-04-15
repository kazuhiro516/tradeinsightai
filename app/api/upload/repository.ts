import { PrismaClient } from '@prisma/client';
import { TradeFile } from './models';
import { CreateTradeRecordInput } from '../trade-records/models';

export interface HtmlParserRepository {
  parseHtml(html: string): Promise<CreateTradeRecordInput[]>;
  validateHtml(html: string): Promise<boolean>;
}

export interface TradeFileRepository {
  create(file: TradeFile): Promise<TradeFile>;
  findById(id: string): Promise<TradeFile | null>;
  findByUserId(userId: string): Promise<TradeFile[]>;
  update(id: string, file: Partial<TradeFile>): Promise<TradeFile>;
  updateStatus(id: string, status: string): Promise<TradeFile>;
  delete(id: string): Promise<void>;
}

export class PrismaTradeFileRepository implements TradeFileRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(file: NonNullable<TradeFile>): Promise<TradeFile> {
    return this.prisma.tradeFile.create({
      data: file
    });
  }

  async findById(id: string): Promise<TradeFile | null> {
    return this.prisma.tradeFile.findUnique({
      where: { id }
    });
  }

  async findByUserId(userId: string): Promise<TradeFile[]> {
    return this.prisma.tradeFile.findMany({
      where: { userId }
    });
  }

  async update(id: string, file: Partial<NonNullable<TradeFile>>): Promise<TradeFile> {
    return this.prisma.tradeFile.update({
      where: { id },
      data: file
    });
  }

  async updateStatus(id: string, status: string): Promise<TradeFile> {
    return this.prisma.tradeFile.update({
      where: { id },
      data: { status }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tradeFile.delete({
      where: { id }
    });
  }
} 