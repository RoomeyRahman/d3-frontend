"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress?: number;
}

interface GanttChartProps {
  data: GanttTask[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function GanttChart({
  data,
  width = 900,
  height = 400,
  margin = { top: 20, right: 30, bottom: 30, left: 150 },
}: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const minDate = d3.min(data, (d) => d.startDate) || new Date();
    const maxDate = d3.max(data, (d) => d.endDate) || new Date();

    const xScale = d3
      .scaleTime()
      .domain([minDate, maxDate])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.id))
      .range([0, innerHeight])
      .padding(0.2);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw task bars
    g.selectAll(".task")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "task")
      .attr("x", (d) => xScale(d.startDate))
      .attr("y", (d) => yScale(d.id) || 0)
      .attr("width", (d) => xScale(d.endDate) - xScale(d.startDate))
      .attr("height", yScale.bandwidth())
      .attr("fill", "#3b82f6")
      .attr("opacity", 0.8)
      .attr("stroke", "#1e40af")
      .attr("stroke-width", 1);

    // Draw progress bars
    g.selectAll(".progress")
      .data(data.filter((d) => d.progress !== undefined))
      .enter()
      .append("rect")
      .attr("class", "progress")
      .attr("x", (d) => xScale(d.startDate))
      .attr("y", (d) => (yScale(d.id) || 0) + yScale.bandwidth() * 0.25)
      .attr(
        "width",
        (d) =>
          ((xScale(d.endDate) - xScale(d.startDate)) * (d.progress || 0)) / 100
      )
      .attr("height", yScale.bandwidth() * 0.5)
      .attr("fill", "#10b981")
      .attr("opacity", 0.9);

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
