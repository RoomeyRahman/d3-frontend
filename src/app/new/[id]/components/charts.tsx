import React from "react";
import D3DynamicChart from "../../componets/Charts/d3";
import { useAppSelector } from "@/lib/hooks";

interface D3ChartProps {
  sessionId: string;
}

const Charts: React.FC<D3ChartProps> = ({ sessionId }) => {
  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );

  const chartData = sessionData?.chartData;
  console.clear();
console.log("Rendering Charts with data:", chartData);
console.log("type:", chartData?.chartType);
  return (
    <div>
      {chartData?.data && chartData?.chartType && (
        <D3DynamicChart
          data={chartData.data}
          chartType={chartData.chartType}
        />
      )}
    </div>
  );
};

export default Charts;

