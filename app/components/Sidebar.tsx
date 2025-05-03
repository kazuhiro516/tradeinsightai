'use client';

import Link from 'next/link';
import { Home, MessageSquare, Settings, Upload, User, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const [userName, setUserName] = useState<string>('');
  const pathname = usePathname();

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

  // リンククリック時の処理
  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out",
      "lg:relative lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex flex-col p-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-xl font-bold dark:text-white">TradeInsightAI</div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-2">
          <Link
            href="/"
            className={cn(
              "flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
              pathname === "/" && "bg-gray-100 dark:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <Home className="w-5 h-5 mr-3" />
            ホーム
          </Link>
          <Link
            href="/chat"
            className={cn(
              "flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
              pathname === "/chat" && "bg-gray-100 dark:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            チャット
          </Link>
          <Link
            href="/upload"
            className={cn(
              "flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
              pathname === "/upload" && "bg-gray-100 dark:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <Upload className="w-5 h-5 mr-3" />
            アップロード
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
              pathname === "/settings" && "bg-gray-100 dark:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <Settings className="w-5 h-5 mr-3" />
            設定
          </Link>
          <Link
            href="/mt4-connect"
            className={cn(
              "flex items-center p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
              pathname === "/mt4-connect" && "bg-gray-100 dark:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <Key className="w-5 h-5 mr-3" />
            MT4連携
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
