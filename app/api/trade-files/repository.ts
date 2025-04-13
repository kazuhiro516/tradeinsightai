import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PrismaTradeFileRepository {
  async create(data: {
    id: string;
    fileName: string;
    uploadDate: Date;
    fileSize: number;
    fileType: string;
    status: string;
    userId: string;
  }) {
    return prisma.tradeFile.create({
      data
    });
  }

  async findByUserId(userId: string) {
    return prisma.tradeFile.findMany({
      where: { userId },
      orderBy: { uploadDate: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.tradeFile.findUnique({
      where: { id }
    });
  }

  async updateStatus(id: string, status: string, recordsCount?: number, errorMessage?: string) {
    return prisma.tradeFile.update({
      where: { id },
      data: {
        status,
        ...(recordsCount !== undefined && { recordsCount }),
        ...(errorMessage !== undefined && { errorMessage })
      }
    });
  }

  async delete(id: string) {
    return prisma.tradeFile.delete({
      where: { id }
    });
  }
} 