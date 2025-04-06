// app/(適切なフォルダ)/FilterModal.tsx
"use client";
import React, { useState } from "react";
import { X } from "lucide-react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: Record<string, unknown>) => void; // 親にフィルターを渡す
}

// フィルターオブジェクトの型定義は削除

// エラーレスポンスの型定義は削除

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply }) => {
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
      Object.entries(filter).filter(([_, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== "" && value !== null && value !== undefined;
      })
    );
    
    onApply(cleanedFilter);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">フィルター設定</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
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
              className="w-full p-2 border rounded-md"
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
              className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
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
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
