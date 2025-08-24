"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

// Define proper TypeScript interfaces
interface TreemapNode {
  name: string;
  value?: number;
  node_type?: string;
  level?: number;
  children_count?: number;
  children?: TreemapNode[];
}

interface TreemapData {
  processed_data: TreemapNode;
}

interface TreemapChartProps {
  data: TreemapData;
}

interface D3HierarchyNode extends d3.HierarchyNode<TreemapNode> {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const TreemapChart: React.FC<TreemapChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreemapNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      setDimensions({
        width: Math.min(containerWidth, 1000),
        height: 600,
      });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!data?.processed_data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    try {
      // Create hierarchy and treemap layout
      const root = d3
        .hierarchy<TreemapNode>(data.processed_data)
        .sum((d) => (d.children ? 0 : d.value || 1))
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      const treemap = d3
        .treemap<TreemapNode>()
        .size([innerWidth, innerHeight])
        .padding(2)
        .round(true);

      const treemapRoot = treemap(root) as D3HierarchyNode;

      // Get all node types for color scale
      const nodeTypes = Array.from(
        new Set(
          root
            .leaves()
            .map((d) => d.data.node_type || d.parent?.data.name || "default")
        )
      );

      // Color scale
      const colorScale = d3
        .scaleOrdinal<string>()
        .domain(nodeTypes)
        .range(d3.schemeSet3);

      // Create tooltip div
      let tooltip = d3
        .select("body")
        .select<HTMLDivElement>(".treemap-tooltip");
      if (tooltip.empty()) {
        tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "treemap-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.9)")
          .style("color", "white")
          .style("padding", "12px")
          .style("border-radius", "8px")
          .style("font-size", "13px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
          .style("opacity", 0);
      }

      // Create nodes
      const leaves = treemapRoot.leaves() as D3HierarchyNode[];

      const cell = g
        .selectAll<SVGGElement, D3HierarchyNode>("g")
        .data(leaves)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

      // Add rectangles
      cell
        .append("rect")
        .attr("width", (d) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d) => Math.max(0, d.y1 - d.y0))
        .attr("fill", (d) =>
          colorScale(d.data.node_type || d.parent?.data.name || "default")
        )
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .style("opacity", 0)
        .on("mouseover", function (event: MouseEvent, d: D3HierarchyNode) {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .attr("stroke-width", 3)
            .attr("stroke", "#333");

          tooltip.transition().duration(200).style("opacity", 1);

          tooltip
            .html(
              `
              <div style="font-weight: bold; margin-bottom: 6px;">${
                d.data.name
              }</div>
              <div>Value: ${d.value || "N/A"}</div>
              <div>Type: ${d.data.node_type || "N/A"}</div>
              <div>Level: ${d.data.level || d.depth}</div>
              ${
                d.data.children_count
                  ? `<div>Children: ${d.data.children_count}</div>`
                  : ""
              }
            `
            )
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 15 + "px");
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .style("opacity", 0.8)
            .attr("stroke-width", 1)
            .attr("stroke", "#fff");

          tooltip.transition().duration(200).style("opacity", 0);
        })
        .on("click", function (event: MouseEvent, d: D3HierarchyNode) {
          setSelectedNode(d.data);
          event.stopPropagation();
        })
        .transition()
        .duration(750)
        .style("opacity", 0.8);

      // Add text labels
      cell
        .append("text")
        .style("font-size", (d) => {
          const width = d.x1 - d.x0;
          const height = d.y1 - d.y0;
          const area = width * height;
          return (
            Math.min(width / 8, height / 4, Math.sqrt(area) / 12, 16) + "px"
          );
        })
        .style("fill", "#333")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("opacity", 0)
        .attr("x", (d) => (d.x1 - d.x0) / 2)
        .attr("y", (d) => (d.y1 - d.y0) / 2)
        .text((d) => {
          const width = d.x1 - d.x0;
          const height = d.y1 - d.y0;
          const name = d.data.name;

          if (width < 40 || height < 25) return "";
          if (width < 80)
            return name.length > 10 ? name.substring(0, 8) + "..." : name;
          return name;
        })
        .transition()
        .delay(500)
        .duration(500)
        .style("opacity", 1);

      // Clear selection on svg click
      svg.on("click", () => setSelectedNode(null));
    } catch (error) {
      console.error("Error rendering treemap:", error);
    }

    // Cleanup tooltip on unmount
    return () => {
      d3.select("body").select<HTMLDivElement>(".treemap-tooltip").remove();
    };
  }, [data, dimensions]);

  if (!data?.processed_data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div>No hierarchical data available for treemap visualization</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="treemap-container w-full"
      style={{ position: "relative" }}
    >
      <svg ref={svgRef} className="w-full" />

      {selectedNode && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs z-10">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">
              Node Details
            </h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 ml-2 text-lg leading-none"
              type="button"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Name:</span> {selectedNode.name}
            </div>
            <div>
              <span className="font-medium">Type:</span>{" "}
              {selectedNode.node_type || "N/A"}
            </div>
            <div>
              <span className="font-medium">Value:</span>{" "}
              {selectedNode.value || "N/A"}
            </div>
            <div>
              <span className="font-medium">Level:</span>{" "}
              {selectedNode.level || "N/A"}
            </div>
            {selectedNode.children_count && (
              <div>
                <span className="font-medium">Children:</span>{" "}
                {selectedNode.children_count}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreemapChart;
