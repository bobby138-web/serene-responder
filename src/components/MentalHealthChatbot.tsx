import { useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

// Note: In a production app, this should be stored securely in environment variables
const GROQ_API_KEY = "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";

export const MentalHealthChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm here to support you with your mental health journey. Feel free to share what's on your mind, ask questions, or just have a conversation. How are you feeling today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const callGroqAPI = async (userMessage: string): Promise<string> => {
    try {
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
              content: "You are a compassionate AI assistant focused on mental health support. Provide empathetic, helpful responses while being clear that you're not a replacement for professional therapy. Offer practical coping strategies, validate feelings, and encourage professional help when appropriate. Keep responses warm, supportive, and concise."
            },
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
      return data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now. Please try again.";
    } catch (error) {
      console.error("Error calling Groq API:", error);
      throw error;
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const aiResponse = await callGroqAPI(content);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-primary-soft/20 to-accent/30">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="p-2 bg-primary/10 rounded-full">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Mental Health Support</h1>
            <p className="text-sm text-muted-foreground">Your compassionate AI companion</p>
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
  );
};