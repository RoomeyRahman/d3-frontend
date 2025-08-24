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
    <div className="bg-gray-300">
      <div className="grid grid-cols-8 px-10 gap-5 py-5">
        <div className="col-span-5">
          <Suspense fallback={<div>Loading chart...</div>}>
            <D3Chart sessionId={sessionId} />
          </Suspense>
        </div>
        <div className="col-span-3 h-[430px] overflow-y-auto rounded-lg bg-gray-100 p-5 scrollbar-hide">
          <Explanations />
        </div>
      </div>
      <div className="grid grid-cols-3 px-10 gap-5 py-5">
        <div className="rounded-lg bg-gray-100">
          <DataComponent sessionId={sessionId} />
        </div>
        <div className="rounded-lg bg-gray-100">
          <RecommendationComponent sessionId={sessionId} />
        </div>
        <div className="rounded-lg bg-gray-100 scrollbar-hide">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
};

export default PromptPage;
