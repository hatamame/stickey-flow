// src/types.ts
export interface StickyNote {
    id: string;
    content: string | null;
    color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange' | 'purple';
    position: { x: number; y: number };
    size: { width: number; height: number };
    author: string | null;
    created_at: string;
    updated_at: string;
    votes: number;
    tags: string[] | null;
  }