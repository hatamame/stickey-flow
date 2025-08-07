// src/types.ts

export interface StickyNote {
  id: string;
  content: string | null;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange' | 'purple';
  position: { x: number; y: number };
  size: { width: number; height: number };
  // authorがオブジェクトの配列になる
  author: { username: string } | null; 
  created_at: string;
  updated_at: string;
  votes: number;
  tags: string[] | null;
  // author_idを追加
  author_id: string | null;
  is_locked: boolean;
}

// プロフィール用の型を追加
export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}