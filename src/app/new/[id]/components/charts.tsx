"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "@/lib/hooks";
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
import BoxPlot from "../../componets/Charts/boxPlot";
import ViolinPlot from "../../componets/Charts/ViolinPlot";
import BubbleChart from "../../componets/Charts/BabbleChart";
import RadarChart from "../../componets/Charts/RadarChart";
import SunburstChart from "../../componets/Charts/SunbrustChart";
import WaterfallChart from "../../componets/Charts/WaterfallChart";
import GanttChart from "../../componets/Charts/GanttChart";

interface D3ChartProps {
  sessionId: string;
  datasetId?: string;
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
  forceDirectedGraph: "force_network",
  sankey: "sankey",
  heatmap: "heatmap",
  boxPlot: "boxplot",
  box_plot: "boxplot",
  violinPlot: "violin",
  violin_plot: "violin",
  bubbleChart: "bubble",
  bubble_chart: "bubble",
  radarChart: "radar",
  radar_chart: "radar",
  sunburstChart: "sunburst",
  sunburst_chart: "sunburst",
  waterfallChart: "waterfall",
  waterfall_chart: "waterfall",
  ganttChart: "gantt",
  gantt_chart: "gantt",
};

const generateDummyData = (chartType: string): any => {
  const mappedType = CHART_TYPE_MAP[chartType] || chartType;

  switch (mappedType) {
    case "bar":
      return {
        processed_data: [
          { category: "Q1", value: 65, label: "Sales" },
          { category: "Q2", value: 78, label: "Sales" },
          { category: "Q3", value: 92, label: "Sales" },
          { category: "Q4", value: 85, label: "Sales" },
        ],
      };

    case "scatter":
      return {
        processed_data: [
          { x: 3.8, y: 51, name: "Car 1" },
          { x: 4.2, y: 120, name: "Car 2" },
          { x: 5.1, y: 180, name: "Car 3" },
          { x: 6.0, y: 250, name: "Car 4" },
          { x: 6.5, y: 300, name: "Car 5" },
          { x: 7.2, y: 350, name: "Car 6" },
          { x: 8.0, y: 450, name: "Car 7" },
          { x: 8.2, y: 492, name: "Car 8" },
        ],
      };

    case "line":
      return {
        processed_data: [
          { month: "Jan", value: 30, category: "Series A" },
          { month: "Feb", value: 45, category: "Series A" },
          { month: "Mar", value: 60, category: "Series A" },
          { month: "Apr", value: 55, category: "Series A" },
          { month: "May", value: 75, category: "Series A" },
          { month: "Jun", value: 90, category: "Series A" },
        ],
      };

    case "pie":
      return {
        processed_data: [
          { label: "Category A", value: 30 },
          { label: "Category B", value: 25 },
          { label: "Category C", value: 20 },
          { label: "Category D", value: 15 },
          { label: "Category E", value: 10 },
        ],
      };

    case "histogram":
      return {
        processed_data: [
          { bin: "10-20", count: 5 },
          { bin: "20-30", count: 12 },
          { bin: "30-40", count: 18 },
          { bin: "40-50", count: 14 },
          { bin: "50-60", count: 8 },
          { bin: "60-70", count: 3 },
        ],
      };

    case "area":
      return {
        processed_data: [
          { date: "2024-01", value: 100, category: "Product A" },
          { date: "2024-02", value: 150, category: "Product A" },
          { date: "2024-03", value: 200, category: "Product A" },
          { date: "2024-04", value: 180, category: "Product A" },
          { date: "2024-05", value: 250, category: "Product A" },
        ],
      };

    case "treemap":
      return {
        processed_data: [
          { name: "Node A", value: 100, parent: "root" },
          { name: "Node B", value: 80, parent: "root" },
          { name: "Node C", value: 60, parent: "root" },
          { name: "Node D", value: 40, parent: "root" },
        ],
      };

    case "force_network":
      return {
        processed_data: {
          nodes: [
            { id: "A", group: 1 },
            { id: "B", group: 1 },
            { id: "C", group: 2 },
            { id: "D", group: 2 },
            { id: "E", group: 3 },
          ],
          links: [
            { source: "A", target: "B", value: 1 },
            { source: "B", target: "C", value: 1 },
            { source: "C", target: "D", value: 1 },
            { source: "D", target: "E", value: 1 },
            { source: "A", target: "E", value: 1 },
          ],
        },
      };

    case "sankey":
      return {
        processed_data: {
          nodes: [
            { name: "Source A" },
            { name: "Source B" },
            { name: "Process 1" },
            { name: "Process 2" },
            { name: "Output X" },
            { name: "Output Y" },
          ],
          links: [
            { source: 0, target: 2, value: 50 },
            { source: 1, target: 3, value: 40 },
            { source: 2, target: 4, value: 30 },
            { source: 3, target: 5, value: 35 },
          ],
        },
      };

    case "heatmap":
      return {
        processed_data: [
          { x: "A", y: "1", value: 10 },
          { x: "A", y: "2", value: 20 },
          { x: "A", y: "3", value: 15 },
          { x: "B", y: "1", value: 25 },
          { x: "B", y: "2", value: 30 },
          { x: "B", y: "3", value: 22 },
          { x: "C", y: "1", value: 18 },
          { x: "C", y: "2", value: 28 },
          { x: "C", y: "3", value: 32 },
        ],
      };

    case "choropleth":
      return {
        processed_data: [
          { region: "North", value: 100 },
          { region: "South", value: 85 },
          { region: "East", value: 120 },
          { region: "West", value: 95 },
        ],
      };

    case "boxplot":
      return {
        processed_data: [
          { category: "Group A", values: [10, 15, 20, 25, 30] },
          { category: "Group B", values: [12, 18, 22, 28, 35] },
          { category: "Group C", values: [8, 14, 19, 24, 32] },
        ],
      };

    case "violin":
      return {
        processed_data: [
          { category: "Group A", values: [10, 12, 15, 18, 20, 22, 25, 28, 30] },
          { category: "Group B", values: [12, 14, 18, 22, 25, 28, 32, 35, 38] },
          { category: "Group C", values: [8, 10, 14, 18, 20, 24, 28, 30, 32] },
        ],
      };

    case "bubble":
      return {
        processed_data: [
          { x: 10, y: 20, size: 100, category: "A" },
          { x: 20, y: 30, size: 150, category: "B" },
          { x: 30, y: 25, size: 200, category: "A" },
          { x: 40, y: 35, size: 120, category: "C" },
          { x: 50, y: 40, size: 180, category: "B" },
          { x: 60, y: 45, size: 220, category: "C" },
        ],
      };

    case "radar":
      return {
        processed_data: [
          { axis: "Speed", value: 85, category: "Product A" },
          { axis: "Reliability", value: 90, category: "Product A" },
          { axis: "Comfort", value: 75, category: "Product A" },
          { axis: "Safety", value: 95, category: "Product A" },
          { axis: "Efficiency", value: 80, category: "Product A" },
        ],
      };

    case "sunburst":
      return {
        processed_data: [
          { name: "root", parent: "", value: 0 },
          { name: "Category A", parent: "root", value: 100 },
          { name: "Category B", parent: "root", value: 80 },
          { name: "Item A1", parent: "Category A", value: 50 },
          { name: "Item A2", parent: "Category A", value: 50 },
          { name: "Item B1", parent: "Category B", value: 40 },
          { name: "Item B2", parent: "Category B", value: 40 },
        ],
      };

    case "waterfall":
      return {
        processed_data: [
          { category: "Start", value: 100, type: "total" },
          { category: "Increase", value: 30, type: "increase" },
          { category: "Decrease", value: -20, type: "decrease" },
          { category: "Adjustment", value: 15, type: "increase" },
          { category: "End", value: 125, type: "total" },
        ],
      };

    case "gantt":
      return {
        processed_data: [
          {
            task: "Task A",
            start: "2024-01-01",
            end: "2024-01-15",
            progress: 100,
          },
          {
            task: "Task B",
            start: "2024-01-10",
            end: "2024-01-25",
            progress: 75,
          },
          {
            task: "Task C",
            start: "2024-01-20",
            end: "2024-02-05",
            progress: 50,
          },
          {
            task: "Task D",
            start: "2024-02-01",
            end: "2024-02-15",
            progress: 25,
          },
        ],
      };

    default:
      return { processed_data: [] };
  }
};

const D3Chart = ({ sessionId, datasetId }: D3ChartProps) => {
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    let loadedRecommendations: Recommendation[] = [];

    // Try to load from localStorage using datasetId
    if (datasetId) {
      const localStorageKey = `recommendations_${datasetId}`;
      const storedRecommendations = localStorage.getItem(localStorageKey);
      if (storedRecommendations) {
        try {
          loadedRecommendations = JSON.parse(storedRecommendations);
        } catch (e) {
          console.error("Failed to parse localStorage recommendations:", e);
        }
      }
    }

    // Fall back to Redux state if localStorage is empty
    if (loadedRecommendations.length === 0 && sessionData?.recommendations) {
      loadedRecommendations = sessionData.recommendations;
    }

    setRecommendations(loadedRecommendations);

    // Set first recommendation as default
    if (loadedRecommendations.length > 0) {
      setSelectedChart(loadedRecommendations[0].chart_type);
    }
  }, [mounted, sessionData, datasetId]);

  const handleGenerateChart = useCallback(async () => {
    if (!selectedChart || !mounted) return;

    setIsLoading(true);

    // Small delay to simulate loading
    await new Promise((resolve) => setTimeout(resolve, 300));

    const dummyData = generateDummyData(selectedChart);
    setChartData(dummyData);
    setIsLoading(false);
  }, [selectedChart, mounted]);

  useEffect(() => {
    if (mounted && selectedChart) {
      handleGenerateChart();
    }
  }, [mounted, selectedChart, handleGenerateChart]);

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
      case "boxplot":
        return <BoxPlot data={chartData} />;
      case "violin":
        return <ViolinPlot data={chartData} />;
      case "bubble":
        return <BubbleChart data={chartData} />;
      case "radar":
        return <RadarChart data={chartData} />;
      case "sunburst":
        return <SunburstChart data={chartData} />;
      case "waterfall":
        return <WaterfallChart data={chartData} />;
      case "gantt":
        return <GanttChart data={chartData} />;
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

  const getChartConfidence = () => {
    const rec = recommendations.find((r) => r.chart_type === selectedChart);
    return rec ? Math.round(rec.confidence * 100) : 0;
  };

  if (!mounted) {
    return (
      <div className="rounded-xl bg-white px-6 py-12 shadow-md flex items-center justify-center">
        <p className="text-gray-600">Loading chart...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart Container with fixed height */}
      <div className="w-full flex flex-col items-center justify-center min-h-[300px]">
        {isLoading ? (
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
                Confidence: {getChartConfidence()}% • Demo Data
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
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

      {/* Controls */}
      <div className="relative mt-6 flex items-center justify-between gap-4">
        {/* Chart Type Dropdown */}
        <div className="relative ml-auto">
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
    </div>
  );
};

export default D3Chart;
