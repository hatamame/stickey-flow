import { useState } from "react";
import { Rnd } from "react-rnd";
import type { ResizableDelta, DraggableData } from "react-rnd";
import { motion } from "framer-motion";
import { X, User, Tags } from "lucide-react";
import type { StickyNote } from "../types";
import { colorHexMap } from "./ColorPalette";

interface Props {
  note: StickyNote;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
}

export const StickyNoteItem = ({ note, onDelete, onUpdate }: Props) => {
  const [content, setContent] = useState(note.content || "");
  const [tagsInput, setTagsInput] = useState(note.tags?.join(", ") || "");

  const handleContentBlur = () => {
    if (note.content !== content) {
      onUpdate(note.id, { content });
    }
  };

  const handleTagsBlur = () => {
    const newTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    // 配列を比較するためにJSON文字列化する
    if (JSON.stringify(note.tags || []) !== JSON.stringify(newTags)) {
      onUpdate(note.id, { tags: newTags });
    }
  };

  const handleDragStop = (_e: any, d: DraggableData) => {
    onUpdate(note.id, { position: { x: d.x, y: d.y } });
  };

  const handleResizeStop = (
    _e: any,
    _dir: any,
    ref: HTMLElement,
    _delta: ResizableDelta,
    position: { x: number; y: number }
  ) => {
    onUpdate(note.id, {
      size: {
        width: parseInt(ref.style.width),
        height: parseInt(ref.style.height),
      },
      position,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "absolute",
        x: note.position.x,
        y: note.position.y,
        zIndex: 10,
      }}
      drag
      dragMomentum={false}
      onDragEnd={(_e, info) => {
        onUpdate(note.id, {
          position: {
            x: note.position.x + info.offset.x,
            y: note.position.y + info.offset.y,
          },
        });
      }}
    >
      <Rnd
        size={{ width: note.size.width, height: note.size.height }}
        onResizeStop={handleResizeStop}
        className="shadow-lg rounded-md flex flex-col"
        minWidth={200}
        minHeight={150}
        style={{
          backgroundColor: colorHexMap[note.color] || "#E5E7EB",
          position: "static", // Rndのpositionはmotion.divが管理
        }}
        disableDragging // ドラッグはmotion.divに任せる
      >
        <div className="p-3 flex-grow flex flex-col h-full">
          <button
            onClick={() => onDelete(note.id)}
            className="absolute top-2 right-2 text-gray-500 hover:text-black z-10"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1 opacity-80">
            <User size={12} />
            <span>{note.author?.split("@")[0]}</span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleContentBlur}
            className="flex-grow w-full bg-transparent resize-none focus:outline-none text-base"
            placeholder="アイデアを入力..."
          />
          <div className="mt-auto pt-1 border-t border-gray-400/30">
            <div className="flex flex-wrap gap-1 my-1 min-h-[1rem]">
              {note.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-500/20 text-gray-800 text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Tags size={12} className="text-gray-500" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={handleTagsBlur}
                className="w-full bg-transparent text-sm focus:outline-none placeholder-gray-400"
                placeholder="タグをカンマ区切りで..."
              />
            </div>
          </div>
        </div>
      </Rnd>
    </motion.div>
  );
};
