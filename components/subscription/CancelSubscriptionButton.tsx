import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CancelSubscriptionButtonProps {
  subscriptionId: string;
}

export function CancelSubscriptionButton({ subscriptionId }: CancelSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm('本当にサブスクリプションをキャンセルしますか？')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // 成功時の処理
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      alert('サブスクリプションのキャンセルに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCancel}
      disabled={loading}
      variant="destructive"
      className="w-full"
    >
      {loading ? '処理中...' : 'サブスクリプションをキャンセルする'}
    </Button>
  );
}
