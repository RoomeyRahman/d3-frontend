"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface PieChartProps {
  data: {
    processed_data: Array<{ label: string; value: number }>;
  };
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function PieChart({ data }: PieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (
      !data?.processed_data ||
      data.processed_data.length === 0 ||
      !svgRef.current
    )
      return;

    const width = 800;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<(typeof data.processed_data)[0]>().value((d) => d.value);
    const arc = d3
      .arc<d3.PieArcDatum<(typeof data.processed_data)[0]>>()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = svg
      .selectAll(".arc")
      .data(pie(data.processed_data))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => COLORS[i % COLORS.length])
      .attr("opacity", 0.8)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.8);
      });

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("font-size", "12")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .text((d) => `${d.data.label}: ${d.data.value}`);
  }, [data]);

  if (!data?.processed_data || data.processed_data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return <svg ref={svgRef} className="w-full"></svg>;
}
