'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

/**
 * ファイルアップロードコンポーネントのProps型定義
 */
interface FileUploadProps {
  /**
   * ファイル選択時に呼び出されるコールバック関数
   */
  onFileSelected: (file: File) => void;

  /**
   * 受け入れるファイルタイプ (MIMEタイプ)
   */
  accept?: string;

  /**
   * 最大ファイルサイズ（バイト単位）
   */
  maxSize?: number;

  /**
   * アップロード中か否か
   */
  isUploading?: boolean;
}

/**
 * ファイルアップロードコンポーネント
 * ドラッグ＆ドロップとクリックでファイルを選択できる
 */
export default function FileUpload({
  onFileSelected,
  accept = '.html,.htm,text/html',
  maxSize = 10 * 1024 * 1024, // 10MB
  isUploading = false
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ファイルの検証を行う
   * @param file 検証するファイル
   * @returns エラーメッセージまたはnull
   */
  const validateFile = useCallback((file: File): string | null => {
    // ファイルタイプのチェック
    const isHtml =
      file.type === 'text/html' ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.htm');

    if (!isHtml) {
      return 'HTMLファイルのみアップロード可能です';
    }

    // ファイルサイズのチェック
    if (file.size > maxSize) {
      return `ファイルサイズは${Math.round(maxSize / 1024 / 1024)}MB以下にしてください`;
    }

    return null;
  }, [maxSize]);

  /**
   * ファイルを処理する
   * @param file 処理するファイル
   */
  const handleFile = useCallback((file: File) => {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelected(file);
  }, [onFileSelected, validateFile]);

  /**
   * ドラッグ＆ドロップイベントを処理する
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  /**
   * ドラッグオーバーイベントを処理する
   */
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * ドラッグリーブイベントを処理する
   */
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * ファイル選択イベントを処理する
   */
  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="w-full">
      <div
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
        onDrop={isUploading ? undefined : handleDrop}
        onDragOver={isUploading ? undefined : onDragOver}
        onDragLeave={isUploading ? undefined : onDragLeave}
      >
        <label className={`flex flex-col items-center justify-center w-full h-full ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">クリックしてファイルを選択</span> またはドラッグ＆ドロップ
            </p>
            <p className="text-xs text-gray-500">HTMLファイルのみ (.html, .htm)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={isUploading ? undefined : onChange}
            disabled={isUploading}
          />
        </label>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
