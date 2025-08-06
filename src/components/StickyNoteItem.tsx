// src/components/StickyNoteItem.tsx

import { Rnd } from "react-rnd";
import type { StickyNote } from "../types";
import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  note: StickyNote;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
}

// ★ 色のHEXコードを直接マッピングするオブジェクトに変更
const colorHexMap = {
  yellow: "#fffba6",
  blue: "#a6d9ff",
  green: "#ccffb3",
  pink: "#ffc2e2",
  orange: "#ffd5a6",
  purple: "#d5b4ff",
};

export const StickyNoteItem = ({ note, onDelete, onUpdate }: Props) => {
  const [content, setContent] = useState(note.content || "");

  const handleContentBlur = () => {
    onUpdate(note.id, { content });
  };

  return (
    <Rnd
      size={{ width: note.size.width, height: note.size.height }}
      position={{ x: note.position.x, y: note.position.y }}
      onDragStop={(e, d) => {
        onUpdate(note.id, { position: { x: d.x, y: d.y } });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate(note.id, {
          size: {
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          },
          position,
        });
      }}
      // ★ classNameから背景色クラスを削除
      className="shadow-lg rounded-md p-2 flex flex-col"
      minWidth={150}
      minHeight={100}
      // ★ styleプロパティで背景色を直接指定！
      style={{
        backgroundColor: colorHexMap[note.color] || "#E5E7EB", // デフォルトはグレー
      }}
    >
      <button
        onClick={() => onDelete(note.id)}
        className="absolute top-1 right-1 text-gray-500 hover:text-black"
      >
        <X size={16} />
      </button>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleContentBlur}
        className="flex-grow w-full h-full bg-transparent resize-none focus:outline-none mt-4"
        placeholder="アイデアを入力..."
      />
    </Rnd>
  );
};
