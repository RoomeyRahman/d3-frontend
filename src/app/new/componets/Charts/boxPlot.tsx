"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface BoxPlotProps {
  data: Array<{ category: string; values: number[] }>;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function BoxPlot({
  data,
  width = 800,
  height = 500,
  margin = { top: 20, right: 30, bottom: 30, left: 60 },
}: BoxPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate quartiles for each category
    const boxData = data.map((d) => {
      const sorted = [...d.values].sort((a, b) => a - b);
      const q1 = d3.quantile(sorted, 0.25) || 0;
      const median = d3.quantile(sorted, 0.5) || 0;
      const q3 = d3.quantile(sorted, 0.75) || 0;
      const iqr = q3 - q1;
      const min = Math.max(d3.min(sorted) || 0, q1 - 1.5 * iqr);
      const max = Math.min(d3.max(sorted) || 0, q3 + 1.5 * iqr);

      return {
        category: d.category,
        q1,
        median,
        q3,
        min,
        max,
        outliers: sorted.filter((v) => v < min || v > max),
      };
    });

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(boxData, (d) => d.min) || 0,
        d3.max(boxData, (d) => d.max) || 100,
      ])
      .range([innerHeight, 0]);

    const xScale = d3
      .scaleBand()
      .domain(boxData.map((d) => d.category))
      .range([0, innerWidth])
      .padding(0.4);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw whiskers
    g.selectAll(".whisker")
      .data(boxData)
      .enter()
      .append("line")
      .attr("class", "whisker")
      .attr(
        "x1",
        (d) => (xScale(d.category) || 0) + (xScale.bandwidth() || 0) / 2
      )
      .attr(
        "x2",
        (d) => (xScale(d.category) || 0) + (xScale.bandwidth() || 0) / 2
      )
      .attr("y1", (d) => yScale(d.max))
      .attr("y2", (d) => yScale(d.min))
      .attr("stroke", "#666")
      .attr("stroke-width", 2);

    // Draw boxes
    g.selectAll(".box")
      .data(boxData)
      .enter()
      .append("rect")
      .attr("class", "box")
      .attr(
        "x",
        (d) => (xScale(d.category) || 0) + (xScale.bandwidth() || 0) * 0.2
      )
      .attr("y", (d) => yScale(d.q3))
      .attr("width", (xScale.bandwidth() || 0) * 0.6)
      .attr("height", (d) => yScale(d.q1) - yScale(d.q3))
      .attr("fill", "#4f46e5")
      .attr("opacity", 0.7)
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5);

    // Draw median line
    g.selectAll(".median")
      .data(boxData)
      .enter()
      .append("line")
      .attr("class", "median")
      .attr(
        "x1",
        (d) => (xScale(d.category) || 0) + (xScale.bandwidth() || 0) * 0.2
      )
      .attr(
        "x2",
        (d) => (xScale(d.category) || 0) + (xScale.bandwidth() || 0) * 0.8
      )
      .attr("y1", (d) => yScale(d.median))
      .attr("y2", (d) => yScale(d.median))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Draw outliers
    g.selectAll(".outlier")
      .data(
        boxData.flatMap((d) =>
          d.outliers.map((v) => ({ category: d.category, value: v }))
        )
      )
      .enter()
      .append("circle")
      .attr("class", "outlier")
      .attr(
        "cx",
        (d) => (xScale(d.category) || 0) + (xScale.bandwidth() || 0) / 2
      )
      .attr("cy", (d) => yScale(d.value))
      .attr("r", 4)
      .attr("fill", "#ef4444")
      .attr("opacity", 0.7);

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
