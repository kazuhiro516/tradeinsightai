import { prisma } from '@/lib/prisma';
import { UserRepository } from './repository';
import { User, CreateUserRequest } from './models';

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
        supabaseId: data.supabase_id,
        name: data.name,
      }
    });
    return user;
  }
} 