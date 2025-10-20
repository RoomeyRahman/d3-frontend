"use client";

import { Suspense, useState, useEffect } from "react";
import D3Chart from "../[id]/components/charts";
import DataComponent from "../[id]/components/data";
import ChatComponent from "../[id]/components/chat";
import RecommendationComponent from "../[id]/components/recommendation";

interface ChartVisualizationProps {
  dataResponse: {
    bundle?: any;
    recommendations?: any[];
    data_profile?: any;
    sample_data?: any;
  };
  sessionId?: string; // Keep optional for backward compatibility
}

const ChartVisualization = ({
  dataResponse,
  sessionId,
}: ChartVisualizationProps) => {
  const [mounted, setMounted] = useState(false);

  console.log("---------", dataResponse);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading visualization...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 p-6">
      {/* Top section */}
      <div className="grid grid-cols-12 gap-5">
        {/* Chart area */}
        <div className="col-span-8 rounded-2xl bg-white shadow-lg p-6 hover:shadow-2xl transition-all duration-300">
          <Suspense
            fallback={<div className="text-gray-500">Loading chart...</div>}
          >
            <D3Chart dataResponse={dataResponse} sessionId={sessionId} />
          </Suspense>
        </div>

        <div className="col-span-4 flex flex-col gap-2">
          <div className=" rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 p-6">
            <DataComponent dataResponse={dataResponse} sessionId={sessionId} />
          </div>
          <div className="rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            <ChatComponent />
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-4">
        {/* Recommendations */}
        <div className="rounded-2xl bg-white shadow-md hover:shadow-xl transition-all duration-300 p-6">
          <RecommendationComponent
            dataResponse={dataResponse}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartVisualization;
