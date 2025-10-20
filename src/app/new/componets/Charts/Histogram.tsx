"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HistogramProps {
  data: {
    processed_data: Array<{ bin: string; count: number }>;
  };
}

export default function Histogram({ data }: HistogramProps) {
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
      .domain(data.processed_data.map((d) => d.bin))
      .range([0, width])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data.processed_data, (d) => d.count) || 0])
      .range([height, 0]);

    svg
      .selectAll(".bar")
      .data(data.processed_data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.bin) || 0)
      .attr("y", (d) => yScale(d.count))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.count))
      .attr("fill", "#f59e0b")
      .attr("opacity", 0.8)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1).attr("fill", "#d97706");
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.8).attr("fill", "#f59e0b");
      });

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
      .text("Bin");

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
      .text("Count");
  }, [data]);

  if (!data?.processed_data || data.processed_data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return <svg ref={svgRef} className="w-full"></svg>;
}
