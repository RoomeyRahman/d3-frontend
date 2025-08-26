"use client";
import React, { useState } from "react";

const ChatComponent = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessage, setTypingMessage] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      setMessages((prev) => [...prev, { sender: "user", text: input }]);
      setInput("");
      setIsTyping(true);
      simulateAIResponse();
    }
  };

  const simulateAIResponse = () => {
    const aiResponse =
      "Hello! 👋 I'm your AI assistant. This is a simulated long response to show typing animation and scrolling behavior. You can customize my responses.";
    let index = 0;
    setTypingMessage("");
    const typingInterval = setInterval(() => {
      if (index < aiResponse.length) {
        setTypingMessage((prev) => prev + aiResponse[index]);
        index++;
      } else {
        clearInterval(typingInterval);
        setMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);
        setIsTyping(false);
      }
    }, 30);
  };

  return (
    <div className="relative flex flex-col h-full w-full rounded-lg bg-white shadow-md border border-gray-200">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-200 font-semibold text-gray-700">
        💬 AI Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-2xl max-w-xs text-sm leading-relaxed shadow-sm ${
                message.sender === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-900 rounded-bl-none"
              }`}
            >
              {message.sender === "ai" &&
              typingMessage &&
              message.text === typingMessage
                ? typingMessage
                : message.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-600 px-3 py-2 rounded-2xl text-sm rounded-bl-none italic animate-pulse">
              AI is typing...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 flex items-center space-x-2">
        <input
          type="text"
          className="flex-1 p-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
