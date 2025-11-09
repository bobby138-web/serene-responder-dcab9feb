import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { UploadMenu } from "./UploadMenu";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  sessionId: string | null;
  disabled?: boolean;
  onUpload?: () => void;
  onWebSearch?: (query: string) => void;
}

export const ChatInput = ({ onSendMessage, sessionId, disabled, onUpload, onWebSearch }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Update message when transcript changes
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

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

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-background border-t border-border">
      <UploadMenu 
        sessionId={sessionId} 
        onUpload={onUpload}
        onWebSearch={onWebSearch}
      />
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder={isListening ? "Listening..." : "Share what's on your mind..."}
        className="flex-1 min-h-[44px] max-h-32 resize-none bg-muted/50 border-muted-foreground/20 focus:border-primary/50 focus:ring-primary/20"
        disabled={disabled || isListening}
      />
      <Button 
        type="button"
        size="icon"
        onClick={handleMicClick}
        disabled={disabled}
        className={isListening ? "bg-destructive hover:bg-destructive/90 animate-pulse" : "bg-secondary hover:bg-secondary/90"}
      >
        <Mic className="h-4 w-4" />
      </Button>
      <Button 
        type="submit" 
        size="icon" 
        disabled={!message.trim() || disabled || isListening}
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};