// app/(適切なフォルダ)/FilterModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { useRouter } from 'next/navigation';

interface SavedFilter {
  id: string;
  name: string;
  filter: Record<string, unknown>;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: Record<string, unknown>) => void;
  type: string; // 'dashboard' | 'trades' など
}

// フィルターオブジェクトの型定義は削除

// エラーレスポンスの型定義は削除

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, type }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<Record<string, unknown>>({
    types: [],
    items: [],
    startDate: "",
    endDate: "",
    sizeMin: "",
    sizeMax: "",
    profitMin: "",
    profitMax: "",
    page: 1,
    pageSize: 10,
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  // 保存済みフィルターの取得
  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        // 認証チェックを追加
        const isAuthenticated = await checkAuthAndSetSession();
        if (!isAuthenticated) {
          router.push('/login');
          return;
        }

        // ユーザーIDを取得
        const { userId } = await getCurrentUserId();
        if (!userId) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/filters?type=${type}&userId=${userId}`);
        if (!response.ok) throw new Error('フィルターの取得に失敗しました');
        const data = await response.json();
        setSavedFilters(data);

        // デフォルトフィルターがあれば適用
        const defaultFilter = data.find((f: SavedFilter) => f.filter.isDefault);
        if (defaultFilter) {
          setFilter(defaultFilter.filter);
        }
      } catch (error) {
        console.error('フィルターの取得エラー:', error);
      }
    };

    if (isOpen) {
      fetchSavedFilters();
    }
  }, [isOpen, type, router]);

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      alert('フィルター名を入力してください');
      return;
    }

    setLoading(true);
    try {
      // 認証チェックを追加
      const isAuthenticated = await checkAuthAndSetSession();
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // ユーザーIDを取得
      const { userId } = await getCurrentUserId();
      if (!userId) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: filterName,
          type,
          filter,
          isDefault,
          userId,
        }),
      });

      if (!response.ok) throw new Error('フィルターの保存に失敗しました');

      const newFilter = await response.json();
      setSavedFilters([...savedFilters, newFilter]);
      setFilterName('');
      setIsDefault(false);
      alert('フィルターを保存しました');
    } catch (error) {
      console.error('フィルターの保存エラー:', error);
      alert('フィルターの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    setFilter(savedFilter.filter);
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "types" || name === "items") {
      // 配列の場合はカンマ区切りで処理
      setFilter(prev => ({
        ...prev,
        [name]: value ? value.split(",").map(item => item.trim()) : []
      }));
    } else if (name === "page" || name === "pageSize" ||
               name === "sizeMin" || name === "sizeMax" ||
               name === "profitMin" || name === "profitMax") {
      // 数値の場合は数値に変換
      setFilter(prev => ({
        ...prev,
        [name]: value ? Number(value) : ""
      }));
    } else {
      // その他の場合はそのまま設定
      setFilter(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleApply = () => {
    // 空の値を削除
    const cleanedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== "" && value !== null && value !== undefined;
      })
    );

    onApply(cleanedFilter);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">フィルター設定</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        {/* 保存済みフィルター */}
        {savedFilters.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">保存済みフィルター</h3>
            <div className="space-y-2">
              {savedFilters.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => handleLoadFilter(saved)}
                  className="w-full text-left px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {saved.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取引タイプ (カンマ区切り)
            </label>
            <input
              type="text"
              name="types"
              value={Array.isArray(filter.types) ? filter.types.join(", ") : ""}
              onChange={handleChange}
              placeholder="例: buy, sell"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取引商品 (カンマ区切り)
            </label>
            <input
              type="text"
              name="items"
              value={Array.isArray(filter.items) ? filter.items.join(", ") : ""}
              onChange={handleChange}
              placeholder="例: usdjpy, eurusd"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                name="startDate"
                value={filter.startDate as string}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                name="endDate"
                value={filter.endDate as string}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最小サイズ
              </label>
              <input
                type="number"
                name="sizeMin"
                value={filter.sizeMin as string}
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大サイズ
              </label>
              <input
                type="number"
                name="sizeMax"
                value={filter.sizeMax as string}
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最小損益
              </label>
              <input
                type="number"
                name="profitMin"
                value={filter.profitMin as string}
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大損益
              </label>
              <input
                type="number"
                name="profitMax"
                value={filter.profitMax as string}
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ページ
              </label>
              <input
                type="number"
                name="page"
                value={filter.page as number}
                onChange={handleChange}
                min="1"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ページサイズ
              </label>
              <input
                type="number"
                name="pageSize"
                value={filter.pageSize as number}
                onChange={handleChange}
                min="1"
                max="100"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* フィルター保存フォーム */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="フィルター名"
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleSaveFilter}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <Save size={16} />
              保存
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">デフォルトとして設定</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
