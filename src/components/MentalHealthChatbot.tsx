import { useState, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatSidebar } from "./ChatSidebar";
import { ChatSidebar2 } from "./ChatSidebar2";
import { MoodInput } from "./MoodInput";
import { Card } from "@/components/ui/card";
import { Heart, TrendingUp, Menu, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface MoodEntry {
  mood: string;
  intensity: number;
  note?: string;
  context?: string;
}

export const MentalHealthChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [moodCount, setMoodCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMoodInput, setShowMoodInput] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [mediaRefresh, setMediaRefresh] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadMoodCount();
    initializeSession();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const initializeSession = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "New Chat", user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to initialize chat",
        variant: "destructive",
      });
      return;
    }

    setCurrentSessionId(data.id);

    // Add welcome message
    const welcomeMessage = {
      session_id: data.id,
      role: "assistant",
      content: "Hello! I'm your mental health companion 💙\n\nI'm here to:\n• Listen and support you\n• Help you track and reflect on your moods\n• Provide personalized insights from your journal\n• Offer wellness tips and exercises\n\nYou can talk to me naturally - just share how you're feeling or what's on your mind. How are you doing today?",
    };

    await supabase.from("chat_messages").insert(welcomeMessage);
  };

  const loadMessages = async (sessionId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(
      data.map((msg) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === "user",
        timestamp: new Date(msg.created_at),
      }))
    );
  };

  const handleNewChat = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "New Chat", user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
      return;
    }

    setCurrentSessionId(data.id);
    setSidebarOpen(false);

    // Add welcome message
    const welcomeMessage = {
      session_id: data.id,
      role: "assistant",
      content: "Hello! I'm your mental health companion 💙\n\nI'm here to:\n• Listen and support you\n• Help you track and reflect on your moods\n• Provide personalized insights from your journal\n• Offer wellness tips and exercises\n\nYou can talk to me naturally - just share how you're feeling or what's on your mind. How are you doing today?",
    };

    await supabase.from("chat_messages").insert(welcomeMessage);
  };

  const handleSessionChange = (sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
  };

  const updateSessionTitle = async (sessionId: string, firstUserMessage: string) => {
    const title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? "..." : "");
    await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
  };

  const loadMoodCount = async () => {
    const { count } = await supabase
      .from('mood_entries')
      .select('*', { count: 'exact', head: true });
    setMoodCount(count || 0);
  };

  const saveMoodEntry = async (entry: MoodEntry) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('mood_entries')
        .insert([{ ...entry, user_id: user.id }]);
      
      if (error) throw error;
      await loadMoodCount();
    } catch (error) {
      console.error('Error saving mood entry:', error);
    }
  };

  const getMoodInsights = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return "You haven't logged any moods yet. Start sharing how you're feeling, and I'll provide personalized insights over time!";
      }

      const moodCounts: Record<string, number> = {};
      data.forEach((entry: any) => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      });

      const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
      const recentMoods = data.slice(0, 7).map((e: any) => e.mood);
      
      return `Based on your ${data.length} mood entries:\n\n• Your most common mood: ${mostCommon[0]} (${mostCommon[1]} times)\n• Recent pattern: ${recentMoods.join(' → ')}\n• You've been tracking for ${Math.ceil(data.length / 7)} weeks\n\nKeep journaling to see deeper insights!`;
    } catch (error) {
      console.error('Error getting insights:', error);
      return "I couldn't analyze your mood history right now.";
    }
  };

  const streamChatResponse = async (
    userMessage: string, 
    conversationHistory: Message[],
    onDelta: (deltaText: string) => void,
    onDone: () => void
  ) => {
    try {
      if (userMessage.toLowerCase().includes('insight') || 
          userMessage.toLowerCase().includes('pattern') || 
          userMessage.toLowerCase().includes('trend')) {
        const insights = await getMoodInsights();
        onDelta(insights);
        onDone();
        return insights;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userMessage,
          conversationHistory: conversationHistory.slice(-6).map(msg => ({
            content: msg.content,
            isUser: msg.isUser,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let fullResponse = '';

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              
              // Check for mood logging and filter it out
              if (content.includes('MOOD_LOG:')) {
                const moodMatch = content.match(/MOOD_LOG:([^,\n]+),(\d+),?(.*)/);
                if (moodMatch) {
                  const [fullMatch, mood, intensityStr, note] = moodMatch;
                  await saveMoodEntry({
                    mood: mood.toLowerCase().trim(),
                    intensity: parseInt(intensityStr),
                    note: note?.trim() || undefined,
                    context: userMessage
                  });
                  
                  toast({
                    title: "Mood Logged 📝",
                    description: `Recorded: ${mood.trim()} (intensity: ${intensityStr}/5)`,
                  });
                }
                // Send content without MOOD_LOG line
                const cleanContent = content.replace(/MOOD_LOG:[^\n]*\n?/g, '');
                if (cleanContent) {
                  onDelta(cleanContent);
                }
              } else {
                onDelta(content);
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              
              // Filter out MOOD_LOG from display
              const cleanContent = content.replace(/MOOD_LOG:[^\n]*\n?/g, '');
              if (cleanContent) {
                onDelta(cleanContent);
              }
            }
          } catch { }
        }
      }

      onDone();
      return fullResponse;
    } catch (error) {
      console.error("Error streaming chat:", error);
      onDone();
      throw error;
    }
  };

  const handleWebSearch = async (query: string) => {
    if (!currentSessionId) return;
    
    // Send as a user message with web search context
    await sendMessageToChat(currentSessionId, `[Web Search] ${query}`);
  };

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    
    // If no active session, create one and show mood input
    let sessionId = currentSessionId;
    if (!sessionId) {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ title: content.slice(0, 50) + (content.length > 50 ? "..." : ""), user_id: user.id })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create session",
          variant: "destructive",
        });
        return;
      }

      sessionId = data.id;
      setPendingSessionId(sessionId);
      setShowMoodInput(true);
      
      // Store the first message to send after mood is logged
      sessionStorage.setItem('pendingMessage', content);
      return;
    }
    
    await sendMessageToChat(sessionId, content);
  };

  const sendMessageToChat = async (sessionId: string, content: string) => {

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Save user message
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content,
    });

    // Update session title if first user message
    const userMessageCount = messages.filter(m => m.isUser).length;
    if (userMessageCount === 0) {
      await updateSessionTitle(sessionId, content);
    }

    try {
      let assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = '';

      const updateAssistant = (chunk: string) => {
        assistantContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.id === assistantMessageId && !last.isUser) {
            return prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, {
            id: assistantMessageId,
            content: assistantContent,
            isUser: false,
            timestamp: new Date(),
          }];
        });
      };

      await streamChatResponse(
        content,
        messages,
        updateAssistant,
        async () => {
          // Save assistant message to DB
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: assistantContent,
          });
        }
      );
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "I'm having trouble connecting right now. Please try again in a moment.",
        variant: "destructive",
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment, and remember that if you're in crisis, please reach out to a mental health professional or crisis hotline.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <ChatSidebar2
          currentSessionId={currentSessionId}
          onSessionChange={handleSessionChange}
          onNewChat={handleNewChat}
          mediaRefresh={mediaRefresh}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="flex flex-col flex-1">
          {showMoodInput && pendingSessionId && (
            <MoodInput
              sessionId={pendingSessionId}
              onComplete={async () => {
                setShowMoodInput(false);
                setCurrentSessionId(pendingSessionId);
                setPendingSessionId(null);
                
                // Send the pending message
                const pendingMessage = sessionStorage.getItem('pendingMessage');
                if (pendingMessage) {
                  sessionStorage.removeItem('pendingMessage');
                  await sendMessageToChat(pendingSessionId, pendingMessage);
                }
              }}
              onSkip={async () => {
                setShowMoodInput(false);
                setCurrentSessionId(pendingSessionId);
                setPendingSessionId(null);
                
                // Send the pending message
                const pendingMessage = sessionStorage.getItem('pendingMessage');
                if (pendingMessage) {
                  sessionStorage.removeItem('pendingMessage');
                  await sendMessageToChat(pendingSessionId, pendingMessage);
                }
              }}
            />
          )}
          {/* Header */}
          <div className="bg-background/80 backdrop-blur-sm border-b border-border/50 p-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              <div className="p-2 bg-primary/10 rounded-full">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Mental Health Companion</h1>
                <p className="text-sm text-muted-foreground">Mood tracking & journaling</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{moodCount} moods logged</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-1">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
              />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Input Area */}
        <Card className="max-w-4xl mx-auto mb-4 mx-4 shadow-soft border-border/50 bg-background/80 backdrop-blur-sm">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            sessionId={currentSessionId}
            disabled={isTyping}
            onUpload={() => setMediaRefresh(prev => prev + 1)}
            onWebSearch={handleWebSearch}
          />
        </Card>

        {/* Disclaimer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            This AI is here to support you, but it's not a replacement for professional mental health care. 
            If you're in crisis, please contact emergency services or a mental health hotline.
          </p>
        </div>

        <SheetContent side="left" className="w-64 p-0">
          <ChatSidebar2
            currentSessionId={currentSessionId}
            onSessionChange={handleSessionChange}
            onNewChat={handleNewChat}
            mediaRefresh={mediaRefresh}
          />
        </SheetContent>
        </div>
      </Sheet>
    </div>
  );
};
