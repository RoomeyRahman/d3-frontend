"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { addTooltips, ChartData, getColorScale } from "@/app/utils/chartUtils";

interface BarChartProps {
  data: ChartData;
}

// Solution 1: Use client-side only rendering with hydration check
const BarChart = ({ data }: BarChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || !isClient) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { processed_data, field_mappings, chart_config } = data;
    const { dimensions } = chart_config;
    const { width, height, margin } = dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Group data by x field and sum y values
    const groupedData = d3.rollup(
      processed_data,
      (v) => d3.sum(v, (d) => d[field_mappings.y]),
      (d) => d[field_mappings.x]
    );

    const chartData = Array.from(groupedData, ([key, value]) => ({
      [field_mappings.x]: key,
      [field_mappings.y]: value,
    }));

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(chartData.map((d) => d[field_mappings.x]))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => d[field_mappings.y]) || 0])
      .range([innerHeight, 0]);

    const colorScale = getColorScale(chart_config.color_scheme);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create bars
    const bars = g
      .selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d[field_mappings.x]) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", (d, i) => colorScale(i.toString()));

    // Animate bars
    bars
      .transition()
      .duration(750)
      .attr("y", (d) => yScale(d[field_mappings.y]))
      .attr("height", (d) => innerHeight - yScale(d[field_mappings.y]));

    // Add axes
    const xAxis = g
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "black")
      .style("font-size", "12px");

    xAxis.selectAll(".domain").style("stroke", "black");

    const yAxis = g
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "black")
      .style("font-size", "12px");

    yAxis.selectAll(".domain").style("stroke", "black");

    // Add tooltips
    addTooltips(bars, { ...data, processed_data: chartData });
  }, [data, isClient]);

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div
        style={{
          width: data?.chart_config?.dimensions?.width,
          height: data?.chart_config?.dimensions?.height,
        }}
        className="w-full h-auto flex items-center justify-center bg-gray-50"
      >
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={data.chart_config.dimensions.width}
      height={data.chart_config.dimensions.height}
      className="w-full"
    />
  );
};

export default BarChart;
