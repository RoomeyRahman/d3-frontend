"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface LineChartProps {
  data: {
    processed_data: Array<{
      month?: string;
      date?: string;
      value: number;
      category?: string;
    }>;
  };
}

export default function LineChart({ data }: LineChartProps) {
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

    const xKey = data.processed_data[0]?.month ? "month" : "date";

    const xScale = d3
      .scaleBand()
      .domain(
        data.processed_data.map((d) => d[xKey as keyof typeof d] as string)
      )
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data.processed_data, (d) => d.value) || 0])
      .range([height, 0]);

    const line = d3
      .line<(typeof data.processed_data)[0]>()
      .x(
        (d) =>
          xScale(d[xKey as keyof typeof d] as string)! + xScale.bandwidth() / 2
      )
      .y((d) => yScale(d.value));

    svg
      .append("path")
      .datum(data.processed_data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
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
      .text("Time");

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
