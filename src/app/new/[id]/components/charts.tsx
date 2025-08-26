"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
import { useGenerateChartMutation } from "@/lib/api/uploadApi";
import type { Recommendation } from "@/lib/api/uploadApi";

import BarChart from "../../componets/Charts/BarChart";
import ScatterPlot from "../../componets/Charts/ScatterPlot";
import LineChart from "../../componets/Charts/LineChart";
import PieChart from "../../componets/Charts/PieChart";
import ChoroplethMap from "../../componets/Charts/ChoroplpethMap";
import Histogram from "../../componets/Charts/Histogram";
import AreaChart from "../../componets/Charts/AreaChart";
import TreemapChart from "../../componets/Charts/TreeMapChart";
import ForceDirectedNetwork from "../../componets/Charts/ForceDirected";
import SankeyDiagram from "../../componets/Charts/Sankey";
import D3Heatmap from "../../componets/Charts/HeatMap";

interface D3ChartProps {
  sessionId: string;
}

const CHART_TYPE_MAP: Record<string, string> = {
  bar_chart: "bar",
  line_chart: "line",
  scatter_plot: "scatter",
  pie_chart: "pie",
  histogram: "histogram",
  area_chart: "area",
  choropleth: "choropleth",
  treemap: "treemap",
  force_directed: "force_network",
  sankey: "sankey",
  heatmap: "heatmap",
};

const D3Chart = ({ sessionId }: D3ChartProps) => {
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );
  const [generateChart, { isLoading, error }] = useGenerateChartMutation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (sessionData?.recommendations) {
      setRecommendations(sessionData.recommendations);
      if (sessionData.recommendations.length > 0) {
        setSelectedChart(sessionData.recommendations[0].chart_type);
      }
    }
  }, [sessionData]);

  const handleGenerateChart = useCallback(async () => {
    if (!selectedChart || !sessionId || !mounted) return;

    try {
      const result = await generateChart({
        session_id: sessionId,
        chart_type: selectedChart,
      }).unwrap();
      setChartData(result);
    } catch (err) {
      console.error("Chart generation failed:", err);
    }
  }, [selectedChart, sessionId, mounted, generateChart]);

  useEffect(() => {
    if (mounted && selectedChart && sessionId) {
      handleGenerateChart();
    }
  }, [mounted, selectedChart, sessionId, handleGenerateChart]);

  const renderChart = () => {
    if (!chartData) return null;

    const mappedType = CHART_TYPE_MAP[selectedChart] || selectedChart;

    switch (mappedType) {
      case "bar":
        return <BarChart data={chartData} />;
      case "scatter":
        return <ScatterPlot data={chartData} />;
      case "line":
        return <LineChart data={chartData} />;
      case "pie":
        return <PieChart data={chartData} />;
      case "choropleth":
        return <ChoroplethMap data={chartData} />;
      case "histogram":
        return <Histogram data={chartData} />;
      case "area":
        return <AreaChart data={chartData} />;
      case "treemap":
        return <TreemapChart data={chartData} />;
      case "force_network":
        return <ForceDirectedNetwork data={chartData} />;
      case "sankey":
        return <SankeyDiagram data={chartData} />;
      case "heatmap":
        return <D3Heatmap data={chartData} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>{getChartTitle()} visualization not implemented yet</p>
          </div>
        );
    }
  };

  const getChartTitle = () =>
    selectedChart
      ? selectedChart
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
      : "";

  if (!sessionData) {
    return (
      <div className="rounded-xl bg-white px-6 py-12 shadow-md flex items-center justify-center">
        <p className="text-gray-600">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className=" w-full">
      {/* Chart Container with fixed height */}
      <div className="w-full flex flex-col items-center justify-center min-h-[300px]">
        {!mounted ? (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Preparing chart...</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">
              Generating {getChartTitle()}...
            </span>
          </div>
        ) : !selectedChart ? (
          <p className="text-gray-600">
            Select a chart type to visualize your data
          </p>
        ) : chartData ? (
          <div className="w-full">
            {renderChart()}
            <div className="text-center mt-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {getChartTitle()}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {chartData.processed_data?.length || 0} Data Points •
                Interactive D3 Visualization
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            {/* Placeholder icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mb-2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v18h18M7 14l3-3 4 4 5-5"
              />
            </svg>
            <p className="text-sm">No data available for visualization</p>
          </div>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="mt-6 p-3 bg-red-50 border border-red-400 text-red-700 rounded-lg text-sm">
          {error.data?.detail as string}
        </div>
      )}

      {/* Chart Type Dropdown */}
      <div className="relative mt-6 flex items-center justify-end">
        <button
          className="px-3 py-2 text-sm flex items-center space-x-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 transition-all"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isLoading || recommendations.length === 0}
        >
          <span>{selectedChart ? getChartTitle() : "Select Chart Type"}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-4 h-4 transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-xl w-64 z-50 max-h-96 overflow-y-auto">
            {recommendations.map((rec) => (
              <button
                key={rec.chart_type}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  selectedChart === rec.chart_type
                    ? "bg-gray-100 text-gray-900"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
                onClick={() => {
                  setSelectedChart(rec.chart_type);
                  setDropdownOpen(false);
                }}
              >
                <div className="font-medium">
                  {rec.chart_type.replace(/_/g, " ").toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">
                  Confidence: {Math.round(rec.confidence * 100)}%
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default D3Chart;
