"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface AreaChartProps {
  data: {
    processed_data: Array<{ date: string; value: number; category?: string }>;
  };
}

export default function AreaChart({ data }: AreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (
      !data?.processed_data ||
      data.processed_data.length === 0 ||
      !svgRef.current
    )
      return;

    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(data.processed_data.map((d) => d.date))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data.processed_data, (d) => d.value) || 0])
      .range([height, 0]);

    const area = d3
      .area<(typeof data.processed_data)[0]>()
      .x((d) => xScale(d.date)! + xScale.bandwidth() / 2)
      .y0(height)
      .y1((d) => yScale(d.value));

    svg
      .append("path")
      .datum(data.processed_data)
      .attr("fill", "#06b6d4")
      .attr("opacity", 0.6)
      .attr("d", area);

    // Line on top of area
    const line = d3
      .line<(typeof data.processed_data)[0]>()
      .x((d) => xScale(d.date)! + xScale.bandwidth() / 2)
      .y((d) => yScale(d.value));

    svg
      .append("path")
      .datum(data.processed_data)
      .attr("fill", "none")
      .attr("stroke", "#0891b2")
      .attr("stroke-width", 2)
      .attr("d", line);

    // X Axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Date");

    // Y Axis
    svg
      .append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .attr("fill", "black")
      .text("Value");
  }, [data]);

  if (!data?.processed_data || data.processed_data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return <svg ref={svgRef} className="w-full"></svg>;
}
