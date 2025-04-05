// app/(適切なフォルダ)/FilterModal.tsx
"use client";
import React, { useState } from "react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: Record<string, unknown>) => void; // 親にフィルターを渡す
}

// フィルターオブジェクトの型定義は削除

// エラーレスポンスの型定義は削除

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply }) => {
  // フィルター入力用のステート
  const [ticketIds, setTicketIds] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [types, setTypes] = useState("");
  const [items, setItems] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [profitMin, setProfitMin] = useState("");
  const [profitMax, setProfitMax] = useState("");
  const [openPriceMin, setOpenPriceMin] = useState("");
  const [openPriceMax, setOpenPriceMax] = useState("");
  const [page, setPage] = useState("");
  const [pageSize, setPageSize] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"" | "asc" | "desc">("");
  const [error, setError] = useState<string | null>(null);

  // 「適用」ボタン押下時
  const handleApply = () => {
    const filter: Record<string, unknown> = {};

    if (ticketIds.trim()) {
      filter.ticketIds = ticketIds
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((num) => !isNaN(num));
    }
    if (startDate.trim()) filter.startDate = startDate;
    if (endDate.trim()) filter.endDate = endDate;
    if (types.trim()) {
      filter.types = types.split(",").map((t) => t.trim());
    }
    if (items.trim()) {
      filter.items = items.split(",").map((i) => i.trim());
    }
    if (sizeMin.trim()) filter.sizeMin = parseFloat(sizeMin);
    if (sizeMax.trim()) filter.sizeMax = parseFloat(sizeMax);
    if (profitMin.trim()) filter.profitMin = parseFloat(profitMin);
    if (profitMax.trim()) filter.profitMax = parseFloat(profitMax);
    if (openPriceMin.trim()) filter.openPriceMin = parseFloat(openPriceMin);
    if (openPriceMax.trim()) filter.openPriceMax = parseFloat(openPriceMax);
    if (page.trim()) filter.page = parseInt(page, 10);
    if (pageSize.trim()) filter.pageSize = parseInt(pageSize, 10);
    if (sortBy.trim()) filter.sortBy = sortBy;
    if (sortOrder) filter.sortOrder = sortOrder;

    // フィルターオブジェクトを文字列に変換
    // const filterString = JSON.stringify(filter); // 未使用の変数を削除

    // エラーハンドリング
    if (error) {
      console.error('Error applying filter:', error);
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Unknown error occurred';
      setError(`フィルターの適用に失敗しました: ${errorMessage}`);
      return;
    }

    // 親にフィルターを渡す
    onApply(filter);
    // モーダルを閉じる
    onClose();
  };

  // モーダルが閉じている場合は何も描画しない
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">フィルター設定</h2>

        {/* チケットID */}
        <label className="block mb-2">
          <span className="text-gray-700">Ticket IDs (カンマ区切り)</span>
          <input
            type="text"
            value={ticketIds}
            onChange={(e) => setTicketIds(e.target.value)}
            className="mt-1 p-2 block w-full border rounded"
            placeholder="例: 1001,1002"
          />
        </label>

        {/* Start / End Date */}
        <label className="block mb-2">
          <span className="text-gray-700">Start Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 p-2 block w-full border rounded"
          />
        </label>
        <label className="block mb-2">
          <span className="text-gray-700">End Date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 p-2 block w-full border rounded"
          />
        </label>

        {/* Types / Items */}
        <label className="block mb-2">
          <span className="text-gray-700">Types (カンマ区切り)</span>
          <input
            type="text"
            value={types}
            onChange={(e) => setTypes(e.target.value)}
            className="mt-1 p-2 block w-full border rounded"
            placeholder="例: BUY,SELL"
          />
        </label>
        <label className="block mb-2">
          <span className="text-gray-700">Items (カンマ区切り)</span>
          <input
            type="text"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            className="mt-1 p-2 block w-full border rounded"
            placeholder="例: USD/JPY,EUR/USD"
          />
        </label>

        {/* Size / Profit / Price */}
        <div className="flex space-x-2 mb-2">
          <label className="flex-1">
            <span className="text-gray-700">Size Min</span>
            <input
              type="number"
              step="any"
              value={sizeMin}
              onChange={(e) => setSizeMin(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
          <label className="flex-1">
            <span className="text-gray-700">Size Max</span>
            <input
              type="number"
              step="any"
              value={sizeMax}
              onChange={(e) => setSizeMax(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
        </div>
        <div className="flex space-x-2 mb-2">
          <label className="flex-1">
            <span className="text-gray-700">Profit Min</span>
            <input
              type="number"
              step="any"
              value={profitMin}
              onChange={(e) => setProfitMin(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
          <label className="flex-1">
            <span className="text-gray-700">Profit Max</span>
            <input
              type="number"
              step="any"
              value={profitMax}
              onChange={(e) => setProfitMax(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
        </div>
        <div className="flex space-x-2 mb-2">
          <label className="flex-1">
            <span className="text-gray-700">Open Price Min</span>
            <input
              type="number"
              step="any"
              value={openPriceMin}
              onChange={(e) => setOpenPriceMin(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
          <label className="flex-1">
            <span className="text-gray-700">Open Price Max</span>
            <input
              type="number"
              step="any"
              value={openPriceMax}
              onChange={(e) => setOpenPriceMax(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
        </div>

        {/* Page / PageSize */}
        <div className="flex space-x-2 mb-2">
          <label className="flex-1">
            <span className="text-gray-700">Page</span>
            <input
              type="number"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
          <label className="flex-1">
            <span className="text-gray-700">Page Size</span>
            <input
              type="number"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
            />
          </label>
        </div>

        {/* SortBy / SortOrder */}
        <div className="flex space-x-2 mb-2">
          <label className="flex-1">
            <span className="text-gray-700">Sort By</span>
            <input
              type="text"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 p-2 block w-full border rounded"
              placeholder="例: startDate"
            />
          </label>
          <label className="flex-1">
            <span className="text-gray-700">Sort Order</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc" | "")}
              className="mt-1 p-2 block w-full border rounded"
            >
              <option value="">選択なし</option>
              <option value="asc">asc</option>
              <option value="desc">desc</option>
            </select>
          </label>
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
