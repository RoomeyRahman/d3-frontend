"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface WaterfallChartProps {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function WaterfallChart({
  data,
  width = 800,
  height = 500,
  margin = { top: 20, right: 30, bottom: 30, left: 60 },
}: WaterfallChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate cumulative values
    let cumulative = 0;
    const processedData = data.map((d) => {
      const start = cumulative;
      cumulative += d.value;
      return { ...d, start, end: cumulative };
    });

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, (d) => d.end) || 100])
      .range([innerHeight, 0]);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.3);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw bars
    g.selectAll(".bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.label) || 0)
      .attr("y", (d) => yScale(d.end))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => yScale(d.start) - yScale(d.end))
      .attr("fill", (d) => (d.value >= 0 ? "#10b981" : "#ef4444"))
      .attr("opacity", 0.8)
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    // Draw connector lines
    g.selectAll(".connector")
      .data(processedData.slice(0, -1))
      .enter()
      .append("line")
      .attr("class", "connector")
      .attr("x1", (d) => (xScale(d.label) || 0) + (xScale.bandwidth() || 0))
      .attr("x2", (d, i) => xScale(processedData[i + 1].label) || 0)
      .attr("y1", (d) => yScale(d.end))
      .attr("y2", (d) => yScale(d.end))
      .attr("stroke", "#999")
      .attr("stroke-dasharray", "4")
      .attr("stroke-width", 1);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .attr("color", "#666");

    // Y axis
    g.append("g").call(d3.axisLeft(yScale)).attr("color", "#666");
  }, [data, width, height, margin]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: "1px solid #e5e7eb" }}
    />
  );
}
