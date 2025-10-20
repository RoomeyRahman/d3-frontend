"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

interface SankeyDiagramProps {
  data: {
    processed_data: {
      nodes: Array<{ name: string }>;
      links: Array<{ source: number; target: number; value: number }>;
    };
  };
}

export default function SankeyDiagram({ data }: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data?.processed_data?.nodes || !svgRef.current) return;

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 160, bottom: 20, left: 20 };

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const sankeyGenerator = sankey<any, any>()
      .nodeWidth(15)
      .nodePadding(50)
      .extent([
        [0, 0],
        [
          width - margin.left - margin.right,
          height - margin.top - margin.bottom,
        ],
      ]);

    const graph = sankeyGenerator({
      nodes: data.processed_data.nodes.map((d) => ({ ...d })),
      links: data.processed_data.links.map((d) => ({ ...d })),
    });

    // Draw links
    svg
      .selectAll(".link")
      .data(graph.links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", sankeyLinkHorizontal() as any)
      .attr("stroke", "#d084d0")
      .attr("stroke-opacity", 0.5)
      .attr("fill", "none")
      .attr("stroke-width", (d: any) => Math.max(1, d.width));

    // Draw nodes
    svg
      .selectAll(".node")
      .data(graph.nodes)
      .enter()
      .append("rect")
      .attr("class", "node")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", "#8884d8")
      .attr("opacity", 0.8);

    // Draw labels
    svg
      .selectAll(".label")
      .data(graph.nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d: any) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d: any) => (d.y1 + d.y0) / 2)
      .attr("text-anchor", (d: any) => (d.x0 < width / 2 ? "start" : "end"))
      .attr("font-size", "12")
      .text((d: any) => d.name);
  }, [data]);

  if (!data?.processed_data?.nodes || data.processed_data.nodes.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return <svg ref={svgRef} className="w-full"></svg>;
}
