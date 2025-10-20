"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HeatmapProps {
  data: {
    processed_data: Array<{ x: string; y: string; value: number }>;
  };
}

export default function D3Heatmap({ data }: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (
      !data?.processed_data ||
      data.processed_data.length === 0 ||
      !svgRef.current
    )
      return;

    const margin = { top: 20, right: 20, bottom: 20, left: 40 };
    const cellSize = 40;
    const width = 800;
    const height = 400;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xValues = Array.from(new Set(data.processed_data.map((d) => d.x)));
    const yValues = Array.from(new Set(data.processed_data.map((d) => d.y)));

    const values = data.processed_data.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([minValue, maxValue])
      .range(["#0891b2", "#ef4444"]);

    // Draw cells
    svg
      .selectAll(".cell")
      .data(data.processed_data)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (d) => xValues.indexOf(d.x) * cellSize)
      .attr("y", (d) => yValues.indexOf(d.y) * cellSize)
      .attr("width", cellSize - 2)
      .attr("height", cellSize - 2)
      .attr("fill", (d) => colorScale(d.value))
      .attr("opacity", 0.8)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.8);
      });

    // Add text labels
    svg
      .selectAll(".text")
      .data(data.processed_data)
      .enter()
      .append("text")
      .attr("class", "text")
      .attr("x", (d) => xValues.indexOf(d.x) * cellSize + cellSize / 2)
      .attr("y", (d) => yValues.indexOf(d.y) * cellSize + cellSize / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .text((d) => d.value);

    // X axis labels
    svg
      .selectAll(".x-label")
      .data(xValues)
      .enter()
      .append("text")
      .attr("class", "x-label")
      .attr("x", (d, i) => i * cellSize + cellSize / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12")
      .text((d) => d);

    // Y axis labels
    svg
      .selectAll(".y-label")
      .data(yValues)
      .enter()
      .append("text")
      .attr("class", "y-label")
      .attr("x", -5)
      .attr("y", (d, i) => i * cellSize + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12")
      .text((d) => d);
  }, [data]);

  if (!data?.processed_data || data.processed_data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return <svg ref={svgRef} className="w-full"></svg>;
}
