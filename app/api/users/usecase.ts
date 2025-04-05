import { UserRepository } from './repository';
import { User, CreateUserRequest, ErrorResponse } from './models';

export class UserUseCase {
  constructor(private userRepository: UserRepository) {}

  async getCurrentUser(supabaseId: string): Promise<User | ErrorResponse> {
    try {
      const user = await this.userRepository.findBySupabaseId(supabaseId);
      if (!user) {
        return {
          error: 'User not found',
          details: 'The specified user does not exist'
        };
      }
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        error: 'Failed to get user',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createUser(data: CreateUserRequest): Promise<User | ErrorResponse> {
    try {
      // 必須パラメータの検証
      if (!data.email || !data.supabase_id || !data.name) {
        return {
          error: 'Invalid request',
          details: 'Missing required parameters'
        };
      }

      const user = await this.userRepository.create(data);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 