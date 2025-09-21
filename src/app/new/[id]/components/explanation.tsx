"use client";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Play, Pause } from "lucide-react";

const Explanations = () => {
  const text =
    "Based on the data analysis, we can observe several key trends and patterns. The bar chart reveals significant variations in performance across different categories, with Electronics showing the strongest growth trajectory at 35% year-over-year. Regional distribution indicates that the North region consistently outperforms others, contributing to 42% of total revenue. The data suggests seasonal patterns, with Q4 showing 28% higher activity compared to Q1. Customer segmentation analysis reveals that premium customers account for 15% of the user base but generate 45% of revenue. These insights suggest opportunities for targeted marketing campaigns and inventory optimization strategies.";

  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (index < text.length && isPlaying) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[index]);
        setIndex(index + 1);
      }, Math.random() * (40 - 15) + 15);
      return () => clearTimeout(timeout);
    } else if (index >= text.length) {
      setShowCursor(false);
      setIsComplete(true);
    }
  }, [index, text, isPlaying]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [displayText]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setDisplayText("");
    setIndex(0);
    setIsPlaying(true);
    setIsComplete(false);
    setShowCursor(true);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-slate-900 text-sm">
            AI Analysis
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={isComplete ? "default" : "secondary"}
            className={`text-xs ${
              isComplete
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {isComplete ? "Complete" : isPlaying ? "Analyzing..." : "Paused"}
          </Badge>
          <div className="flex space-x-1">
            <button
              onClick={togglePlayPause}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              disabled={isComplete}
            >
              {isPlaying ? (
                <Pause className="h-3 w-3 text-slate-600" />
              ) : (
                <Play className="h-3 w-3 text-slate-600" />
              )}
            </button>
            <button
              onClick={resetAnimation}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-xs text-slate-600"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      <div
        ref={textRef}
        className="flex-1 overflow-y-auto text-sm leading-relaxed text-slate-700 bg-gradient-to-b from-slate-50 to-white p-4 rounded-lg border border-slate-200 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="space-y-3">
          {displayText.split(". ").map(
            (sentence, idx) =>
              sentence.trim() && (
                <p key={idx} className="text-justify">
                  {sentence.trim()}
                  {sentence.includes(".") ? "" : "."}
                </p>
              )
          )}
          {showCursor && !isComplete && (
            <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-1"></span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{Math.round((index / text.length) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(index / text.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Explanations;
