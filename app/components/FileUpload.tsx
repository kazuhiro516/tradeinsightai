'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, Check, Loader2 } from 'lucide-react';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
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

  // ファイルクリア
  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    // input[type=file]の値もクリアしたいが、ref未使用のため再選択時はonChangeで上書きされる
  };

  return (
    <div className="w-full mt-8">
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 flex flex-col gap-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-6 h-6 text-blue-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ファイルアップロード</h2>
        </div>
        <div
          className={`w-full flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg transition-colors duration-150
            ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          onDrop={isUploading ? undefined : handleDrop}
          onDragOver={isUploading ? undefined : onDragOver}
          onDragLeave={isUploading ? undefined : onDragLeave}
          aria-label="ファイルをアップロード"
        >
          <label className={`w-full h-full flex flex-col items-center justify-center ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">
              <span className="font-semibold">クリックしてファイルを選択</span> またはドラッグ＆ドロップ
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">HTMLファイルのみ (.html, .htm)</p>
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={isUploading ? undefined : onChange}
              disabled={isUploading}
              aria-label="ファイル選択"
            />
          </label>
        </div>
        {/* 選択中ファイルの表示 */}
        {selectedFile && (
          <div className="w-full flex items-center gap-3 mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <FileText className="w-5 h-5 text-blue-500" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</div>
            </div>
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <Check className="w-5 h-5 text-green-500" />
            )}
            <button
              type="button"
              onClick={handleClearFile}
              className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              aria-label="ファイルをクリア"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
