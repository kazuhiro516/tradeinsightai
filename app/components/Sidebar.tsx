'use client';

import Link from 'next/link';
import { Home, MessageSquare, Settings, Upload, User, Book, Shield, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { signOut } from '@/app/login/actions'

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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)



  const handleSignOut = async () => {
    try {
      setLoading(true)
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログアウトに失敗しました')
    } finally {
      setLoading(false)
    }
  }

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
        </nav>
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center space-x-3 px-2 w-full p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                aria-label="ユーザーメニュー"
                type="button"
              >
                <User className="w-5 h-5" />
                <span className="text-sm">{userName || 'ユーザー'}</span>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="ml-auto">
                  <circle cx="12" cy="12" r="1.5"/>
                  <circle cx="19" cy="12" r="1.5"/>
                  <circle cx="5" cy="12" r="1.5"/>
                </svg>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-fade-in">
              <ul className="py-2 divide-y divide-gray-200 dark:divide-gray-700">
                <li className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-xl transition flex">
                  <Link
                    href="/settings"
                    className={cn(
                      "flex items-center w-full text-gray-700 dark:text-gray-200 gap-3",
                      pathname === "/settings" && "font-semibold text-primary"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm">設定</span>
                  </Link>
                </li>
                <li className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex">
                  <Link
                    href="/terms"
                    className={cn(
                      "flex items-center w-full text-gray-700 dark:text-gray-200 gap-3",
                      pathname === "/terms" && "font-semibold text-primary"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Book className="w-5 h-5" />
                    <span className="text-sm">利用規約</span>
                  </Link>
                </li>
                <li className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex">
                  <Link
                    href="/privacy"
                    className={cn(
                      "flex items-center w-full text-gray-700 dark:text-gray-200 gap-3",
                      pathname === "/privacy" && "font-semibold text-primary"
                    )}
                    onClick={handleLinkClick}
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-sm">プライバシーポリシー</span>
                  </Link>
                </li>
                <li className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex">
                  {error && <p className="text-red-500 mb-2 text-xs">{error}</p>}
                  <Link
                    href="/login"
                    onClick={handleSignOut}
                    className={cn(
                      "flex items-center w-full text-gray-700 dark:text-gray-200 gap-3 hover:text-red-700 dark:hover:text-red-300",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                    aria-label="ログアウト"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">{loading ? 'ログアウト中...' : 'ログアウト'}</span>
                  </Link>
                </li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
