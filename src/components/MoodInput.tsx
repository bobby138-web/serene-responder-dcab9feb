import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Smile, Meh, Frown, X } from "lucide-react";
import { z } from "zod";

const noteSchema = z.string().trim().max(500, { message: "Note must be less than 500 characters" });

interface MoodInputProps {
  sessionId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const moods = [
  { value: "happy", label: "Happy", icon: Smile, color: "text-green-500" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "text-yellow-500" },
  { value: "sad", label: "Sad", icon: Frown, color: "text-blue-500" },
  { value: "anxious", label: "Anxious", icon: Frown, color: "text-orange-500" },
  { value: "stressed", label: "Stressed", icon: Frown, color: "text-red-500" },
];

export const MoodInput = ({ sessionId, onComplete, onSkip }: MoodInputProps) => {
  const [selectedMood, setSelectedMood] = useState("");
  const [intensity, setIntensity] = useState([5]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast({
        title: "Please select a mood",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        variant: "destructive",
      });
      return;
    }

    // Validate note
    try {
      if (note) {
        noteSchema.parse(note);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("mood_entries").insert({
      session_id: sessionId,
      user_id: user.id,
      mood: selectedMood,
      intensity: intensity[0],
      note: note.trim() || null,
      context: "pre-conversation",
    });

    if (error) {
      toast({
        title: "Error saving mood",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Mood logged",
      description: "Thanks for sharing how you're feeling",
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>How are you feeling?</CardTitle>
              <CardDescription>
                Take a moment to check in with yourself before we start
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-5 gap-2">
            {moods.map((mood) => {
              const Icon = mood.icon;
              return (
                <Button
                  key={mood.value}
                  variant={selectedMood === mood.value ? "default" : "outline"}
                  className="flex flex-col h-auto py-3"
                  onClick={() => setSelectedMood(mood.value)}
                >
                  <Icon className={`h-6 w-6 mb-1 ${selectedMood === mood.value ? "" : mood.color}`} />
                  <span className="text-xs">{mood.label}</span>
                </Button>
              );
            })}
          </div>

          {selectedMood && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-sm font-medium">
                Intensity: {intensity[0]}/10
              </label>
              <Slider
                value={intensity}
                onValueChange={setIntensity}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Any notes? (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!selectedMood || isSubmitting}
              className="flex-1"
            >
              Continue
            </Button>
            <Button
              variant="outline"
              onClick={onSkip}
              disabled={isSubmitting}
            >
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
