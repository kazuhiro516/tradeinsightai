import Link from 'next/link';
import { Home, MessageSquare, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-white border-r">
      <div className="flex flex-col p-4">
        <div className="text-xl font-bold mb-8">TradeInsightAI</div>
        <nav className="space-y-2">
          <Link href="/" className="flex items-center p-2 hover:bg-gray-100 rounded-lg">
            <Home className="w-5 h-5 mr-3" />
            ホーム
          </Link>
          <Link href="/chat" className="flex items-center p-2 hover:bg-gray-100 rounded-lg">
            <MessageSquare className="w-5 h-5 mr-3" />
            チャット
          </Link>
          <Link href="/settings" className="flex items-center p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 mr-3" />
            設定
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
