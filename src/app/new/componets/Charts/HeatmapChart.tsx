"use client";
import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

interface HeatmapDataPoint {
  source: string;
  target: string;
  value: number;
}

interface HeatmapData {
  chart_configuration?: {
    data?: {
      values: HeatmapDataPoint[];
    };
  };
  data?: {
    values: HeatmapDataPoint[];
  };
  values?: HeatmapDataPoint[];
}

interface HeatmapProps {
  data: HeatmapData;
  width?: number;
  height?: number;
}

export function HeatmapChart({
  data,
  width = 800,
  height = 600,
}: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Extract values from nested structure
    let values: HeatmapDataPoint[] = [];
    if (data?.data?.values) {
      values = data.data.values;
    } else if (data?.data?.values) {
      values = data.data.values;
    } else if (data?.values) {
      values = data.values;
    }

    if (!values || values.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 80, right: 100, bottom: 80, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create container for zoom/pan
    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Convert data to heatmap matrix
    const { matrix, nodes: sortedNodes } = convertToMatrix(values);

    // Create scales
    const x = d3
      .scaleBand()
      .domain(sortedNodes)
      .range([0, innerWidth])
      .padding(0.05);

    const y = d3
      .scaleBand()
      .domain(sortedNodes)
      .range([0, innerHeight])
      .padding(0.05);

    const maxValue = d3.max(matrix, (d) => d.value) || 10;
    const colorScale = d3
      .scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateBlues);

    // Draw heatmap cells
    const cells = container
      .selectAll("rect")
      .data(matrix)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.source)!)
      .attr("y", (d) => y(d.target)!)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", (d) => (d.value === 0 ? "#f5f5f5" : colorScale(d.value)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);

        // Show tooltip
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.source} → ${d.target}</strong><br/>Value: ${d.value}`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);

        tooltip.style("opacity", 0);
      });

    // Add X axis
    const xAxis = container
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "11px");

    // Add Y axis
    const yAxis = container
      .append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "11px");

    // Add X axis label
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Target Nodes");

    // Add Y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Source Nodes");

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .text("Network Connection Heatmap");

    // Add color legend
    const legendWidth = 20;
    const legendHeight = 200;
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - margin.right + 20}, ${margin.top})`
      );

    const legendScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(5);

    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    gradient
      .selectAll("stop")
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append("stop")
      .attr("offset", (d) => `${d * 100}%`)
      .attr("stop-color", (d) => colorScale(d * maxValue));

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    legend
      .append("g")
      .attr("transform", `translate(${legendWidth}, 0)`)
      .call(legendAxis);

    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("Value");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        container.attr(
          "transform",
          `translate(${margin.left},${margin.top}) ${event.transform}`
        );
      });

    svg.call(zoom);

    // Add zoom controls
    const controls = svg
      .append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 50}, ${height - 120})`);

    // Zoom in button
    const zoomInBtn = controls
      .append("g")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 1.3);
      });

    zoomInBtn
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    zoomInBtn
      .append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 20)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("+");

    // Zoom out button
    const zoomOutBtn = controls
      .append("g")
      .attr("transform", "translate(0, 35)")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy, 0.7);
      });

    zoomOutBtn
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    zoomOutBtn
      .append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 20)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("−");

    // Reset button
    const resetBtn = controls
      .append("g")
      .attr("transform", "translate(0, 70)")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      });

    resetBtn
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    resetBtn
      .append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("fill", "#333")
      .text("⟲");

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "heatmap-tooltip")
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
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: "1px solid #ddd", background: "#fff" }}
      ></svg>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "8px 12px",
          borderRadius: 4,
          fontSize: 12,
          border: "1px solid #ddd",
        }}
      >
        <strong>Controls:</strong> Scroll to zoom | Drag to pan | Hover cells
        for values
      </div>
    </div>
  );
}

// Convert heatmap data to matrix format
function convertToMatrix(values: HeatmapDataPoint[]) {
  // Get unique nodes from source and target
  const nodeSet = new Set<string>();
  values.forEach((d) => {
    nodeSet.add(d.source);
    nodeSet.add(d.target);
  });

  const nodes = Array.from(nodeSet).sort();
  const matrix: Array<{ source: string; target: string; value: number }> = [];

  // Create a map for quick lookup
  const valueMap = new Map<string, number>();
  values.forEach((d) => {
    valueMap.set(`${d.source}-${d.target}`, d.value);
  });

  // Create matrix for all node combinations
  nodes.forEach((source) => {
    nodes.forEach((target) => {
      const key = `${source}-${target}`;
      const value = valueMap.get(key) || 0;
      matrix.push({ source, target, value });
    });
  });

  return { matrix, nodes };
}
