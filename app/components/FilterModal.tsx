// app/(適切なフォルダ)/FilterModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { TradeFilter } from '@/types/trade';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface SavedFilter {
  id: string;
  name: string;
  filter: TradeFilter;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: TradeFilter) => void | Promise<void>;
  type: string;
  currentFilter: TradeFilter;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, type, currentFilter }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<TradeFilter>(currentFilter);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  const [currencyPairs, setCurrencyPairs] = useState<string[]>([]);

  // フィルターの状態を更新
  useEffect(() => {
    setFilter(currentFilter);
  }, [currentFilter]);

  // 通貨ペアと保存済みフィルターの取得
  useEffect(() => {
    const fetchData = async () => {
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

        // 通貨ペアの取得
        const pairsResponse = await fetch(`/api/currency-pairs?userId=${userId}`);
        if (!pairsResponse.ok) {
          throw new Error('通貨ペアの取得に失敗しました');
        }
        const pairs = await pairsResponse.json();
        setCurrencyPairs(pairs);

        // 保存済みフィルターの取得
        const filtersResponse = await fetch(`/api/filters?type=${type}&userId=${userId}`);
        if (!filtersResponse.ok) {
          throw new Error('フィルターの取得に失敗しました');
        }
        const filters = await filtersResponse.json();
        setSavedFilters(filters);
      } catch (error) {
        console.error('データ取得エラー:', error);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, type, router]);

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      alert('フィルター名を入力してください');
      return;
    }

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
          userId,
        }),
      });

      if (!response.ok) throw new Error('フィルターの保存に失敗しました');

      const newFilter = await response.json();
      setSavedFilters([...savedFilters, newFilter]);
      setFilterName('');
      alert('フィルターを保存しました');
    } catch (error) {
      console.error('フィルターの保存エラー:', error);
      alert('フィルターの保存に失敗しました');
    }
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    setFilter(savedFilter.filter);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "startDate" || name === "endDate") {
      // 日付の処理
      setFilter(prev => ({
        ...prev,
        [name]: value ? new Date(value) : undefined
      }));
    } else if (name === "page" || name === "pageSize" ||
               name === "sizeMin" || name === "sizeMax" ||
               name === "profitMin" || name === "profitMax") {
      // 数値の場合は数値に変換
      setFilter(prev => ({
        ...prev,
        [name]: value ? Number(value) : undefined
      }));
    } else {
      // その他の場合はそのまま設定
      setFilter(prev => ({
        ...prev,
        [name]: value || undefined
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

    onApply(cleanedFilter as TradeFilter);
    onClose();
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({
      ...prev,
      startDate: e.target.value ? new Date(e.target.value) : undefined
    }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({
      ...prev,
      endDate: e.target.value ? new Date(e.target.value) : undefined
    }));
  };

  const handleTypeChange = (value: string) => {
    setFilter(prev => ({
      ...prev,
      type: value
    }));
  };

  const handleItemChange = (value: string) => {
    setFilter(prev => ({
      ...prev,
      item: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>フィルター設定</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              開始日
            </Label>
            <Input
              id="startDate"
              type="date"
              value={filter.startDate ? new Date(filter.startDate).toISOString().split('T')[0] : ""}
              onChange={handleStartDateChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              終了日
            </Label>
            <Input
              id="endDate"
              type="date"
              value={filter.endDate ? new Date(filter.endDate).toISOString().split('T')[0] : ""}
              onChange={handleEndDateChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              取引タイプ
            </Label>
            <Select
              value={filter.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="取引タイプを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">買い</SelectItem>
                <SelectItem value="sell">売り</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="item" className="text-right">
              通貨ペア
            </Label>
            <Select
              value={filter.item}
              onValueChange={handleItemChange}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="通貨ペアを選択" />
              </SelectTrigger>
              <SelectContent>
                {currencyPairs.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleApply}>
              適用
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
