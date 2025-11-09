"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/hooks";
import type { Recommendation } from "@/lib/api/uploadApi";

import BarChart from "../../componets/Charts/BarChart";
import PieChart from "../../componets/Charts/PieChart";
import ChoroplethMap from "../../componets/Charts/ChoroplpethMap";
import AreaChart from "../../componets/Charts/AreaChart";
import TreemapChart from "../../componets/Charts/TreeMapChart";
import ForceDirectedNetwork from "../../componets/Charts/ForceDirected";
import DonutChart from "../../componets/Charts/DonutChart";
import DensityPlot from "../../componets/Charts/DensityPlot";
import DotPlotChart from "../../componets/Charts/DotPlot";
import { HeatmapChart } from "../../componets/Charts/HeatmapChart";
import { LineChart } from "../../componets/Charts/LineChart";
import Histogram from "../../componets/Charts/Histogram";
import { ViolinPlot } from "../../componets/Charts/ViolinPlot";
import ScatterPlot from "../../componets/Charts/ScatterPlot";
import { SunburstChart } from "../../componets/Charts/Sunburst";
import { ArcDiagram } from "../../componets/Charts/ArcDiagram";
import { SankeyDiagram } from "../../componets/Charts/Sankey";
import BoxPlot from "../../componets/Charts/BoxPlot";
import ContourPlot from "../../componets/Charts/ContourPlot";
import { ConvexHullChart } from "../../componets/Charts/ConvexHull";
import { ChordDiagram } from "../../componets/Charts/ChordDiagram ";

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
  force_directed: "forceDirectedGraph",
  sankeyDiagram: "sankeyDiagram",
  heatmap: "heatmap",
  donut_chart: "donut",
  density_plot: "density",
  sunburst: "sunburst",
  violinPlot: "violinPlot",
  arcDiagram: "arcDiagram",
  boxPlot: "boxPlot",
  contourPlot: "contourPlot",
  convexHull: "convexHull",
  chordDiagram: "chordDiagram",
};

const D3Chart = ({ sessionId }: D3ChartProps) => {
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentChartData, setCurrentChartData] = useState<any>(null);

  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );

  console.log("---------", sessionData.chartConfig);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sessionData?.recommendations) {
      setRecommendations(sessionData.recommendations);
      if (sessionData.recommendations.length > 0 && !selectedChart) {
        setSelectedChart(sessionData.recommendations[0].chart_type);
      }
    }
  }, [sessionData, selectedChart]);

  // Update chart data when selectedChart changes
  useEffect(() => {
    if (mounted && selectedChart && sessionData?.chartConfig) {
      // Find the chart config that matches the selected chart type
      const chartConfig = sessionData.chartConfig.find(
        (config: any) => config.chartType === selectedChart
      );

      if (chartConfig) {
        setCurrentChartData(chartConfig);
      } else {
        setCurrentChartData(null);
      }
    }
  }, [selectedChart, sessionData?.chartConfig, mounted]);

  const renderChart = () => {
    if (!currentChartData) return null;

    const mappedType = CHART_TYPE_MAP[selectedChart] || selectedChart;

    switch (mappedType) {
      case "bar":
        return <BarChart data={currentChartData} />;

      case "line":
        return <LineChart data={currentChartData} />;

      case "scatter":
        return <ScatterPlot data={currentChartData} />;

      case "histogram":
        return <Histogram data={currentChartData} />;

      case "pie":
        return <PieChart data={currentChartData} />;

      case "donut":
        return <DonutChart data={currentChartData} />;

      case "area":
        return <AreaChart data={currentChartData} />;

      case "heatmap":
        return <HeatmapChart data={currentChartData} />;

      case "choropleth":
        return <ChoroplethMap data={currentChartData} />;

      case "treemap":
        return <TreemapChart data={currentChartData} />;

      case "forceDirectedGraph":
        return <ForceDirectedNetwork data={currentChartData} />;

      case "sankeyDiagram":
        return <SankeyDiagram data={currentChartData} />;

      case "density":
        return <DensityPlot data={currentChartData} />;

      case "sunburst":
        return <SunburstChart data={currentChartData} />;
      case "dotPlot":
        return <DotPlotChart data={currentChartData} />;
      case "violinPlot":
        return <ViolinPlot data={currentChartData} />;
      case "arcDiagram":
        return <ArcDiagram data={currentChartData} />;
      case "boxPlot":
        return <BoxPlot data={currentChartData} />;
      case "contourPlot":
        return <ContourPlot data={currentChartData} />;
      case "convexHull":
        return <ConvexHullChart data={currentChartData} />;
      case "chordDiagram":
        return <ChordDiagram chartConfiguration={currentChartData} />;

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

  // Show loading state for session data
  if (!sessionData) {
    return (
      <div className="rounded-xl bg-white px-6 py-12 shadow-md flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading session data...</span>
        </div>
      </div>
    );
  }

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="w-full">
        <div className="w-full flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Preparing chart...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart Container with fixed height */}
      <div className="w-full flex flex-col items-center justify-center min-h-[300px]">
        {!selectedChart ? (
          <p className="text-gray-600">
            Select a chart type to visualize your data
          </p>
        ) : currentChartData ? (
          <div className="w-full">
            {renderChart()}
            <div className="text-center mt-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {getChartTitle()}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {currentChartData.data?.flat_data?.length || 0} Data Points •
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
            <p className="text-sm">
              No chart configuration available for {getChartTitle()}
            </p>
          </div>
        )}
      </div>

      {/* Chart Type Dropdown */}
      <div className="relative mt-6 flex items-center justify-end">
        <button
          className="px-3 py-2 text-sm flex items-center space-x-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 transition-all"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={recommendations.length === 0}
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
