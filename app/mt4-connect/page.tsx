"use client";

import React, { useState, useEffect } from "react";
import { createClient } from '@/utils/supabase/client';

export default function MT4ConnectPage() {
  const [account, setAccount] = useState<any>(null);
  const [broker, setBroker] = useState("");
  const [server, setServer] = useState("");
  const [loginId, setLoginId] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Supabaseのアクセストークン取得
    const fetchToken = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token || null);
    };
    fetchToken();
  }, []);

  useEffect(() => {
    // 連携情報の取得
    const fetchAccount = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/mt4-connect", {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.account) {
          setAccount(data.account);
        }
      } catch (e) {
        console.error('MT4連携情報取得エラー:', e);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAccount();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!broker || !server || !loginId || !investorPassword) {
      setError("全ての項目を入力してください。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/mt4-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ broker, server, loginId, investorPassword }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setSuccess("連携情報を保存しました。同期処理を開始します。");
      setAccount({ broker, server, loginId });
    } catch (e) {
      console.error('MT4連携情報保存エラー:', e);
      setError("連携に失敗しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      // 再同期API呼び出し（仮: /api/mt4-connect/sync）
      const res = await fetch("/api/mt4-connect/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("同期に失敗しました");
      setSuccess("最新のトレード履歴に更新しました。");
    } catch (e) {
      console.error('MT4同期エラー:', e);
      setError("同期に失敗しました。再度お試しください。");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-6">MT4連携</h1>
      {account ? (
        <div className="space-y-4">
          <div>
            <div className="mb-2">現在の連携情報</div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>ブローカー名: {account.broker}</div>
              <div>サーバー名: {account.server}</div>
              <div>ログインID: {account.loginId}</div>
            </div>
          </div>
          <button
            onClick={handleSync}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={syncing}
          >
            {syncing ? "同期中..." : "再同期"}
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">ブローカー名</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={broker}
              onChange={e => setBroker(e.target.value)}
              placeholder="例: XM, TitanFX"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">サーバー名</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={server}
              onChange={e => setServer(e.target.value)}
              placeholder="例: XMTrading-Real 2"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">ログインID</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder="MT4口座番号"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">投資家パスワード</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
              value={investorPassword}
              onChange={e => setInvestorPassword(e.target.value)}
              placeholder="読み取り専用パスワード"
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "同期中..." : "同期"}
          </button>
        </form>
      )}
    </div>
  );
}
