import { useState } from "react";
import { Rnd } from "react-rnd";
import type { RndResizeCallback, RndDragCallback } from "react-rnd";
import { motion } from "framer-motion";
import { X, User, Tags, Lock, Unlock } from "lucide-react";
import type { StickyNote } from "../types";
import { colorHexMap } from "./ColorPalette";

interface Props {
  note: StickyNote;
  currentUserId: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
}

export const StickyNoteItem = ({
  note,
  currentUserId,
  onDelete,
  onUpdate,
}: Props) => {
  const [content, setContent] = useState(note.content || "");
  const [tagsInput, setTagsInput] = useState(note.tags?.join(", ") || "");

  const isOwner = note.author_id === currentUserId;
  // Determine if the note can be edited by the current user
  const canEdit = !note.is_locked || isOwner;

  const handleContentBlur = () => {
    if (canEdit && note.content !== content) {
      onUpdate(note.id, { content });
    }
  };

  const handleTagsBlur = () => {
    if (!canEdit) return;
    const newTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (JSON.stringify(note.tags || []) !== JSON.stringify(newTags)) {
      onUpdate(note.id, { tags: newTags });
    }
  };

  const handleDragStop: RndDragCallback = (_e, d) => {
    if (!canEdit) return;
    onUpdate(note.id, { position: { x: d.x, y: d.y } });
  };

  const handleResizeStop: RndResizeCallback = (
    _e,
    _dir,
    ref,
    _delta,
    position
  ) => {
    if (!canEdit) return;
    onUpdate(note.id, {
      size: {
        width: ref.offsetWidth,
        height: ref.offsetHeight,
      },
      position,
    });
  };

  const toggleLock = () => {
    if (isOwner) {
      onUpdate(note.id, { is_locked: !note.is_locked });
    }
  };

  // Conditional classes for the lock button
  const lockButtonClasses = note.is_locked
    ? "bg-red-100 text-red-700 hover:bg-red-200"
    : "bg-green-100 text-green-700 hover:bg-green-200";

  return (
    <Rnd
      position={{ x: note.position.x, y: note.position.y }}
      size={{ width: note.size.width, height: note.size.height }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      minWidth={200}
      minHeight={160}
      className="z-10 react-rnd"
      cancel=".cancel-drag"
      disableDragging={!canEdit}
      enableResizing={{
        top: canEdit,
        right: canEdit,
        bottom: canEdit,
        left: canEdit,
        topRight: canEdit,
        bottomRight: canEdit,
        bottomLeft: canEdit,
        topLeft: canEdit,
      }}
    >
      <motion.div
        className="shadow-lg rounded-md flex flex-col w-full h-full"
        style={{
          backgroundColor: colorHexMap[note.color] || "#E5E7EB",
          cursor: canEdit ? "move" : "default",
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="p-3 flex-grow flex flex-col h-full w-full">
          {/* --- Header Icons --- */}
          <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
            {isOwner && (
              <>
                <button
                  onClick={toggleLock}
                  className={`p-1 rounded-full transition-colors ${lockButtonClasses}`}
                  title={
                    note.is_locked
                      ? "クリックして編集を許可"
                      : "クリックして編集をロック"
                  }
                >
                  {note.is_locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button
                  onClick={() => onDelete(note.id)}
                  className="p-1 text-gray-500 hover:bg-gray-200 rounded-full"
                  title="削除"
                >
                  <X size={16} />
                </button>
              </>
            )}
            {/* For non-owners, show a simple lock icon if the note is locked */}
            {!isOwner && note.is_locked && (
              <div className="p-1 text-gray-400" title="ロックされています">
                <Lock size={14} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1 opacity-80 pt-6">
            <User size={12} />
            <span>{note.author?.username || "不明"}</span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleContentBlur}
            className="flex-grow w-full bg-transparent resize-none focus:outline-none text-base cancel-drag"
            placeholder={canEdit ? "アイデアを入力..." : "ロックされています"}
            readOnly={!canEdit}
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
                className="w-full bg-transparent text-sm focus:outline-none placeholder-gray-400 cancel-drag"
                placeholder={canEdit ? "タグをカンマ区切りで..." : ""}
                readOnly={!canEdit}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </Rnd>
  );
};
