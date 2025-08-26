"use client";
import { Suspense } from "react";
import D3Chart from "./components/charts";
import Explanations from "./components/explanation";
import DataComponent from "./components/data";
import RecommendationComponent from "./components/recommendation";
import ChatComponent from "./components/chat";
import { useParams } from "next/navigation";

const PromptPage = () => {
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-6">
      {/* Top section */}
      <div className="grid grid-cols-8 gap-6">
        {/* Chart area */}
        <div className="col-span-5 rounded-2xl bg-white shadow-lg p-6 hover:shadow-2xl transition-all duration-300">
          <Suspense
            fallback={<div className="text-gray-500">Loading chart...</div>}
          >
            <D3Chart sessionId={sessionId} />
          </Suspense>
        </div>

        {/* Explanations area */}
        <div className="col-span-3 overflow-y-auto rounded-2xl bg-white shadow-lg p-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <Explanations />
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Data */}
        <div className="rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 p-6">
          <DataComponent sessionId={sessionId} />
        </div>

        {/* Recommendations */}
        <div className="rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 p-6">
          <RecommendationComponent sessionId={sessionId} />
        </div>

        {/* Chat */}
        <div className="rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
};

export default PromptPage;
