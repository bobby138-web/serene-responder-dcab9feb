import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, userMessage, conversationHistory } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: messages || [
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
          ...(conversationHistory || []).slice(-6).map((msg: any) => ({
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
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now. Please try again.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
