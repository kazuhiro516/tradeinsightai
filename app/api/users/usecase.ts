import { UserRepository } from './repository';
import { User, CreateUserRequest, ErrorResponse } from './models';

/**
 * ユーザー関連のビジネスロジックを担当するユースケースクラス
 */
export class UserUseCase {
  constructor(private userRepository: UserRepository) {}

  /**
   * SupabaseIDに基づいて現在のユーザー情報を取得する
   * @param supabaseId SupabaseのユーザーID
   * @returns ユーザー情報またはエラーレスポンス
   */
  async getCurrentUser(supabaseId: string): Promise<User | ErrorResponse> {
    try {
      const user = await this.userRepository.findBySupabaseId(supabaseId);
      if (!user) {
        return {
          error: 'ユーザーが見つかりません',
          details: '指定されたユーザーは存在しません'
        };
      }
      return user;
    } catch (error) {
      return {
        error: 'ユーザー情報の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * 新しいユーザーを作成する
   * @param data ユーザー作成に必要なデータ
   * @returns 作成されたユーザー情報またはエラーレスポンス
   */
  async createUser(data: CreateUserRequest): Promise<User | ErrorResponse> {
    try {
      // 必須パラメータの検証
      if (!data.supabaseId || !data.name) {
        return {
          error: 'リクエストが不正です',
          details: '必須パラメータが不足しています'
        };
      }

      const user = await this.userRepository.create(data);
      return user;
    } catch (error) {
      return {
        error: 'ユーザーの作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }
}
