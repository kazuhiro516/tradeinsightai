"use client";
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Calendar } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ja } from "date-fns/locale";

interface AnalysisReportCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: { title: string; startDate: Date | null; endDate: Date | null }) => void | Promise<void>;
  initialTitle?: string;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  loading?: boolean;
}

const AnalysisReportCreateModal: React.FC<AnalysisReportCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = "",
  initialStartDate = null,
  initialEndDate = null,
  loading = false,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, isOpen]);
  useEffect(() => {
    setStartDate(initialStartDate);
  }, [initialStartDate, isOpen]);
  useEffect(() => {
    setEndDate(initialEndDate);
  }, [initialEndDate, isOpen]);

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      setStartDate(startOfDay);
    } else {
      setStartDate(null);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      setEndDate(endOfDay);
    } else {
      setEndDate(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, startDate, endDate });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">AI分析レポート作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
          {/* タイトル入力 */}
          <div>
            <Label htmlFor="reportTitle" className="text-base font-semibold">レポートタイトル</Label>
            <Input
              id="reportTitle"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="レポートのタイトルを入力"
              className="w-full mt-1"
              required
            />
          </div>
          {/* 期間設定 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Label htmlFor="startDate" className="text-sm font-semibold">開始日</Label>
              </div>
              <DatePicker
                selected={startDate ?? undefined}
                onChange={handleStartDateChange}
                selectsStart
                startDate={startDate ?? undefined}
                endDate={endDate ?? undefined}
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
                selected={endDate ?? undefined}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={startDate ?? undefined}
                endDate={endDate ?? undefined}
                minDate={startDate ?? undefined}
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
          {/* 分析実行ボタン */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              キャンセル
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "分析中..." : "分析実行"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisReportCreateModal;
