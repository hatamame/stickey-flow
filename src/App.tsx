// src/App.tsx
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type { StickyNote } from "./types";
import { StickyNoteItem } from "./components/StickyNoteItem";
import { PlusSquare } from "lucide-react";
import { ColorPalette } from "./components/ColorPalette";

function App() {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedColor, setSelectedColor] =
    useState<StickyNote["color"]>("yellow");

  // 1. データの初期取得
  useEffect(() => {
    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from("sticky_notes")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching notes:", error);
      else setNotes(data as StickyNote[]);
    };
    fetchNotes();

    // 2. リアルタイム更新の購読
    const channel = supabase
      .channel("sticky_notes_changes")
      .on<StickyNote>(
        "postgres_changes",
        { event: "*", schema: "public", table: "sticky_notes" },
        (payload) => {
          console.log("Change received!", payload);
          // ここでリアルタイムの変更を state に反映するロジックを実装
          // 例: 新規作成、更新、削除に合わせて setNotes を更新
          if (payload.eventType === "INSERT") {
            setNotes((currentNotes) => [
              ...currentNotes,
              payload.new as StickyNote,
            ]);
          }
          if (payload.eventType === "UPDATE") {
            setNotes((currentNotes) =>
              currentNotes.map((note) =>
                note.id === payload.new.id ? (payload.new as StickyNote) : note
              )
            );
          }
          if (payload.eventType === "DELETE") {
            setNotes((currentNotes) =>
              currentNotes.filter((note) => note.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. 付箋の作成
  const createNote = async (x: number, y: number) => {
    const { data, error } = await supabase
      .from("sticky_notes")
      .insert({
        position: { x, y },
        size: { width: 200, height: 150 },
        color: selectedColor, // 👈 stateから選択された色を指定
        content: "",
      })
      .select();

    if (error) {
      console.error("Error creating note:", error);
    }
  };

  // 4. 付箋の更新
  const updateNote = async (id: string, updates: Partial<StickyNote>) => {
    const { error } = await supabase
      .from("sticky_notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) console.error("Error updating note:", error);
  };

  // 5. 付箋の削除
  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("sticky_notes").delete().eq("id", id);

    if (error) console.error("Error deleting note:", error);
  };

  return (
    <div
      className="w-screen h-screen bg-gray-100 relative overflow-hidden"
      // 👇 ダブルクリックでも選択された色で作成されるように
      onDoubleClick={(e) => createNote(e.clientX, e.clientY)}
    >
      {notes.map((note) => (
        <StickyNoteItem
          key={note.id}
          note={note}
          onDelete={deleteNote}
          onUpdate={updateNote}
        />
      ))}

      {/* 👇 右下のUIをグループ化 */}
      <div className="fixed bottom-10 right-10 flex items-center gap-4">
        <ColorPalette
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
        <button
          onClick={() => createNote(100, 100)}
          className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600"
        >
          <PlusSquare size={32} />
        </button>
      </div>

      <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg shadow-md text-sm text-gray-600">
        ボードをダブルクリック or 右下の「+」ボタンで付箋を追加
      </div>
    </div>
  );
}

export default App;
