"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface RadarChartProps {
  data: Array<{ axis: string; value: number }>;
  width?: number;
  height?: number;
}

export default function RadarChart({
  data,
  width = 500,
  height = 500,
}: RadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const radius = Math.min(width, height) / 2 - 40;
    const angleSlice = (Math.PI * 2) / data.length;

    const rScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 100])
      .range([0, radius]);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Draw concentric circles
    for (let i = 1; i <= 5; i++) {
      g.append("circle")
        .attr("r", (radius / 5) * i)
        .attr("fill", "none")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1);
    }

    // Draw axes
    g.selectAll(".axis")
      .data(data)
      .enter()
      .append("line")
      .attr("class", "axis")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr(
        "x2",
        (d, i) =>
          rScale(d3.max(data, (d) => d.value) || 100) *
          Math.cos(angleSlice * i - Math.PI / 2)
      )
      .attr(
        "y2",
        (d, i) =>
          rScale(d3.max(data, (d) => d.value) || 100) *
          Math.sin(angleSlice * i - Math.PI / 2)
      )
      .attr("stroke", "#999")
      .attr("stroke-width", 1);

    // Draw data polygon
    const radarLine = d3
      .lineRadial<(typeof data)[0]>()
      .angle((d, i) => angleSlice * i)
      .radius((d) => rScale(d.value));

    g.append("path")
      .datum(data)
      .attr("d", radarLine)
      .attr("fill", "#4f46e5")
      .attr("opacity", 0.3)
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", 2)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

    // Draw data points
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr(
        "cx",
        (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2)
      )
      .attr(
        "cy",
        (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2)
      )
      .attr("r", 4)
      .attr("fill", "#4f46e5")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Draw labels
    g.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr(
        "x",
        (d, i) =>
          (rScale(d3.max(data, (d) => d.value) || 100) + 30) *
          Math.cos(angleSlice * i - Math.PI / 2)
      )
      .attr(
        "y",
        (d, i) =>
          (rScale(d3.max(data, (d) => d.value) || 100) + 30) *
          Math.sin(angleSlice * i - Math.PI / 2)
      )
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#333")
      .text((d) => d.axis);
  }, [data, width, height]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ border: "1px solid #e5e7eb" }}
    />
  );
}
