'use client';

import Link from 'next/link';
import { Home, MessageSquare, Settings, Upload, User } from 'lucide-react';
import { useEffect, useState } from 'react';

const Sidebar = () => {
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const userData = await response.json();
          setUserName(userData.name || '');
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    };

    fetchUserName();
  }, []);

  return (
    <div className="w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex flex-col p-4">
        <div className="text-xl font-bold mb-8 dark:text-white">TradeInsightAI</div>
        <nav className="space-y-2">
          <Link href="/" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Home className="w-5 h-5 mr-3" />
            ホーム
          </Link>
          <Link href="/chat" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <MessageSquare className="w-5 h-5 mr-3" />
            チャット
          </Link>
          <Link href="/upload" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Upload className="w-5 h-5 mr-3" />
            アップロード
          </Link>
          <Link href="/settings" className="flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Settings className="w-5 h-5 mr-3" />
            設定
          </Link>
        </nav>
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 px-2">
            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{userName || 'ユーザー'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
