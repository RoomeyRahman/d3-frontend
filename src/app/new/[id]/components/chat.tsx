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
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Perferendis, quo nemo deleniti molestiae, obcaecati dolor id beatae quae voluptates corrupti culpa corporis labore eligendi et tempore error. Quam quos totam odio, aliquid possimus iure, nisi dolorem nihil asperiores tempora pariatur itaque ullam cupiditate dolor, beatae maxime obcaecati qui quaerat? Cumque fugiat est dolore dolor voluptas, adipisci facilis nesciunt laborum nostrum optio provident sapiente. Vitae, nobis. Repudiandae quis maxime eum iusto beatae commodi fugit incidunt, soluta necessitatibus quos deleniti possimus doloremque sit! Veniam laboriosam numquam iusto tempore fugit iure neque deserunt. Pariatur, incidunt consequuntur. Eligendi repellat nesciunt nemo cumque temporibus illum itaque quia rerum libero deserunt officiis inventore voluptate rem non, praesentium repellendus doloremque magni dicta velit. Ab aspernatur quibusdam amet hic. Voluptatum sit at asperiores impedit. Deleniti exercitationem voluptatum aspernatur odit ad vero nemo eveniet porro inventore atque totam veritatis, iure reiciendis accusamus quis ratione sit nesciunt illo consequuntur. Atque hic dolor aliquam quibusdam repudiandae odit debitis neque quidem nostrum suscipit. Distinctio assumenda dignissimos sint ex amet mollitia rerum exercitationem, adipisci doloribus quod perferendis cum magni doloremque aperiam! Ea placeat dignissimos assumenda provident nam repellat, suscipit impedit perferendis facilis voluptatum, modi fugit expedita laborum aliquam. Minus voluptatum mollitia itaque assumenda. ";
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
    }, 100);
  };

  return (
    <div className="relative w-full h-80 rounded-lg p-4">
      <div className="overflow-y-auto scrollbar-hide h-[calc(100%-60px)] space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs  ${
                message.sender === "user"
                  ? "bg-blue-500 text-white"
                  : " text-gray-900 w-full"
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
      </div>

      <div className="absolute bottom-4 w-full flex items-center space-x-2">
        <input
          type="text"
          className="w-[78%] p-2 bg-gray-300 rounded-lg text-sm text-gray-600"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </div>

      {isTyping && (
        <div className="absolute bottom-12 left-0 text-gray-500 italic">
          AI is typing...
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
