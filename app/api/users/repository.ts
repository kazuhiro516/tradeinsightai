import { User, CreateUserRequest } from './models';

export interface UserRepository {
  findBySupabaseId(supabaseId: string): Promise<User | null>;
  create(data: CreateUserRequest): Promise<User>;
} 