"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
}

interface SunburstChartProps {
  data: SunburstNode;
  width?: number;
  height?: number;
}

export default function SunburstChart({
  data,
  width = 600,
  height = 600,
}: SunburstChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const radius = Math.min(width, height) / 2 - 10;

    const hierarchy = d3.hierarchy(data).sum((d) => d.value || 1);

    const partition = d3.partition<SunburstNode>().size([2 * Math.PI, radius]);

    const root = partition(hierarchy);

    const arc = d3
      .arc<d3.HierarchyRectangularNode<SunburstNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    g.selectAll("path")
      .data(root.descendants())
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => colorScale(d.data.name))
      .attr("opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    g.selectAll("text")
      .data(root.descendants().filter((d) => d.depth > 0 && d.depth < 3))
      .enter()
      .append("text")
      .attr("transform", (d) => {
        const x = ((d.x0 + d.x1) / 2) * (180 / Math.PI) - 90;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x}) translate(${y},0)`;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#fff")
      .text((d) => d.data.name);
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
