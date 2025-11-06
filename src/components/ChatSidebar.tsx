import { useState, useEffect } from "react";
import { MessageSquarePlus, Search, Library, Folder, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSessionChange: (sessionId: string | null) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ currentSessionId, onSessionChange, onNewChat }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchChats(searchQuery);
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchQuery, sessions]);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(data || []);
    setFilteredSessions(data || []);
  };

  const searchChats = async (query: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("session_id, content")
      .ilike("content", `%${query}%`);

    if (error) {
      console.error("Error searching chats:", error);
      return;
    }

    const sessionIds = new Set(data?.map(m => m.session_id) || []);
    const filtered = sessions.filter(s => 
      sessionIds.has(s.id) || s.title.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredSessions(filtered);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      return;
    }

    if (currentSessionId === sessionId) {
      onSessionChange(null);
    }

    loadSessions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return "Today";
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else if (diffInHours < 168) {
      return "This Week";
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Navigation */}
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => {
            setShowSearch(!showSearch);
            setShowLibrary(false);
          }}
        >
          <Search className="h-4 w-4" />
          <span>Search Chats</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => {
            setShowLibrary(!showLibrary);
            setShowSearch(false);
          }}
        >
          <Library className="h-4 w-4" />
          <span>Library</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 opacity-50 cursor-not-allowed"
          disabled
        >
          <Folder className="h-4 w-4" />
          <span>Projects</span>
        </Button>
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="px-4 pb-2">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-sidebar-accent"
          />
        </div>
      )}

      {/* Library View */}
      {showLibrary ? (
        <LibraryView />
      ) : (
        <>
          {/* Chat Sessions List */}
          <div className="px-2 pt-2 pb-1">
            <div className="flex items-center gap-2 px-2">
              <MessageSquare className="h-4 w-4 text-sidebar-foreground/60" />
              <span className="text-sm font-medium text-sidebar-foreground/60">Chats</span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 pb-4">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                    "hover:bg-sidebar-accent",
                    currentSessionId === session.id && "bg-sidebar-accent"
                  )}
                  onClick={() => onSessionChange(session.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-sidebar-foreground">
                      {session.title}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">
                      {formatDate(session.updated_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => deleteSession(session.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {filteredSessions.length === 0 && (
                <div className="text-center py-8 text-sidebar-foreground/60 text-sm">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

function LibraryView() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);

  useEffect(() => {
    loadMediaItems();
  }, []);

  const loadMediaItems = async () => {
    const { data, error } = await supabase
      .from("media_library")
      .select("*, chat_sessions(title)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading media:", error);
      return;
    }

    setMediaItems(data || []);
  };

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="space-y-2 pb-4">
        <h3 className="text-sm font-medium text-sidebar-foreground/80 py-2">Media Files</h3>
        {mediaItems.length === 0 ? (
          <div className="text-center py-8 text-sidebar-foreground/60 text-sm">
            No media files yet
          </div>
        ) : (
          mediaItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent cursor-pointer transition-colors"
            >
              <div className="h-10 w-10 rounded bg-sidebar-accent flex items-center justify-center">
                <Library className="h-5 w-5 text-sidebar-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate text-sidebar-foreground">
                  {item.file_name}
                </p>
                <p className="text-xs text-sidebar-foreground/60">
                  {item.chat_sessions?.title || "No chat"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
