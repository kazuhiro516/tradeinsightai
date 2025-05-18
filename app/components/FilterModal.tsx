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
import { Trash2, Filter, Calendar, Save, Edit2 } from "lucide-react";
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

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, currentFilter }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<TradeFilter>({
    ...currentFilter,
  });
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [originalFilter, setOriginalFilter] = useState<{name: string, filter: TradeFilter} | null>(null);

  // フィルターの状態を更新
  useEffect(() => {
    setFilter(currentFilter);
  }, [currentFilter]);

  // 保存済みフィルターの取得
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
    setFilter(savedFilter.filter);
    setFilterName(savedFilter.name);
    setEditingFilterId(savedFilter.id);
    setOriginalFilter({
      name: savedFilter.name,
      filter: savedFilter.filter
    });
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
    const cleanedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Filter className="w-5 h-5 text-blue-500" /> 期間設定
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-2">
          {/* 保存済みフィルター */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Save className="w-4 h-4 text-gray-500" />
              <Label htmlFor="savedFilter" className="text-base font-semibold">保存済み</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  const savedFilter = savedFilters.find(f => f.id === value);
                  if (savedFilter) handleLoadFilter(savedFilter);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="保存済みフィルターを選択" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start">
                  {savedFilters.length === 0 ? (
                    <div className="text-xs text-gray-400 px-2 py-1">保存済みフィルターはありません</div>
                  ) : savedFilters.map((filter) => (
                    <div key={filter.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-accent transition group">
                      <SelectItem value={filter.id} className="flex-1 truncate">
                        <span className="truncate">{filter.name}</span>
                      </SelectItem>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 ml-1 opacity-70 group-hover:opacity-100"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('このフィルターを削除してもよろしいですか？')) handleDeleteFilter(filter.id);
                        }}
                        tabIndex={-1}
                        aria-label="フィルター削除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* フィルター名 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Edit2 className="w-4 h-4 text-gray-500" />
              <Label htmlFor="filterName" className="text-base font-semibold">フィルター名</Label>
            </div>
            <Input
              id="filterName"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="フィルター名を入力"
              className="w-full"
            />
          </div>

          {/* 日付範囲 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Label htmlFor="startDate" className="text-sm font-semibold">開始日</Label>
              </div>
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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Label htmlFor="endDate" className="text-sm font-semibold">終了日</Label>
              </div>
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

          {/* アクションボタン */}
          <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-border mt-2">
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
