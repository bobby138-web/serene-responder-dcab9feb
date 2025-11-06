import { useState, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChatSidebar } from "./ChatSidebar";
import { Card } from "@/components/ui/card";
import { Heart, TrendingUp, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

// Note: In a production app, this should be stored securely in environment variables
const GROQ_API_KEY = "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";

export const MentalHealthChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [moodCount, setMoodCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

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
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "New Chat" })
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
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ title: "New Chat" })
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
    try {
      const { error } = await supabase
        .from('mood_entries')
        .insert([entry]);
      
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

  const callGroqAPI = async (userMessage: string, conversationHistory: Message[]): Promise<string> => {
    try {
      if (userMessage.toLowerCase().includes('insight') || 
          userMessage.toLowerCase().includes('pattern') || 
          userMessage.toLowerCase().includes('trend')) {
        return await getMoodInsights();
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `You are a compassionate mental health journal companion and mood tracker. Your role:

1. MOOD DETECTION: When users express emotions (sad, happy, anxious, stressed, calm, etc.), automatically detect and acknowledge their mood.

2. REFLECTIVE QUESTIONS: Ask gentle follow-up questions like:
   - "Would you like to share more about what happened?"
   - "What triggered this feeling?"
   - "How intense is this feeling on a scale of 1-5?"

3. MOOD LOGGING: When a user shares a clear mood, respond with acknowledgment and save it (format: MOOD_LOG: mood_name, intensity_1-5, optional_note).

4. INSIGHTS: If asked about patterns, analyze their mood history and provide personalized insights.

5. WELLNESS SUPPORT: Offer:
   - Breathing exercises for anxiety
   - Motivational quotes for sadness
   - Mindfulness tips for stress
   - Celebration for positive moods

6. CONVERSATIONAL: Allow natural dialogue. Users shouldn't fill forms - just talk naturally.

Keep responses warm, supportive, concise, and encourage professional help when appropriate. You're not a therapist, but a supportive companion.`
            },
            ...conversationHistory.slice(-6).map(msg => ({
              role: msg.isUser ? "user" : "assistant",
              content: msg.content
            })),
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now. Please try again.";

      const moodLogMatch = aiResponse.match(/MOOD_LOG:\s*(\w+),\s*(\d),?\s*(.*)/i);
      if (moodLogMatch) {
        const [, mood, intensity, note] = moodLogMatch;
        await saveMoodEntry({
          mood: mood.toLowerCase(),
          intensity: parseInt(intensity),
          note: note.trim() || undefined,
          context: userMessage
        });
        
        toast({
          title: "Mood Logged 📝",
          description: `Recorded: ${mood} (intensity: ${intensity}/5)`,
        });

        return aiResponse.replace(/MOOD_LOG:.*\n?/i, '').trim();
      }

      return aiResponse;
    } catch (error) {
      console.error("Error calling Groq API:", error);
      throw error;
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) {
      toast({
        title: "Error",
        description: "No active session",
        variant: "destructive",
      });
      return;
    }

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
      session_id: currentSessionId,
      role: "user",
      content,
    });

    // Update session title if first user message
    const userMessageCount = messages.filter(m => m.isUser).length;
    if (userMessageCount === 0) {
      await updateSessionTitle(currentSessionId, content);
    }

    try {
      const aiResponse = await callGroqAPI(content, messages);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);

      // Save assistant message
      await supabase.from("chat_messages").insert({
        session_id: currentSessionId,
        role: "assistant",
        content: aiResponse,
      });
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <ChatSidebar
          currentSessionId={currentSessionId}
          onSessionChange={handleSessionChange}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <ChatSidebar
            currentSessionId={currentSessionId}
            onSessionChange={handleSessionChange}
            onNewChat={handleNewChat}
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1">
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
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{moodCount} moods logged</span>
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
          <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
        </Card>

        {/* Disclaimer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            This AI is here to support you, but it's not a replacement for professional mental health care. 
            If you're in crisis, please contact emergency services or a mental health hotline.
          </p>
        </div>
      </div>
    </div>
  );
};
