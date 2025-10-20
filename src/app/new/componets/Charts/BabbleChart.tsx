"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface BubbleChartProps {
  data: Array<{ x: number; y: number; size: number; category?: string }>;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function BubbleChart({
  data,
  width = 800,
  height = 500,
  margin = { top: 20, right: 30, bottom: 30, left: 60 },
}: BubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.x) || 0, d3.max(data, (d) => d.x) || 100])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.y) || 0, d3.max(data, (d) => d.y) || 100])
      .range([innerHeight, 0]);

    const sizeScale = d3
      .scaleSqrt()
      .domain([
        d3.min(data, (d) => d.size) || 1,
        d3.max(data, (d) => d.size) || 100,
      ])
      .range([5, 30]);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw bubbles
    g.selectAll(".bubble")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", (d) => sizeScale(d.size))
      .attr("fill", (d) => colorScale(d.category || "default"))
      .attr("opacity", 0.6)
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1).attr("stroke-width", 2.5);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.6).attr("stroke-width", 1.5);
      });

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
