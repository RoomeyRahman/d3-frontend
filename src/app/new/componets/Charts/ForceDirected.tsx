"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ForceDirectedProps {
  data: {
    processed_data: {
      nodes: Array<{ id: string; group: number }>;
      links: Array<{ source: string; target: string; value: number }>;
    };
  };
}

export default function ForceDirectedNetwork({ data }: ForceDirectedProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data?.processed_data?.nodes || !svgRef.current) return;

    const width = 800;
    const height = 400;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const nodes = data.processed_data.nodes.map((d) => ({ ...d }));
    const links = data.processed_data.links.map((d) => ({
      source: d.source,
      target: d.target,
      value: d.value,
    }));

    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links as any)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);

    const node = svg
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => `hsl(${d.group * 60}, 70%, 50%)`)
      .call(
        d3
          .drag<any, any>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    const text = svg
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "12")
      .text((d: any) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      text.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y + 20);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [data]);

  if (!data?.processed_data?.nodes) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  return (
    <svg
      ref={svgRef}
      className="w-full"
      style={{ border: "1px solid #e5e7eb" }}
    ></svg>
  );
}
