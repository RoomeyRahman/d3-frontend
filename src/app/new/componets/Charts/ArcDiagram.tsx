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

interface ChartData {
  nodes: Node[];
  links: Link[];
}

interface ArcDiagramProps {
  data?: ChartData | { chart_configuration?: { data?: ChartData } };
  width?: number;
  height?: number;
}

export function ArcDiagram({
  data,
  width = 900,
  height = 600,
}: ArcDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Handle nested data structure from chart_configuration
    let chartData: ChartData | undefined;

    if (
      data &&
      "chart_configuration" in data &&
      data.chart_configuration?.data
    ) {
      chartData = data.chart_configuration.data;
    } else if (data && "nodes" in data && "links" in data) {
      chartData = data as ChartData;
    }

    if (!chartData || !chartData.nodes || !chartData.links) {
      console.warn("Invalid data structure: missing nodes or links");
      return;
    }

    const { nodes: rawNodes, links: rawLinks } = chartData;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 60, right: 80, bottom: 100, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create container for zoom/pan
    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Sort nodes for consistent positioning
    const sortedNodes = rawNodes
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));

    // Create node positions along the bottom
    const nodePositions = new Map<string, { x: number; y: number }>();
    const nodeSpacing = innerWidth / (sortedNodes.length - 1 || 1);

    sortedNodes.forEach((node, i) => {
      nodePositions.set(node.id, {
        x: i * nodeSpacing,
        y: innerHeight - 20,
      });
    });

    // Create tooltip first (so it can be used by both nodes and links)
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "arc-tooltip")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("background", "rgba(0, 0, 0, 0.85)")
      .style("color", "#fff")
      .style("padding", "10px 14px")
      .style("border-radius", "6px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)");

    // Draw arcs for links (draw first so they appear behind nodes)
    const linkGroup = container.append("g").attr("class", "links");
    linkGroup
      .selectAll("path")
      .data(rawLinks)
      .enter()
      .append("path")
      .attr("d", (d) => {
        const sourcePos = nodePositions.get(d.source);
        const targetPos = nodePositions.get(d.target);

        if (!sourcePos || !targetPos) {
          console.warn(
            `Missing node position for link: ${d.source} -> ${d.target}`
          );
          return "";
        }

        const dx = targetPos.x - sourcePos.x;
        const distance = Math.abs(dx);

        // Create arc path with improved height calculation
        const midX = (sourcePos.x + targetPos.x) / 2;
        const arcHeight = Math.min(distance * 0.4, innerHeight * 0.6);

        return `M ${sourcePos.x} ${sourcePos.y}
                Q ${midX} ${sourcePos.y - arcHeight} ${targetPos.x} ${
          targetPos.y
        }`;
      })
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", (d) => Math.max(0.8, Math.sqrt(d.value) * 1.2))
      .attr("stroke-opacity", 0.4)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("stroke", "#e74c3c")
          .attr("stroke-width", Math.max(2.5, Math.sqrt(d.value) * 2))
          .attr("stroke-opacity", 0.9);

        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.source} → ${d.target}</strong><br/>Strength: ${d.value}`
          )
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .attr("stroke", "#999")
          .attr("stroke-width", Math.max(0.8, Math.sqrt(d.value) * 1.2))
          .attr("stroke-opacity", 0.4);

        tooltip.style("opacity", 0);
      });

    // Draw nodes
    const nodeGroup = container.append("g").attr("class", "nodes");
    nodeGroup
      .selectAll("circle")
      .data(sortedNodes)
      .enter()
      .append("circle")
      .attr("cx", (d) => nodePositions.get(d.id)!.x)
      .attr("cy", (d) => nodePositions.get(d.id)!.y)
      .attr("r", 6)
      .attr("fill", (d) => color(d.group.toString()))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 10).attr("stroke-width", 3);

        // Highlight connected links
        linkGroup
          .selectAll("path")
          .attr("stroke-opacity", (link: any) =>
            link.source === d.id || link.target === d.id ? 0.8 : 0.1
          );

        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.id}</strong><br/>Group: ${d.group}`)
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", 6).attr("stroke-width", 2);

        // Reset link opacity
        linkGroup.selectAll("path").attr("stroke-opacity", 0.4);

        tooltip.style("opacity", 0);
      });

    // Draw node labels (only show every nth label to avoid overlap)
    const labelInterval = Math.ceil(sortedNodes.length / 20);
    nodeGroup
      .selectAll("text")
      .data(sortedNodes.filter((_, i) => i % labelInterval === 0))
      .enter()
      .append("text")
      .attr("x", (d) => nodePositions.get(d.id)!.x)
      .attr("y", (d) => nodePositions.get(d.id)!.y + 24)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#555")
      .text((d) => (d.id.length > 10 ? d.id.substring(0, 10) + "..." : d.id));

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Les Misérables Character Network");

    // Add subtitle with stats
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 48)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#666")
      .text(
        `${sortedNodes.length} characters • ${rawLinks.length} connections`
      );

    // Add zoom behavior with corrected transform
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 8])
      .on("zoom", (event) => {
        container.attr(
          "transform",
          `translate(${margin.left + event.transform.x},${
            margin.top + event.transform.y
          }) scale(${event.transform.k})`
        );
      });

    (svg as any).call(zoom);

    // Add zoom controls
    const controls = svg
      .append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 55}, ${height - 140})`);

    // Zoom in button
    const zoomInBtn = controls
      .append("g")
      .style("cursor", "pointer")
      .on("click", () => {
        (svg as any).transition().duration(300).call(zoom.scaleBy, 1.3);
      });

    zoomInBtn
      .append("rect")
      .attr("width", 35)
      .attr("height", 35)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5)
      .attr("rx", 5);

    zoomInBtn
      .append("text")
      .attr("x", 17.5)
      .attr("y", 23)
      .attr("text-anchor", "middle")
      .attr("font-size", 22)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("+");

    // Zoom out button
    const zoomOutBtn = controls
      .append("g")
      .attr("transform", "translate(0, 40)")
      .style("cursor", "pointer")
      .on("click", () => {
        (svg as any).transition().duration(300).call(zoom.scaleBy, 0.7);
      });

    zoomOutBtn
      .append("rect")
      .attr("width", 35)
      .attr("height", 35)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5)
      .attr("rx", 5);

    zoomOutBtn
      .append("text")
      .attr("x", 17.5)
      .attr("y", 23)
      .attr("text-anchor", "middle")
      .attr("font-size", 22)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("−");

    // Reset button
    const resetBtn = controls
      .append("g")
      .attr("transform", "translate(0, 80)")
      .style("cursor", "pointer")
      .on("click", () => {
        (svg as any)
          .transition()
          .duration(300)
          .call(zoom.transform, d3.zoomIdentity);
      });

    resetBtn
      .append("rect")
      .attr("width", 35)
      .attr("height", 35)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5)
      .attr("rx", 5);

    resetBtn
      .append("text")
      .attr("x", 17.5)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("fill", "#333")
      .text("⟲");

    return () => {
      tooltip.remove();
    };
  }, [data, width, height]);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        background: "#fafafa",
        borderRadius: 8,
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          border: "1px solid #ddd",
          background: "#fff",
          borderRadius: 6,
        }}
      ></svg>
      <div
        style={{
          position: "absolute",

          background: "rgba(255,255,255,0.95)",
          padding: "10px 14px",
          borderRadius: 6,
          fontSize: 12,
          border: "1px solid #ddd",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <strong>Controls:</strong>
        <div style={{ marginTop: 4, color: "#666" }}>
          • Scroll to zoom
          <br />
          • Drag to pan
          <br />• Hover nodes/links for details
        </div>
      </div>
    </div>
  );
}
