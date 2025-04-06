import { prisma } from '@/lib/prisma';
import { UserRepository } from './repository';
import { User, CreateUserRequest } from './models';
import { ulid } from 'ulid';

export class PrismaUserRepository implements UserRepository {
  async findBySupabaseId(supabaseId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { supabaseId }
    });
    return user;
  }

  async create(data: CreateUserRequest): Promise<User> {
    const user = await prisma.user.create({
      data: {
        id: ulid(),
        supabaseId: data.supabaseId,
        name: data.name,
      }
    });
    return user;
  }
} 