import React from "react";
import * as d3 from "d3";
import { useAppSelector } from "@/lib/hooks";
import { inferFieldsFromValues, normalizeChartData, toNodesFromValues } from "@/app/utils/dataConverters";

// Import individual chart components
import BarChart from "../../componets/Charts/BarChart";
import LineChart from "../../componets/Charts/LineChart";
import ScatterPlot from "../../componets/Charts/ScatterPlot";
import Histogram from "../../componets/Charts/Histogram";
import PieChart from "../../componets/Charts/PieChart";
import DonutChart from "../../componets/Charts/DonutChart";
import AreaChart from "../../componets/Charts/AreaChart";
import HeatmapChart from "../../componets/Charts/HeatmapChart";
import ForceDirectedGraph from "../../componets/Charts/ForceDirectedGraph";
import DensityPlot from "../../componets/Charts/DensityPlot";
import Sunburst from "../../componets/Charts/Sunburst";

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

  if (!chartData?.data || !chartData?.chartType) {
    return null;
  }

  const { data, chartType } = chartData;
  const normalized = normalizeChartData(data);
  const { values, nodes, links } = normalized;

  // Infer fields if we have values
  let inferred = null;
  let chosenX: string | undefined;
  let chosenY: string | undefined;
  let chosenLabel: string | undefined;
  let chosenValue: string | undefined;

  if (values && values.length > 0) {
    inferred = inferFieldsFromValues(values);
    chosenY = inferred.numeric[0] ?? undefined;
    chosenX = inferred.categorical[0] ?? inferred.date[0] ?? inferred.keys[0] ?? undefined;
    chosenLabel = inferred.categorical[0] ?? inferred.keys[0] ?? undefined;
    chosenValue = inferred.numeric[0] ?? inferred.keys[0] ?? undefined;
  }

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        if (!values || !chosenX || !chosenY) {
          return <div className="p-4 text-red-600">Bar chart requires categorical X and numeric Y fields.</div>;
        }
        return (
          <BarChart
            data={{
              processed_data: values,
              field_mappings: { x: chosenX, y: chosenY },
              chart_config: {
                dimensions: {
                  width: 800,
                  height: 420,
                  margin: { top: 20, right: 16, bottom: 50, left: 56 },
                },
              },
            }}
          />
        );

      case "line":
        if (!values || !chosenY) {
          return <div className="p-4 text-red-600">Line chart requires a numeric Y field.</div>;
        }
        return <LineChart data={values} xKey={chosenX} yKey={chosenY} />;

      case "scatter":
        if (!values || !inferred || inferred.numeric.length < 2) {
          return <div className="p-4 text-red-600">Scatter requires two numeric fields.</div>;
        }
        return (
          <ScatterPlot
            data={{
              processed_data: values,
              field_mappings: { x: inferred.numeric[0], y: inferred.numeric[1] },
              chart_config: {
                dimensions: {
                  width: 800,
                  height: 420,
                  margin: { top: 20, right: 20, bottom: 40, left: 56 },
                },
              },
            }}
          />
        );

      case "histogram":
        if (!values || !chosenY) {
          return <div className="p-4 text-red-600">Histogram requires at least one numeric field.</div>;
        }
        const numericValues = values.map(v => +v[chosenY]).filter(n => !Number.isNaN(n));
        const bins = d3.bin().thresholds(20)(numericValues);
        const histogramData = bins.map(bin => ({
          x0: bin.x0 ?? 0,
          x1: bin.x1 ?? 0,
          count: bin.length,
          width: (bin.x1 ?? 0) - (bin.x0 ?? 0),
          density: bin.length / numericValues.length,
        }));
        return (
          <Histogram
            data={{
              processed_data: histogramData,
              chart_config: {
                dimensions: {
                  width: 800,
                  height: 420,
                  margin: { top: 20, right: 20, bottom: 40, left: 56 },
                },
              },
            }}
          />
        );

      case "pie":
        if (!values || !chosenLabel || !chosenValue) {
          return <div className="p-4 text-red-600">Pie requires a label (categorical) and a value (numeric).</div>;
        }
        const total = d3.sum(values, v => +v[chosenValue]);
        const pieData = values.map(v => ({
          name: String(v[chosenLabel]),
          value: +v[chosenValue],
          percentage: (+v[chosenValue] / total) * 100,
        }));
        return (
          <PieChart
            data={{
              processed_data: pieData,
              field_mappings: { label: chosenLabel, value: chosenValue },
              chart_config: {
                dimensions: {
                  width: 600,
                  height: 420,
                },
              },
            }}
          />
        );

      case "donut":
        if (!values || !chosenLabel || !chosenValue) {
          return <div className="p-4 text-red-600">Donut requires a label (categorical) and a value (numeric).</div>;
        }
        return <DonutChart data={values} labelField={chosenLabel} valueField={chosenValue} />;

      case "area":
        if (!values || !chosenY) {
          return <div className="p-4 text-red-600">Area chart requires a numeric Y field.</div>;
        }
        return (
          <AreaChart
            data={{
              processed_data: values,
              field_mappings: { x: chosenX ?? "index", y: chosenY },
              chart_config: {
                dimensions: {
                  width: 800,
                  height: 420,
                  margin: { top: 20, right: 20, bottom: 40, left: 56 },
                },
              },
            }}
          />
        );

      case "heatmap":
        return <HeatmapChart data={data} />;

      case "forceDirectedGraph":
        const graphNodes = nodes && nodes.length > 0 ? nodes : values ? toNodesFromValues(values) : [];
        if (graphNodes.length === 0) {
          return <div className="p-4 text-red-600">Force-directed graph requires nodes data.</div>;
        }
        return (
          <ForceDirectedGraph
            data={{
              type: "graph",
              nodes: graphNodes.map((n, i) => ({ ...n, group: n.group ?? i % 10 })),
              links: (links ?? []).map(l => ({ ...l, value: l.value ?? 1 })),
            }}
          />
        );

      case "densityPlot":
        return <DensityPlot data={values ?? []} nodes={nodes} links={links} />;

      case "sunburst":
        // Extract hierarchical data
        let hierarchicalData = null;
        for (const key in data) {
          if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object' && data[key][0] !== null) {
            hierarchicalData = data[key][0];
            break;
          }
        }
        if (!hierarchicalData) {
          return <div className="p-4 text-red-600">Sunburst requires hierarchical data.</div>;
        }
        return <Sunburst data={hierarchicalData} />;

      default:
        return <div className="p-4 text-gray-600">Chart type &quot;{chartType}&quot; not supported.</div>;
    }
  };

  return (
    <div className="bg-white rounded shadow p-4">
      {renderChart()}
      <div className="mt-2 text-xs text-gray-600">
        Chart Type: <span className="font-medium">{chartType}</span>
      </div>
    </div>
  );
};

export default Charts;

