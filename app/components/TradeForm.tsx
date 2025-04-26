'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Label from '@radix-ui/react-label';
import { TradeType, TRADE_TYPE_LABELS } from '@/types/trade';

interface TradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: TradeType;
    amount: number;
    price: number;
    memo: string;
  }) => void;
}

export default function TradeForm({ isOpen, onClose, onSubmit }: TradeFormProps) {
  const [type, setType] = useState<TradeType>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      amount: Number(amount),
      price: Number(price),
      memo
    });
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg w-96">
          <Dialog.Title className="text-xl font-bold mb-4">取引登録</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label.Root htmlFor="type" className="block mb-2">取引タイプ</Label.Root>
              <Select.Root value={type} onValueChange={(value: TradeType) => setType(value)}>
                <Select.Trigger className="w-full border p-2 rounded">
                  <Select.Value>{TRADE_TYPE_LABELS[type]}</Select.Value>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white border rounded shadow-lg">
                    <Select.Viewport>
                      {Object.entries(TRADE_TYPE_LABELS).map(([value, label]) => (
                        <Select.Item
                          key={value}
                          value={value}
                          className="p-2 cursor-pointer hover:bg-gray-100"
                        >
                          <Select.ItemText>{label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div>
              <Label.Root htmlFor="amount" className="block mb-2">数量</Label.Root>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <Label.Root htmlFor="price" className="block mb-2">価格</Label.Root>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div>
              <Label.Root htmlFor="memo" className="block mb-2">メモ</Label.Root>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full border p-2 rounded"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                登録
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
