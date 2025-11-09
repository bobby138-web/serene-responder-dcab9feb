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

    // Check for web search prefix
    const isWebSearch = userMessage?.startsWith('[Web Search]');
    let searchContext = '';
    let processedMessage = userMessage;

    if (isWebSearch) {
      const searchQuery = userMessage.replace('[Web Search]', '').trim();
      console.log('Performing web search:', searchQuery);
      
      try {
        const searchResponse = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`
        );
        const searchData = await searchResponse.json();
        
        if (searchData.AbstractText) {
          searchContext = `\n\nWeb Search Results:\n${searchData.AbstractText}`;
        } else if (searchData.RelatedTopics?.length > 0) {
          const topics = searchData.RelatedTopics.slice(0, 3)
            .map((topic: any) => topic.Text)
            .filter(Boolean)
            .join('\n• ');
          if (topics) {
            searchContext = `\n\nWeb Search Results:\n• ${topics}`;
          }
        }
        
        processedMessage = `User searched for: "${searchQuery}". ${searchContext ? 'Here are the results:' + searchContext : 'No results found.'} Please provide a helpful response.`;
      } catch (error) {
        console.error('Web search error:', error);
        processedMessage = `User tried to search for: "${searchQuery}". Please provide general information about this topic.`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

6. WEB SEARCH: When provided with web search results, incorporate them naturally into your response.

7. CONVERSATIONAL: Allow natural dialogue. Users shouldn't fill forms - just talk naturally.

Keep responses warm, supportive, concise, and encourage professional help when appropriate. You're not a therapist, but a supportive companion.${searchContext ? '\n\n' + searchContext : ''}`
          },
          ...(conversationHistory || []).slice(-6).map((msg: any) => ({
            role: msg.isUser ? "user" : "assistant",
            content: msg.content
          })),
          {
            role: "user",
            content: processedMessage || userMessage
          }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const error = await response.text();
      console.error("AI API error:", response.status, error);
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
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
