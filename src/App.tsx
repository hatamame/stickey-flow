import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { AnimatePresence } from "framer-motion";
import type { StickyNote } from "./types";
import { StickyNoteItem } from "./components/StickyNoteItem";
import { PlusSquare, LogOut } from "lucide-react";
import { ColorPalette } from "./components/ColorPalette";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedColor, setSelectedColor] =
    useState<StickyNote["color"]>("yellow");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // ログインしていない場合はノートを取得しない
    if (!session) return;

    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from("sticky_notes")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching notes:", error);
      else setNotes(data as StickyNote[]);
    };
    fetchNotes();

    const channel = supabase
      .channel("sticky_notes_changes")
      .on<StickyNote>(
        "postgres_changes",
        { event: "*", schema: "public", table: "sticky_notes" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotes((currentNotes) => [
              ...currentNotes.filter((n) => !n.id.startsWith("temp-")),
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
  }, [session]);

  const createNote = async (x: number, y: number) => {
    if (!session) return;

    const tempId = `temp-${Date.now()}`;
    const newNotePartial: StickyNote = {
      id: tempId,
      position: { x, y },
      size: { width: 200, height: 150 },
      color: selectedColor,
      content: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      votes: 0,
      author: session.user.email || "Unknown",
      tags: [],
    };

    setNotes((currentNotes) => [...currentNotes, newNotePartial]);

    const { error } = await supabase.from("sticky_notes").insert({
      position: { x, y },
      size: { width: 200, height: 150 },
      color: selectedColor,
      content: "",
      author: session.user.email,
      tags: [],
    });

    if (error) {
      console.error("Error creating note:", error);
      setNotes((currentNotes) =>
        currentNotes.filter((note) => note.id !== tempId)
      );
    }
  };

  const updateNote = async (id: string, updates: Partial<StickyNote>) => {
    if (id.startsWith("temp-")) return;

    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      )
    );

    const { error } = await supabase
      .from("sticky_notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error updating note:", error);
    }
  };

  const deleteNote = async (id: string) => {
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));

    if (id.startsWith("temp-")) return;

    const { error } = await supabase.from("sticky_notes").delete().eq("id", id);

    if (error) console.error("Error deleting note:", error);
  };

  if (!session) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">StickyFlow</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={["google", "github"]}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen bg-gray-100 relative overflow-hidden"
      onDoubleClick={(e) => createNote(e.clientX, e.clientY)}
    >
      <AnimatePresence>
        {notes.map((note) => (
          <StickyNoteItem
            key={note.id}
            note={note}
            onDelete={deleteNote}
            onUpdate={updateNote}
          />
        ))}
      </AnimatePresence>

      <button
        onClick={() => supabase.auth.signOut()}
        className="fixed top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors"
      >
        <LogOut size={18} />
        ログアウト
      </button>

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
