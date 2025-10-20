"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ViolinPlotProps {
  data: Array<{ category: string; values: number[] }>;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function ViolinPlot({
  data,
  width = 800,
  height = 500,
  margin = { top: 20, right: 30, bottom: 30, left: 60 },
}: ViolinPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const allValues = data.flatMap((d) => d.values);
    const yScale = d3
      .scaleLinear()
      .domain([d3.min(allValues) || 0, d3.max(allValues) || 100])
      .range([innerHeight, 0]);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.category))
      .range([0, innerWidth])
      .padding(0.4);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create density estimation for each category
    data.forEach((d) => {
      const sorted = [...d.values].sort((a, b) => a - b);
      const bandwidth =
        1.06 * d3.deviation(sorted)! * Math.pow(sorted.length, -0.2);

      const densityData: Array<[number, number]> = [];
      for (
        let i = d3.min(sorted)!;
        i <= d3.max(sorted)!;
        i += (d3.max(sorted)! - d3.min(sorted)!) / 50
      ) {
        let density = 0;
        sorted.forEach((v) => {
          density +=
            Math.exp(-0.5 * Math.pow((i - v) / bandwidth, 2)) /
            (bandwidth * Math.sqrt(2 * Math.PI));
        });
        densityData.push([i, density / sorted.length]);
      }

      const densityScale = d3
        .scaleLinear()
        .domain([0, d3.max(densityData, (d) => d[1]) || 1])
        .range([0, (xScale.bandwidth() || 0) / 2]);

      const line = d3
        .line<[number, number]>()
        .x((d) => yScale(d[0]))
        .y((d) => densityScale(d[1]));

      const xPos = (xScale(d.category) || 0) + (xScale.bandwidth() || 0) / 2;

      // Draw violin shape
      g.append("path")
        .datum(densityData)
        .attr("d", line)
        .attr("transform", `translate(${xPos},0)`)
        .attr("fill", "#8b5cf6")
        .attr("opacity", 0.6)
        .attr("stroke", "#6d28d9")
        .attr("stroke-width", 1.5);

      // Mirror the path
      g.append("path")
        .datum(densityData)
        .attr("d", line)
        .attr("transform", `translate(${xPos},0) scale(-1,1)`)
        .attr("fill", "#8b5cf6")
        .attr("opacity", 0.6)
        .attr("stroke", "#6d28d9")
        .attr("stroke-width", 1.5);
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
