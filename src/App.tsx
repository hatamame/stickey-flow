import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { AnimatePresence } from "framer-motion";
import type { StickyNote, Profile } from "./types";
import { StickyNoteItem } from "./components/StickyNoteItem";
import { PlusSquare, LogOut, ZoomIn, Move } from "lucide-react";
import { ColorPalette } from "./components/ColorPalette";
import { AccountSetup } from "./components/AccountSetup";

const DEFAULT_NOTE_WIDTH = 200;
const DEFAULT_NOTE_HEIGHT = 200;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2;

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [selectedColor, setSelectedColor] =
    useState<StickyNote["color"]>("yellow");

  // --- Board State ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingProfile(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      getProfile();
    }
  }, [session]);

  const getProfile = async () => {
    if (!session) return;
    try {
      setLoadingProfile(true);
      const { user } = session;
      const { data, error, status } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("id", user.id)
        .single();
      if (error && status !== 406) throw error;
      if (data) setProfile(data);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("sticky_notes")
      .select("*, author:profiles(username)")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching notes:", error);
    } else {
      setNotes(data as any);
    }
  };

  useEffect(() => {
    if (!session?.user || !profile?.username) return;

    fetchNotes();

    const channel = supabase
      .channel("sticky_notes_changes")
      .on<StickyNote>(
        "postgres_changes",
        { event: "*", schema: "public", table: "sticky_notes" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            fetchNotes();
          }
          if (payload.eventType === "UPDATE") {
            setNotes((currentNotes) =>
              currentNotes.map((note) =>
                note.id === payload.new.id
                  ? { ...note, ...payload.new, author: note.author }
                  : note
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
  }, [session, profile]);

  const createNote = async (clientX: number, clientY: number) => {
    if (!session) return;

    const boardX = (clientX - position.x) / scale - DEFAULT_NOTE_WIDTH / 2;
    const boardY = (clientY - position.y) / scale - DEFAULT_NOTE_HEIGHT / 2;

    const { error } = await supabase.from("sticky_notes").insert({
      position: { x: boardX, y: boardY },
      size: { width: DEFAULT_NOTE_WIDTH, height: DEFAULT_NOTE_HEIGHT },
      color: selectedColor,
      content: "",
      author_id: session.user.id,
      tags: [],
    });
    if (error) console.error("Error creating note:", error);
  };

  const updateNote = async (id: string, updates: Partial<StickyNote>) => {
    // --- OPTIMISTIC UPDATE ---
    // First, update the local state for a snappy UI response.
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      )
    );

    // Then, send the update to the database.
    const { error } = await supabase
      .from("sticky_notes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error updating note:", error);
      // On error, you could optionally revert the state by re-fetching
      // fetchNotes();
    }
  };

  const deleteNote = async (id: string) => {
    // Optimistic update for deletion
    setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));

    const { error } = await supabase.from("sticky_notes").delete().eq("id", id);
    if (error) {
      console.error("Error deleting note:", error);
      // fetchNotes(); // Revert on error
    }
  };

  // --- Event Handlers for Pan and Zoom ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(
      Math.max(MIN_SCALE, scale + scaleAmount),
      MAX_SCALE
    );

    const mouseX = e.clientX - position.x;
    const mouseY = e.clientY - position.y;

    const newPositionX = position.x - (mouseX / scale) * (newScale - scale);
    const newPositionY = position.y - (mouseY / scale) * (newScale - scale);

    setScale(newScale);
    setPosition({ x: newPositionX, y: newPositionY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".react-rnd")) return;
    e.preventDefault();
    setIsPanning(true);
    setStartPanPosition({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - startPanPosition.x,
      y: e.clientY - startPanPosition.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
  };

  if (loadingProfile) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-gray-100">
        読み込み中...
      </div>
    );
  }

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

  if (!profile?.username) {
    return <AccountSetup session={session} onProfileUpdated={getProfile} />;
  }

  return (
    <div
      className="w-screen h-screen bg-gray-100 relative overflow-hidden"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onWheel={handleWheel}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest(".react-rnd")) return;
        createNote(e.clientX, e.clientY);
      }}
    >
      <div
        id="board"
        className="absolute top-0 left-0 w-full h-full"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
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
      </div>

      <div className="fixed top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white rounded-full shadow-lg pointer-events-none">
        <Move size={20} className="text-gray-500" />
        <p className="text-sm text-gray-700">ドラッグで移動</p>
        <div className="w-px h-4 bg-gray-300 mx-2"></div>
        <ZoomIn size={20} className="text-gray-500" />
        <p className="text-sm text-gray-700">ホイールでズーム</p>
      </div>

      <div className="fixed bottom-4 right-4 flex items-center gap-4">
        <ColorPalette
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
        />
        <button
          onClick={() => {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            createNote(centerX, centerY);
          }}
          className="p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600"
          title="画面中央に付箋を追加"
        >
          <PlusSquare size={32} />
        </button>
      </div>
    </div>
  );
}

export default App;
