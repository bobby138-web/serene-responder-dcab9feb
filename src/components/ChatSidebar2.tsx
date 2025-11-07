import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Image, BarChart, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MoodTrends } from "@/components/MoodTrends";

type View = "chats" | "library" | "analytics" | "mood";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebar2Props {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string | null) => void;
  onNewChat: () => void;
}

export const ChatSidebar2 = ({ currentSessionId, onSessionChange, onNewChat }: ChatSidebar2Props) => {
  const [currentView, setCurrentView] = useState<View>("chats");
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (currentView === "chats") {
      loadSessions();
    }
  }, [currentView]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(data || []);
  };

  const ChatsList = () => (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-2">
        {sessions.map((session) => (
          <Button
            key={session.id}
            variant={currentSessionId === session.id ? "secondary" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => onSessionChange(session.id)}
          >
            <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">{session.title}</span>
          </Button>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No chats yet
          </div>
        )}
      </div>
    </ScrollArea>
  );

  const LibraryView = () => (
    <div className="p-4 text-center text-muted-foreground">
      Media library coming soon...
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-4 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1 p-2 mb-4">
        <Button
          variant={currentView === "chats" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentView("chats")}
          className="flex-1"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Chats
        </Button>
        <Button
          variant={currentView === "library" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentView("library")}
          className="flex-1"
        >
          <Image className="h-4 w-4 mr-2" />
          Library
        </Button>
        <Button
          variant={currentView === "analytics" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentView("analytics")}
          className="flex-1"
        >
          <BarChart className="h-4 w-4 mr-2" />
          Analytics
        </Button>
        <Button
          variant={currentView === "mood" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCurrentView("mood")}
          className="flex-1"
        >
          <Smile className="h-4 w-4 mr-2" />
          Mood
        </Button>
      </div>

      {currentView === "chats" && <ChatsList />}
      {currentView === "library" && <LibraryView />}
      {currentView === "analytics" && (
        <div className="p-4 text-center text-muted-foreground">
          Analytics coming soon...
        </div>
      )}
      {currentView === "mood" && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <MoodTrends />
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
