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

interface ArcDiagramProps {
  data: NetworkData;
  width?: number;
  height?: number;
}

export default function ArcDiagram({ data, width = 800, height = 600 }: ArcDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 80, right: 100, bottom: 80, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create container for zoom/pan
    const container = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Sort nodes for consistent positioning
    const sortedNodes = data.nodes.slice().sort((a, b) => a.id.localeCompare(b.id));

    // Create node positions along the bottom
    const nodePositions = new Map<string, { x: number; y: number }>();
    const nodeSpacing = innerWidth / (sortedNodes.length - 1 || 1);

    sortedNodes.forEach((node, i) => {
      nodePositions.set(node.id, {
        x: i * nodeSpacing,
        y: innerHeight
      });
    });

    // Draw nodes
    const nodeGroup = container.append("g");
    nodeGroup.selectAll("circle")
      .data(sortedNodes)
      .enter()
      .append("circle")
      .attr("cx", d => nodePositions.get(d.id)!.x)
      .attr("cy", d => nodePositions.get(d.id)!.y)
      .attr("r", 8)
      .attr("fill", d => color(d.group.toString()))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 12);

        // Show tooltip
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.id}</strong><br/>Group: ${d.group}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 8);

        tooltip.style("opacity", 0);
      });

    // Draw node labels
    nodeGroup.selectAll("text")
      .data(sortedNodes)
      .enter()
      .append("text")
      .attr("x", d => nodePositions.get(d.id)!.x)
      .attr("y", d => nodePositions.get(d.id)!.y + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#333")
      .text(d => d.id);

    // Draw arcs for links
    const linkGroup = container.append("g");
    linkGroup.selectAll("path")
      .data(data.links)
      .enter()
      .append("path")
      .attr("d", d => {
        const sourcePos = nodePositions.get(d.source)!;
        const targetPos = nodePositions.get(d.target)!;

        if (!sourcePos || !targetPos) return "";

        const dx = targetPos.x - sourcePos.x;
        const distance = Math.abs(dx);

        // Create arc path
        const midX = (sourcePos.x + targetPos.x) / 2;
        const arcHeight = Math.min(distance * 0.3, innerHeight * 0.4);

        return `M ${sourcePos.x} ${sourcePos.y}
                Q ${midX} ${sourcePos.y - arcHeight} ${targetPos.x} ${targetPos.y}`;
      })
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", (d) => Math.sqrt((d as Link).value) * 2)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#333")
          .attr("stroke-width", Math.sqrt(d.value) * 3);

        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.source} → ${d.target}</strong><br/>Value: ${d.value}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke", "#999")
          .attr("stroke-width", (d) => Math.sqrt((d as Link).value) * 2);

        tooltip.style("opacity", 0);
      });

    // Add X axis
    container.append("g")
      .attr("transform", `translate(0,${innerHeight + 30})`)
      .call(d3.axisBottom(d3.scalePoint()
        .domain(sortedNodes.map(d => d.id))
        .range([0, innerWidth])))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "11px");

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Network Arc Diagram");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr("transform",
          `translate(${margin.left},${margin.top}) ${event.transform}`
        );
      });

    (svg as any).call(zoom);

    // Add zoom controls
    const controls = svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 50}, ${height - 120})`);

    // Zoom in button
    const zoomInBtn = controls.append("g")
      .style("cursor", "pointer")
      .on("click", () => {
        (svg as any).transition().duration(300).call(zoom.scaleBy, 1.3);
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
        (svg as any).transition().duration(300).call(zoom.scaleBy, 0.7);
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
        (svg as any).transition().duration(300).call(zoom.transform, d3.zoomIdentity);
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

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "arc-tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    return () => {
      tooltip.remove();
    };

  }, [data, width, height]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg ref={svgRef} width={width} height={height} style={{ border: '1px solid #ddd', background: '#fff' }}></svg>
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
        <strong>Controls:</strong> Scroll to zoom | Drag to pan | Hover nodes/links for details
      </div>
    </div>
  );
}