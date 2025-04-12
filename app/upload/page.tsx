'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { checkAuthAndSetSession } from '@/utils/auth';
import { createClient } from '@/utils/supabase/client';
import { TradeFile } from '@/types/api';

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
  const [tradeFiles, setTradeFiles] = useState<TradeFile[]>([]);

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
            fetchTradeFiles(session.access_token);
          }
        }
      } catch (err) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const fetchTradeFiles = async (token: string) => {
    try {
      const response = await fetch('/api/trade-files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('取引ファイルの取得に失敗しました');
      }

      const data = await response.json();
      setTradeFiles(data);
    } catch (err) {
      console.error('取引ファイル取得エラー:', err);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!accessToken) return;

    // 削除の確認
    if (!confirm('このファイルと関連する取引記録がすべて削除されます。本当に削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/trade-files?id=${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('ファイルの削除に失敗しました');
      }

      // 成功したら一覧を更新
      fetchTradeFiles(accessToken);
    } catch (err) {
      console.error('ファイル削除エラー:', err);
      setError('ファイルの削除に失敗しました');
    }
  };

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
      
      // アップロード成功後にファイル一覧を更新
      fetchTradeFiles(accessToken);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'アップロード中にエラーが発生しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'processing': return '処理中';
      case 'failed': return '失敗';
      default: return '不明';
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

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
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

      {/* 取引ファイル一覧 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">アップロード履歴</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ファイル名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アップロード日時</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サイズ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">取引数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tradeFiles.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{file.fileName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(file.uploadDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatFileSize(file.fileSize)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`${getStatusColor(file.status)}`}>
                      {getStatusText(file.status)}
                    </span>
                    {file.errorMessage && (
                      <span className="ml-2 text-xs text-red-500" title={file.errorMessage}>
                        (エラー)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.recordsCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-900"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {tradeFiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    アップロードされたファイルはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
