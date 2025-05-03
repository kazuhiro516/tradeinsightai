// app/(適切なフォルダ)/FilterModal.tsx
"use client";
import React, { useState, useEffect } from "react";
import { checkAuthAndSetSession, getCurrentUserId } from '@/utils/auth';
import { useRouter } from 'next/navigation';
import { TradeFilter, ProfitType, TradeType, TRADE_TYPE_LABELS, PROFIT_TYPE_LABELS } from '@/types/trade';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ja } from 'date-fns/locale';
import { Input } from '../components/ui/input';
import { Trash2 } from "lucide-react";
// @ts-expect-error 型宣言がないためany型でimport
import isEqual from 'lodash/isEqual';

interface SavedFilter {
  id: string;
  name: string;
  filter: TradeFilter;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filter: TradeFilter) => void | Promise<void>;
  currentFilter: TradeFilter;
}

// 定数の定義
const DEFAULT_FILTER: TradeFilter = {
  type: 'all' as TradeType,
  items: [],
};

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, currentFilter }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<TradeFilter>({
    ...DEFAULT_FILTER,
    ...currentFilter,
  });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  const [currencyPairs, setCurrencyPairs] = useState<string[]>([]);
  const [profitType, setProfitType] = useState<ProfitType>('all');
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [originalFilter, setOriginalFilter] = useState<{name: string, filter: TradeFilter} | null>(null);

  // フィルターの状態を更新
  useEffect(() => {
    setFilter(currentFilter);

    // profitTypeを初期値に基づいて適切に設定
    let initialProfitType: ProfitType = 'all';
    if (currentFilter && typeof currentFilter === 'object') {
      if (currentFilter.profitMin !== undefined && currentFilter.profitMin >= 0 && currentFilter.profitMax === undefined) {
        initialProfitType = 'profit';
      } else if (currentFilter.profitMax !== undefined && currentFilter.profitMax <= 0 && currentFilter.profitMin === undefined) {
        initialProfitType = 'loss';
      }
    }
    setProfitType(initialProfitType);
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
        const filtersResponse = await fetch(`/api/filters?userId=${userId}`);
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
  }, [isOpen, router]);

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      alert('フィルター名を入力してください');
      return;
    }

    try {
      const isAuthenticated = await checkAuthAndSetSession();
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      const { userId } = await getCurrentUserId();
      if (!userId) {
        router.push('/login');
        return;
      }
      // 新規保存 or 編集
      if (editingFilterId) {
        // 編集
        const response = await fetch(`/api/filters/${editingFilterId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: filterName,
            filter,
            userId,
          }),
        });
        if (!response.ok) throw new Error('フィルターの更新に失敗しました');
        // フロント側リストも更新
        setSavedFilters(savedFilters.map(f => f.id === editingFilterId ? { ...f, name: filterName, filter } : f));
        setEditingFilterId(null);
        setFilterName('');
        alert('フィルターを更新しました');
      } else {
        // 新規保存
        const response = await fetch('/api/filters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: filterName,
            filter,
            userId,
          }),
        });
        if (!response.ok) throw new Error('フィルターの保存に失敗しました');
        const newFilter = await response.json();
        setSavedFilters([...savedFilters, newFilter]);
        setFilterName('');
        alert('フィルターを保存しました');
      }
    } catch (error) {
      console.error('フィルターの保存/更新エラー:', error);
      alert(editingFilterId ? 'フィルターの更新に失敗しました' : 'フィルターの保存に失敗しました');
    }
  };

  const handleCancelEdit = () => {
    if (originalFilter) {
      setFilter(originalFilter.filter);
      setFilterName(originalFilter.name);
    }
    setEditingFilterId(null);
    setOriginalFilter(null);
  };

  const handleLoadFilter = (savedFilter: SavedFilter) => {
    const filterWithItems = {
      ...savedFilter.filter,
      items: savedFilter.filter.items ?? []
    };
    setFilter(filterWithItems);
    setFilterName(savedFilter.name);
    setEditingFilterId(savedFilter.id);
    setOriginalFilter({
      name: savedFilter.name,
      filter: filterWithItems
    });
  };

  const handleTypeChange = (value: TradeType) => {
    setFilter(prev => ({
      ...prev,
      type: value
    }));
  };

  const handleItemChange = (selectedItems: string[]) => {
    setFilter(prev => ({
      ...prev,
      items: selectedItems
    }));
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      // 日本時間の0時0分0秒に設定
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      setFilter(prev => ({
        ...prev,
        startDate: startOfDay
      }));
    } else {
      setFilter(prev => ({
        ...prev,
        startDate: undefined
      }));
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      // 日本時間の23時59分59秒に設定
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      setFilter(prev => ({
        ...prev,
        endDate: endOfDay
      }));
    } else {
      setFilter(prev => ({
        ...prev,
        endDate: undefined
      }));
    }
  };

  const handleApply = () => {
    // 空の値を削除
    const merged = { ...filter };
    // typeがundefinedなら"all"をセット
    if (!merged.type) {
      merged.type = 'all';
    }
    // itemsが空配列なら削除
    if (Array.isArray(merged.items) && merged.items.length === 0) {
      delete merged.items;
    }

    // profitTypeに基づいてprofitMinとprofitMaxを設定
    if (profitType === 'profit') {
      merged.profitMin = 0; // 利益がプラス（0以上）
      delete merged.profitMax;
    } else if (profitType === 'loss') {
      merged.profitMax = 0; // 利益がマイナス（0以下）
      delete merged.profitMin;
    } else {
      // 'all'の場合は損益フィルターを適用しない
      delete merged.profitMin;
      delete merged.profitMax;
    }

    const cleanedFilter = Object.fromEntries(
      Object.entries(merged).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== "" && value !== null && value !== undefined;
      })
    );
    onApply(cleanedFilter as TradeFilter);
    onClose();
  };

  const handleDeleteFilter = async (filterId: string) => {
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

      const response = await fetch(`/api/filters/${filterId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('フィルターの削除に失敗しました');

      // 削除成功後、保存済みフィルターリストを更新
      setSavedFilters(savedFilters.filter(f => f.id !== filterId));
      alert('フィルターを削除しました');
    } catch (error) {
      console.error('フィルターの削除エラー:', error);
      alert('フィルターの削除に失敗しました');
    }
  };

  const isFilterChanged = editingFilterId && originalFilter && (
    filterName !== originalFilter.name || !isEqual(filter, originalFilter.filter)
  );

  // 通貨ペア選択のレンダリング
  const renderCurrencyPairSelector = () => {

    return (
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="item" className="text-right">
          通貨ペア
        </Label>
        <Select
          value={filter.items && filter.items.length > 0 ? filter.items[0] : "__ALL__"}
          onValueChange={(value) => {
            if (value === "__ALL__") {
              handleItemChange([]);
            } else {
              handleItemChange([value]);
            }
          }}
        >
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="通貨ペアを選択" />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" align="start" className="max-h-[200px] overflow-y-auto">
            <SelectItem value="__ALL__">すべて</SelectItem>
            {currencyPairs.map((pair) => (
              <SelectItem key={pair} value={pair}>
                {pair}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>フィルター設定</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="savedFilter" className="text-right">
              保存済み
            </Label>
            <div className="col-span-3 flex gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  const savedFilter = savedFilters.find(f => f.id === value);
                  if (savedFilter) {
                    handleLoadFilter(savedFilter);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="保存済みフィルターを選択" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start">
                  {savedFilters.map((filter) => (
                    <div key={filter.id} className="flex items-center justify-between pr-2">
                      <SelectItem value={filter.id}>
                        {filter.name}
                      </SelectItem>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('このフィルターを削除してもよろしいですか？')) {
                            handleDeleteFilter(filter.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filterName" className="text-right">
              フィルター名
            </Label>
            <div className="col-span-3">
              <Input
                id="filterName"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="フィルター名を入力"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              開始日
            </Label>
            <div className="col-span-3">
              <DatePicker
                selected={filter.startDate}
                onChange={handleStartDateChange}
                selectsStart
                startDate={filter.startDate}
                endDate={filter.endDate}
                dateFormat="yyyy/MM/dd"
                isClearable
                placeholderText="開始日を選択"
                locale={ja}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                shouldCloseOnSelect={true}
                popperPlacement="bottom-start"
                onFocus={e => e.target.blur()}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              終了日
            </Label>
            <div className="col-span-3">
              <DatePicker
                selected={filter.endDate}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={filter.startDate}
                endDate={filter.endDate}
                minDate={filter.startDate}
                dateFormat="yyyy/MM/dd"
                isClearable
                placeholderText="終了日を選択"
                locale={ja}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                shouldCloseOnSelect={true}
                popperPlacement="bottom-start"
                onFocus={e => e.target.blur()}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              取引タイプ
            </Label>
            <Select
              value={(filter.type ?? 'all') as TradeType}
              onValueChange={handleTypeChange as (value: string) => void}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="取引タイプを選択" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start">
                {Object.entries(TRADE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderCurrencyPairSelector()}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="profitType" className="text-right">
              損益
            </Label>
            <Select
              value={profitType}
              onValueChange={(value) => setProfitType(value as ProfitType)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="損益を選択" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start">
                {Object.entries(PROFIT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            {editingFilterId && isFilterChanged ? (
              <>
                <Button variant="outline" onClick={handleSaveFilter} disabled={!filterName.trim()}>
                  更新
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  編集キャンセル
                </Button>
              </>
            ) : (
              !editingFilterId && (
                <Button variant="outline" onClick={handleSaveFilter} disabled={!filterName.trim()}>
                  保存
                </Button>
              )
            )}
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
