import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSendMessage, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const { isRecording, isProcessing, startRecording, stopRecording } = useAudioRecorder();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      try {
        const transcription = await stopRecording();
        setMessage(transcription);
      } catch (error) {
        console.error('Recording error:', error);
      }
    } else {
      await startRecording();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-background border-t border-border">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={isRecording ? "Recording..." : isProcessing ? "Processing..." : "Share what's on your mind..."}
        className="flex-1 min-h-[44px] max-h-32 resize-none bg-muted/50 border-muted-foreground/20 focus:border-primary/50 focus:ring-primary/20"
        disabled={disabled || isRecording || isProcessing}
      />
      <Button 
        type="button"
        size="icon"
        onClick={handleMicClick}
        disabled={disabled || isProcessing}
        className={isRecording ? "bg-destructive hover:bg-destructive/90" : "bg-secondary hover:bg-secondary/90"}
      >
        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button 
        type="submit" 
        size="icon" 
        disabled={!message.trim() || disabled || isRecording || isProcessing}
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};