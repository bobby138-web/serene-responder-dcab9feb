import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Image, BarChart, Smile, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MoodTrends } from "@/components/MoodTrends";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const { toast } = useToast();

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

  const handleDeleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Chat deleted",
      description: "Your chat has been removed",
    });

    if (currentSessionId === sessionId) {
      onSessionChange(null);
    }

    loadSessions();
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const handleDeleteAllSessions = async () => {
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete chats",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "All chats deleted",
      description: "Your chat history has been cleared",
    });

    onSessionChange(null);
    loadSessions();
    setDeleteAllDialogOpen(false);
  };

  const ChatsList = () => (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-2">
        {sessions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteAllDialogOpen(true)}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 mb-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Chats
          </Button>
        )}
        {sessions.map((session) => (
          <div key={session.id} className="flex gap-1 group">
            <Button
              variant={currentSessionId === session.id ? "secondary" : "ghost"}
              className="flex-1 justify-start text-left"
              onClick={() => onSessionChange(session.id)}
            >
              <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{session.title}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setSessionToDelete(session.id);
                setDeleteDialogOpen(true);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your conversations and messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllSessions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
