'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

export default function FileUpload({
  onFileSelected,
  accept = '.html,.htm,text/html',
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelected(file);
  }, [onFileSelected, validateFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    handleFile(files[0]);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
        onDrop={handleDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
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
            onChange={onChange}
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
