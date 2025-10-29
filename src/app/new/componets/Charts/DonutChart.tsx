"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface DonutChartProps {
  data: any[];
  labelField?: string;
  valueField?: string;
  width?: number | string;
  height?: number;
}

export default function DonutChart({
  data,
  labelField = "label",
  valueField = "value",
  width = "100%",
  height = 420,
}: DonutChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const bounding = wrapperRef.current.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(300, Math.floor(bounding?.width ?? 600));
    const H = height;
    
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${W / 2},${H / 2})`);
    
    const chartData = data.map((d) => ({ 
      label: String(d[labelField]), 
      value: +d[valueField] || 0 
    }));
    
    const radius = Math.min(W, H) / 2 - 10;
    const pie = d3.pie<any>().value((d) => d.value);
    const arc = d3.arc<any>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);

    const arcs = g
      .selectAll(".arc")
      .data(pie(chartData))
      .enter()
      .append("g")
      .attr("class", "arc");
    
    arcs
      .append("path")
      .attr("d", arc as any)
      .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
      .attr("stroke", "white")
      .attr("stroke-width", 2);
    
    arcs
      .append("text")
      .attr("transform", (d) => `translate(${(arc.centroid as any)(d)})`)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.label)
      .style("font-size", "10px")
      .style("fill", "white");
  }, [data, labelField, valueField, width, height]);

  return (
    <div ref={wrapperRef} className="bg-white rounded shadow p-4">
      <svg ref={svgRef} width={typeof width === "number" ? width : "100%"} height={height} />
    </div>
  );
}
