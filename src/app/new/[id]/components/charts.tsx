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

// Complete mapping of all 172 Observable HQ chart types
const CHART_TYPE_MAP: Record<string, string> = {
  // Bar Charts
  bar_chart: "bar",
  horizontal_bar_chart: "horizontal_bar",
  grouped_bar_chart: "grouped_bar",
  stacked_bar_chart: "stacked_bar",
  stacked_horizontal_bar_chart: "stacked_horizontal_bar",
  diverging_bar_chart: "diverging_bar",
  diverging_stacked_bar_chart: "diverging_stacked_bar",
  stacked_normalized_horizontal_bar: "normalized_stacked_bar",
  hierarchical_bar_chart: "hierarchical_bar",
  bar_chart_race: "bar_race",
  bar_chart_transitions: "bar_transitions",
  zoomable_bar_chart: "zoomable_bar",

  // Line Charts
  line_chart: "line",
  multi_line_chart: "multi_line",
  line_chart_missing_data: "line_missing",
  line_with_tooltip: "line_tooltip",
  variable_color_line: "variable_line",
  change_line_chart: "change_line",
  directly_labelling_lines: "labeled_line",

  // Area Charts
  area_chart: "area",
  area_chart_missing_data: "area_missing",
  stacked_area_chart: "stacked_area",
  normalized_stacked_area_chart: "normalized_area",
  streamgraph: "streamgraph",
  streamgraph_transitions: "streamgraph_animated",
  radial_area_chart: "radial_area",
  zoomable_area_chart: "zoomable_area",

  // Scatter & Dot Plots
  scatter_plot: "scatter",
  scatterplot_with_shapes: "scatter_shapes",
  brushable_scatterplot: "brushable_scatter",
  brushable_scatterplot_matrix: "scatter_matrix",
  scatterplot_tour: "scatter_tour",
  connected_scatterplot: "connected_scatter",
  dot_plot: "dot",
  beeswarm: "beeswarm",
  beeswarm_mirrored: "beeswarm_mirror",
  splom: "scatter_matrix_plot",

  // Pie & Radial Charts
  pie_chart: "pie",
  pie_chart_update: "pie_animated",
  donut_chart: "donut",
  radial_stacked_bar_chart: "radial_bar",
  radial_cluster: "radial_cluster",
  radial_tree: "radial_tree",

  // Histograms & Distributions
  histogram: "histogram",
  box_plot: "box",
  normal_quantile_plot: "qq_normal",
  q_q_plot: "qq",
  kernel_density_estimation: "kde",
  ridgeline_plot: "ridgeline",

  // Heatmaps & Matrix Visualizations
  heatmap: "heatmap",
  correlation_matrix: "heatmap",
  confusion_matrix: "heatmap",
  adjacency_matrix: "heatmap",
  matrix_plot: "heatmap",

  // Geographic & Maps
  world_map: "world_map",
  world_choropleth: "world_choropleth",
  choropleth: "choropleth",
  us_state_choropleth: "us_choropleth",
  bivariate_choropleth: "bivariate_choropleth",
  bubble_map: "bubble_map",
  spike_map: "spike_map",
  hexbin_map: "hexbin_map",
  non_contiguous_cartogram: "cartogram",

  treemap: "treemap",
  zoomable_treemap: "treemap",
  nested_treemap: "treemap",
  sunburst: "sunburst",
  icicle: "icicle",
  circle_packing: "circle_packing",
  cluster_dendrogram: "cluster_dendrogram",
  tidy_tree: "tidy_tree",
  radial_tidy_tree: "radial_tree",
  collapsible_tree: "collapsible_tree",

  force_directed: "force_network",
  network_diagram: "force_network",
  node_link_tree: "force_network",
  hierarchical_edge_bundling: "force_network",
};

const D3Chart = ({ sessionId }: D3ChartProps) => {
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );
  const [generateChart, { isLoading, error }] = useGenerateChartMutation();

  // Handle mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

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
      case "horizontal_bar":
      case "grouped_bar":
      case "stacked_bar":
      case "hierarchical_bar":
        return <BarChart data={chartData} />;

      case "scatter":
      case "scatter_shapes":
      case "brushable_scatter":
      case "connected_scatter":
      case "dot":
      case "beeswarm":
        return <ScatterPlot data={chartData} />;

      case "line":
      case "multi_line":
      case "variable_line":
      case "change_line":
      case "labeled_line":
        return <LineChart data={chartData} />;

      case "pie":
      case "donut":
      case "radial_bar":
        return <PieChart data={chartData} />;

      case "choropleth":
      case "world_choropleth":
      case "us_choropleth":
      case "bubble_map":
        return <ChoroplethMap data={chartData} />;

      case "histogram":
      case "box":
      case "kde":
        return <Histogram data={chartData} />;

      case "area":
      case "stacked_area":
      case "streamgraph":
        return <AreaChart data={chartData} />;

      case "treemap":
      case "sunburst":
      case "circle_packing":
        return <TreemapChart data={chartData} />;

      case "force_network":
        return <ForceDirectedNetwork data={chartData} />;

      case "sankey":
        return <SankeyDiagram data={chartData} />;

      case "heatmap":
        return <D3Heatmap data={chartData} />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-600 text-lg">
              {getChartTitle()} visualization
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Implementation in progress
            </p>
          </div>
        );
    }
  };

  const getChartTitle = () => {
    return selectedChart
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (!sessionData) {
    return (
      <div className=" rounded-lg px-5 py-10 w-full flex items-center justify-center">
        <p className="text-gray-600">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg px-5 py-10 w-full">
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center">
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
            <div className="text-center mt-4">
              <h3 className="text-lg font-semibold text-black">
                {getChartTitle()}
              </h3>
              <div className="flex justify-center mt-2 space-x-4 text-sm text-gray-600">
                <span>Interactive D3 Visualization</span>
                <span>•</span>
                <span>{chartData.processed_data?.length || 0} Data Points</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No data available for visualization</p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Failed to generate chart. Please try again.
        </div>
      )}

      {/* Chart Type Dropdown */}
      <div className="relative mt-5 flex items-center justify-end">
        <button
          className="px-3 py-1 text-sm flex items-center space-x-1 text-zinc-700 hover:bg-zinc-300 rounded-md disabled:opacity-50 transition-colors"
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
          <div className="absolute right-0 top-8 mt-1 bg-white border border-gray-300 rounded-md shadow-lg w-64 z-50 max-h-96 overflow-y-auto">
            {recommendations.map((rec) => (
              <button
                key={rec.chart_type}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  selectedChart === rec.chart_type ? "bg-gray-100" : ""
                }`}
                onClick={() => {
                  setSelectedChart(rec.chart_type);
                  setDropdownOpen(false);
                }}
              >
                <div>
                  <div className="font-medium text-black">
                    {rec.chart_type.replace(/_/g, " ").toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Confidence: {Math.round(rec.confidence * 100)}%
                  </div>
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
