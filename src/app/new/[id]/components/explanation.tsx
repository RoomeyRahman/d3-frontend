"use client";
import React, { useState, useEffect, useRef } from "react";

const Explanations = () => {
  const text =
    "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Perferendis, quo nemo deleniti molestiae, obcaecati dolor id beatae quae voluptates corrupti culpa corporis labore eligendi et tempore error. Quam quos totam odio, aliquid possimus iure, nisi dolorem nihil asperiores tempora pariatur itaque ullam cupiditate dolor, beatae maxime obcaecati qui quaerat? Cumque fugiat est dolore dolor voluptas, adipisci facilis nesciunt laborum nostrum optio provident sapiente. Vitae, nobis. Repudiandae quis maxime eum iusto beatae commodi fugit incidunt, soluta necessitatibus quos deleniti possimus doloremque sit! Veniam laboriosam numquam iusto tempore fugit iure neque deserunt. Pariatur, incidunt consequuntur. Eligendi repellat nesciunt nemo cumque temporibus illum itaque quia rerum libero deserunt officiis inventore voluptate rem non, praesentium repellendus doloremque magni dicta velit. Ab aspernatur quibusdam amet hic. Voluptatum sit at asperiores impedit. Deleniti exercitationem voluptatum aspernatur odit ad vero nemo eveniet porro inventore atque totam veritatis, iure reiciendis accusamus quis ratione sit nesciunt illo consequuntur. Atque hic dolor aliquam quibusdam repudiandae odit debitis neque quidem nostrum suscipit. Distinctio assumenda dignissimos sint ex amet mollitia rerum exercitationem, adipisci doloribus quod perferendis cum magni doloremque aperiam! Ea placeat dignissimos assumenda provident nam repellat, suscipit impedit perferendis facilis voluptatum, modi fugit expedita laborum aliquam. Minus voluptatum mollitia itaque assumenda."; // Add long text

  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[index]);
        setIndex(index + 1);
      }, Math.random() * (50 - 10) + 10);
      return () => clearTimeout(timeout);
    } else {
      setShowCursor(false);
    }
  }, [index, text]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight; // Auto-scroll
    }
  }, [displayText]);

  return (
    <div className="px-2 max-w-2xl text-gray-900 ">
      <div>
        <p className="font-semibold text-lg">Bar Chart Explanation</p>
      </div>
      <div
        ref={textRef}
        className="mt-3 h-[400px] overflow-y-auto text-sm font-thin leading-7 scrollbar-hide"
      >
        {displayText}
        {showCursor && <span className="animate-blink">|</span>}
      </div>
    </div>
  );
};

export default Explanations;
