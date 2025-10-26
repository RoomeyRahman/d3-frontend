"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

interface Node {
  id: string;
  group: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface NetworkData {
  type: string;
  nodes: Node[];
  links: Link[];
}

interface TreemapProps {
  data: NetworkData;
  width?: number;
  height?: number;
}

export default function TreemapChart({ data, width = 800, height = 600 }: TreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    // Convert network data to hierarchical structure
    const hierarchyData = convertToHierarchy(data);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create a container group for zoom/pan
    const container = svg.append("g");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const root = d3
      .hierarchy(hierarchyData)
      .sum((d: any) => d.value || 1)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<any>()
      .size([width, height])
      .padding(2)
      .round(true)(root);

    const cell = container
      .selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    cell
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => color(d.data.group?.toString() || "0"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 0.7);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("opacity", 1);
      });

    cell
      .append("text")
      .attr("x", 4)
      .attr("y", 16)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .style("pointer-events", "none")
      .text((d) => d.data.name);

    cell
      .append("text")
      .attr("x", 4)
      .attr("y", 30)
      .style("font-size", "10px")
      .style("fill", "#fff")
      .style("opacity", 0.8)
      .style("pointer-events", "none")
      .text((d) => `Value: ${d.value}`);

    // Add title
    container
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Network Treemap");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Add zoom controls overlay
    const controls = svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 50}, 10)`);

    // Zoom in button
    const zoomInBtn = controls.append("g")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      });

    zoomInBtn.append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    zoomInBtn.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 20)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("+");

    // Zoom out button
    const zoomOutBtn = controls.append("g")
      .attr("transform", "translate(0, 35)")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      });

    zoomOutBtn.append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    zoomOutBtn.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 20)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("−");

    // Reset button
    const resetBtn = controls.append("g")
      .attr("transform", "translate(0, 70)")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });

    resetBtn.append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    resetBtn.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("fill", "#333")
      .text("⟲");

  }, [data, width, height]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg ref={svgRef} width={width} height={height} style={{ border: '1px solid #ddd', background: "#f5f5f5" }}></svg>
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        background: 'rgba(255,255,255,0.9)',
        padding: '8px 12px',
        borderRadius: 4,
        fontSize: 12,
        border: '1px solid #ddd'
      }}>
        <strong>Controls:</strong> Scroll to zoom | Drag to pan | Click rectangles for details
      </div>
    </div>
  );
}

// Convert network data to hierarchical structure
function convertToHierarchy(data: NetworkData) {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, { ...n, children: [] as any[] }]));

  // Find nodes with incoming links and their connection strength
  const incomingLinks = new Map<string, { source: string; value: number }[]>();
  
  data.links.forEach((link) => {
    if (!incomingLinks.has(link.target)) {
      incomingLinks.set(link.target, []);
    }
    incomingLinks.get(link.target)!.push({ source: link.source, value: link.value });
  });

  // Find the root (node with most outgoing connections or first node)
  const outgoingCount = new Map<string, number>();
  data.links.forEach((link) => {
    outgoingCount.set(link.source, (outgoingCount.get(link.source) || 0) + 1);
  });

  let rootId = data.nodes[0].id;
  let maxOutgoing = 0;
  outgoingCount.forEach((count, id) => {
    if (count > maxOutgoing) {
      maxOutgoing = count;
      rootId = id;
    }
  });

  const root = nodeMap.get(rootId);
  const visited = new Set<string>([rootId]);

  // Build hierarchy from links
  function buildChildren(parentId: string) {
    const children: any[] = [];
    data.links.forEach((link) => {
      if (link.source === parentId && !visited.has(link.target)) {
        visited.add(link.target);
        const childNode = nodeMap.get(link.target);
        if (childNode) {
          const child = {
            name: childNode.id,
            group: childNode.group,
            value: link.value,
            children: buildChildren(link.target),
          };
          children.push(child);
        }
      }
    });
    return children;
  }

  return {
    name: root!.id,
    group: root!.group,
    children: buildChildren(rootId),
  };
}