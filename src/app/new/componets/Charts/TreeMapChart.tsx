"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface TreemapChartProps {
  data: {
    processed_data: Array<{ name: string; value: number; parent?: string }>;
  };
}

export default function TreemapChart({ data }: TreemapChartProps) {
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
    const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const treemap = d3
      .treemap<any>()
      .size([width, height])
      .paddingTop(0)
      .paddingRight(2)
      .paddingBottom(2)
      .paddingLeft(2);

    const root = d3
      .hierarchy({ children: data.processed_data })
      .sum((d) => d.value);

    treemap(root);

    const cells = svg
      .selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    cells
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d, i) => COLORS[i % COLORS.length])
      .attr("opacity", 0.8)
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.8);
      });

    cells
      .append("text")
      .attr("x", 4)
      .attr("y", 20)
      .attr("font-size", "12")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .text((d) => d.data.name);

    cells
      .append("text")
      .attr("x", 4)
      .attr("y", 35)
      .attr("font-size", "10")
      .attr("fill", "white")
      .text((d) => d.data.value);
  }, [data]);

  if (!data?.processed_data || data.processed_data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return <svg ref={svgRef} className="w-full"></svg>;
}
