// src/components/AccountSetup.tsx

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

interface Props {
  session: Session;
  onProfileUpdated: () => void;
}

export const AccountSetup = ({ session, onProfileUpdated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");

  const handleUpdateProfile = async () => {
    if (!username || username.length < 3) {
      alert("ユーザー名は3文字以上で入力してください。");
      return;
    }
    try {
      setLoading(true);
      const { user } = session;
      const updates = {
        id: user.id,
        username,
        updated_at: new Date(),
      };
      const { error } = await supabase.from("profiles").upsert(updates);
      if (error) throw error;
      alert("プロフィールを更新しました！");
      onProfileUpdated(); // 親コンポーネントに更新を通知
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">ようこそ！</h2>
        <p className="text-center text-gray-600 mb-6">
          表示されるユーザー名を設定してください。
        </p>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="text"
              value={session.user.email}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              ユーザー名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <button
              onClick={handleUpdateProfile}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? "保存中..." : "保存して始める"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
