'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { checkAuthAndSetSession } from '@/utils/auth';
import { createClient } from '@/utils/supabase/client';

/**
 * ファイルアップロードページコンポーネント
 * 取引履歴HTMLファイルをアップロードする機能を提供
 */
export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recordsCount, setRecordsCount] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // コンポーネントマウント時に認証状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 共通認証処理を使用
        const isAuth = await checkAuthAndSetSession();
        setIsAuthenticated(isAuth);

        if (isAuth) {
          // Supabaseを使用してセッションを取得
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.access_token) {
            setAccessToken(session.access_token);
          }
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * ファイル選択時の処理
   */
  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setSuccess(null);
  };

  /**
   * フォーム送信時の処理
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError('認証が必要です。再度ログインしてください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ファイルのアップロードに失敗しました');
      }

      const data = await response.json();

      setSuccess('取引履歴の取込に成功しました');
      setRecordsCount(data.recordCount);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'アップロード中にエラーが発生しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">取引履歴アップロード</h1>

      {!isAuthenticated && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center text-yellow-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          ログインが必要です。アップロードするにはログインしてください。
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取引履歴HTMLファイルを選択
            </label>
            <FileUpload
              onFileSelected={handleFileSelected}
              isUploading={isLoading}
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                選択されたファイル: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
              {recordsCount !== null && (
                <span className="ml-1">（{recordsCount}件の取引を処理しました）</span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isLoading || !isAuthenticated}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              ${!file || isLoading || !isAuthenticated
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? 'アップロード中...' : 'アップロード'}
          </button>
        </form>
      </div>
    </div>
  );
}
