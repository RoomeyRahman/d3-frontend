"use client";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

const ChatComponent = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello! 👋 I'm your AI data analyst. I can help you understand your data, suggest visualizations, and answer questions about your charts. What would you like to explore?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const responses = [
      "Based on your data, I can see some interesting patterns. The highest performing category shows a 35% increase compared to last quarter. Would you like me to create a detailed breakdown?",
      "Great question! The correlation between these variables is quite strong (r=0.78). This suggests that as one increases, the other tends to increase as well. Should we explore this relationship further?",
      "I notice some outliers in your dataset that might be worth investigating. These could represent either data entry errors or genuinely exceptional cases. Would you like me to highlight them?",
      "The seasonal trends in your data are quite pronounced. Q4 consistently outperforms other quarters by about 28%. This could inform your planning strategies.",
      "Your data shows a clear geographic distribution pattern. The North region accounts for 42% of total activity. Would you like to see a geographic visualization?",
    ];

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                AI Assistant
              </h3>
              <p className="text-xs text-slate-600">Data analysis expert</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 text-xs"
          >
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
            Online
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[85%] ${
                message.sender === "user"
                  ? "flex-row-reverse space-x-reverse"
                  : ""
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${
                  message.sender === "user" ? "bg-blue-100" : "bg-slate-100"
                }`}
              >
                {message.sender === "user" ? (
                  <User className="h-3 w-3 text-blue-600" />
                ) : (
                  <Sparkles className="h-3 w-3 text-slate-600" />
                )}
              </div>
              <div
                className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                    : "bg-slate-50 text-slate-800 rounded-bl-md border border-slate-200"
                }`}
              >
                {message.text}
                <div
                  className={`text-xs mt-1 opacity-70 ${
                    message.sender === "user"
                      ? "text-blue-100"
                      : "text-slate-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <Sparkles className="h-3 w-3 text-slate-600" />
              </div>
              <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            className="flex-1 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your data, request charts, or get insights..."
            disabled={isTyping}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default ChatComponent;
