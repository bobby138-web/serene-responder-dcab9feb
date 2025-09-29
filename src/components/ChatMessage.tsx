import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatMessage = ({ message, isUser, timestamp }: ChatMessageProps) => {
  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
        isUser 
          ? "bg-chat-user text-chat-user-foreground rounded-br-md" 
          : "bg-chat-bot text-chat-bot-foreground rounded-bl-md border border-border"
      )}>
        <p className="text-sm leading-relaxed">{message}</p>
        <p className={cn(
          "text-xs mt-2 opacity-70",
          isUser ? "text-chat-user-foreground" : "text-muted-foreground"
        )}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};