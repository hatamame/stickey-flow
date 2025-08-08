import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import type { RndResizeCallback, RndDragCallback } from "react-rnd";
import { motion } from "framer-motion";
import {
  X,
  User,
  Tags,
  Lock,
  Unlock,
  MessageSquare,
  ThumbsUp,
  Send,
} from "lucide-react";
import type { StickyNote, Comment } from "../types";
import { colorHexMap } from "./ColorPalette";
import { SupabaseClient } from "@supabase/supabase-js";

interface Props {
  note: StickyNote;
  currentUserId: string;
  supabase: SupabaseClient;
  onDelete: (id: string) => void;
  // ★ 修正点: onUpdateLocalという名前でローカル更新用の関数を受け取る
  onUpdateLocal: (id: string, updates: Partial<StickyNote>) => void;
}

export const StickyNoteItem = ({
  note,
  currentUserId,
  supabase,
  onDelete,
  onUpdateLocal,
}: Props) => {
  const [content, setContent] = useState(note.content || "");
  const [tagsInput, setTagsInput] = useState(note.tags?.join(", ") || "");
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    setContent(note.content || "");
    setTagsInput(note.tags?.join(", ") || "");
  }, [note.content, note.tags]);

  const isOwner = note.author_id === currentUserId;
  const canEdit = !note.is_locked || isOwner;
  const hasVoted = note.voters?.includes(currentUserId);

  // ★ 修正点: DB更新用の汎用関数
  const updateNoteInDb = async (updates: Partial<StickyNote>) => {
    const { error } = await supabase
      .from("sticky_notes")
      .update(updates)
      .eq("id", note.id);
    if (error) {
      console.error("Update failed:", error);
      alert("更新に失敗しました。");
      // エラー時はリアルタイム機能による全データ再取得に任せてUIを修正
    }
  };

  const handleContentBlur = () => {
    if (canEdit && note.content !== content) {
      onUpdateLocal(note.id, { content });
      updateNoteInDb({ content });
    }
  };
  const handleTagsBlur = () => {
    if (!canEdit) return;
    const newTags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (JSON.stringify(note.tags || []) !== JSON.stringify(newTags)) {
      onUpdateLocal(note.id, { tags: newTags });
      updateNoteInDb({ tags: newTags });
    }
  };
  const handleDragStop: RndDragCallback = (_e, d) => {
    if (canEdit) {
      const newPosition = { x: d.x, y: d.y };
      onUpdateLocal(note.id, { position: newPosition });
      updateNoteInDb({ position: newPosition });
    }
  };
  const handleResizeStop: RndResizeCallback = (_e, _dir, ref, _delta, p) => {
    if (canEdit) {
      const newSize = { width: ref.offsetWidth, height: ref.offsetHeight };
      const newPosition = { x: p.x, y: p.y };
      onUpdateLocal(note.id, { size: newSize, position: newPosition });
      updateNoteInDb({ size: newSize, position: newPosition });
    }
  };
  const toggleLock = () => {
    if (isOwner) {
      const newLockState = !note.is_locked;
      onUpdateLocal(note.id, { is_locked: newLockState });
      updateNoteInDb({ is_locked: newLockState });
    }
  };

  const handleVote = async () => {
    if (isVoting) return;
    setIsVoting(true);

    const originalVoters = note.voters || [];
    const newVoters = hasVoted
      ? originalVoters.filter((id) => id !== currentUserId)
      : [...originalVoters, currentUserId];

    // 1. UIを即時更新
    onUpdateLocal(note.id, { voters: newVoters, votes: newVoters.length });

    // 2. DBを更新
    try {
      if (hasVoted) {
        await supabase
          .from("note_votes")
          .delete()
          .match({ note_id: note.id, user_id: currentUserId });
      } else {
        await supabase
          .from("note_votes")
          .insert({ note_id: note.id, user_id: currentUserId });
      }
    } catch (error) {
      console.error("Vote failed, rolling back.", error);
      alert("いいねの更新に失敗しました。");
      // 3. エラー時にUIを元に戻す
      onUpdateLocal(note.id, {
        voters: originalVoters,
        votes: originalVoters.length,
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddComment = async () => {
    if (newComment.trim() === "") return;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        note_id: note.id,
        author_id: currentUserId,
        content: newComment.trim(),
      })
      .select("*, author:profiles(username)")
      .single();

    if (error || !data) {
      console.error("Error adding comment:", error);
      alert("コメントの追加に失敗しました。");
      return;
    }

    const newCommentData = data as Comment;
    const updatedComments = [...(note.comments || []), newCommentData];
    onUpdateLocal(note.id, { comments: updatedComments });
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: string) => {
    const originalComments = note.comments || [];
    const updatedComments = originalComments.filter((c) => c.id !== commentId);

    // 1. UIを即時更新
    onUpdateLocal(note.id, { comments: updatedComments });

    // 2. DBから削除
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Comment delete failed, rolling back.", error);
      alert("コメントの削除に失敗しました。");
      // 3. エラー時にUIを元に戻す
      onUpdateLocal(note.id, { comments: originalComments });
    }
  };

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
        <div className="p-2.5 flex-grow flex flex-col h-full w-full">
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 opacity-80 min-w-0">
              <User size={12} className="flex-shrink-0" />
              <span
                className="truncate"
                title={note.author?.username || "不明"}
              >
                {note.author?.username || "不明"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isOwner && (
                <>
                  <button
                    onClick={toggleLock}
                    className={`p-1 rounded-full transition-colors ${lockButtonClasses}`}
                    title={note.is_locked ? "ロック解除" : "ロック"}
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
              {!isOwner && note.is_locked && (
                <div className="p-1 text-gray-400" title="ロックされています">
                  <Lock size={14} />
                </div>
              )}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleContentBlur}
            className="flex-grow w-full bg-transparent resize-none focus:outline-none text-base cancel-drag"
            placeholder={canEdit ? "アイデアを入力..." : "ロックされています"}
            readOnly={!canEdit}
          />

          <div className="mt-auto pt-2 border-t border-gray-400/20 flex-shrink-0">
            <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
              {note.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-500/20 text-gray-800 text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-grow min-w-0">
                <Tags size={12} className="text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onBlur={handleTagsBlur}
                  className="w-full bg-transparent text-xs focus:outline-none placeholder-gray-400 cancel-drag"
                  placeholder={canEdit ? "タグをカンマ区切りで..." : ""}
                  readOnly={!canEdit}
                />
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleVote}
                  disabled={isVoting}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                    hasVoted
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  } ${isVoting ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <ThumbsUp size={14} /> <span>{note.votes || 0}</span>
                </button>
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-200 hover:bg-gray-300"
                >
                  <MessageSquare size={14} />{" "}
                  <span>{note.comments?.length || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {showComments && (
          <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-b-md p-3 z-20 max-h-60 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {note.comments?.map((comment) => (
                <div key={comment.id} className="text-xs group">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">
                      {comment.author?.username || "不明"}
                    </span>
                    {comment.author_id === currentUserId && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="コメントを削除"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 break-words">{comment.content}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                className="w-full bg-gray-100 rounded-full px-3 py-1 text-xs focus:outline-none"
                placeholder="コメントを追加..."
              />
              <button
                onClick={handleAddComment}
                className="p-2 bg-blue-500 text-white rounded-full"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </Rnd>
  );
};
