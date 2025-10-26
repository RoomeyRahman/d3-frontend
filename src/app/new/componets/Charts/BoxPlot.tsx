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

interface BoxPlotProps {
  data: NetworkData;
  width?: number;
  height?: number;
}

export default function BoxPlotChart({ data, width = 800, height = 500 }: BoxPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    // Convert network data to box plot data (group by node groups)
    const boxPlotData = convertToBoxPlotData(data);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create a container group for zoom/pan
    const container = svg.append("g");

    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = container
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // X scale
    const x = d3
      .scaleBand()
      .domain(boxPlotData.map((d) => d.group))
      .range([0, innerWidth])
      .padding(0.3);

    // Y scale
    const allValues = boxPlotData.flatMap((d) => [
      d.min,
      d.q1,
      d.median,
      d.q3,
      d.max,
      ...d.outliers,
    ]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues) || 10])
      .nice()
      .range([innerHeight, 0]);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", "12px");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "12px");

    // Add Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Link Values");

    // Add X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + margin.bottom - 20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Node Groups");

    // Draw box plots
    boxPlotData.forEach((d) => {
      const xPos = x(d.group)! + x.bandwidth() / 2;
      const boxWidth = x.bandwidth() * 0.6;

      // Vertical line (min to max)
      g.append("line")
        .attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", y(d.min))
        .attr("y2", y(d.max))
        .attr("stroke", "black")
        .attr("stroke-width", 1);

      // Box (Q1 to Q3)
      g.append("rect")
        .attr("x", xPos - boxWidth / 2)
        .attr("y", y(d.q3))
        .attr("width", boxWidth)
        .attr("height", y(d.q1) - y(d.q3))
        .attr("fill", color(d.group))
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.7);

      // Median line
      g.append("line")
        .attr("x1", xPos - boxWidth / 2)
        .attr("x2", xPos + boxWidth / 2)
        .attr("y1", y(d.median))
        .attr("y2", y(d.median))
        .attr("stroke", "black")
        .attr("stroke-width", 2);

      // Min whisker
      g.append("line")
        .attr("x1", xPos - boxWidth / 4)
        .attr("x2", xPos + boxWidth / 4)
        .attr("y1", y(d.min))
        .attr("y2", y(d.min))
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      // Max whisker
      g.append("line")
        .attr("x1", xPos - boxWidth / 4)
        .attr("x2", xPos + boxWidth / 4)
        .attr("y1", y(d.max))
        .attr("y2", y(d.max))
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      // Outliers
      d.outliers.forEach((value: number) => {
        g.append("circle")
          .attr("cx", xPos)
          .attr("cy", y(value))
          .attr("r", 3)
          .attr("fill", color(d.group))
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      });

      // Mean marker
      g.append("circle")
        .attr("cx", xPos)
        .attr("cy", y(d.mean))
        .attr("r", 4)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);
    });

    // Add title
    container
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Link Values Distribution by Node Group");

    // Add legend
    const legend = container
      .append("g")
      .attr("transform", `translate(${width - 120}, 40)`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", "white")
      .attr("stroke", "black");

    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .style("font-size", "11px")
      .text("Mean");

    legend
      .append("line")
      .attr("x1", 0)
      .attr("x2", 12)
      .attr("y1", 26)
      .attr("y2", 26)
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 30)
      .style("font-size", "11px")
      .text("Median");

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
      <svg ref={svgRef} width={width} height={height} style={{ border: '1px solid #ddd' }}></svg>
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
        <strong>Controls:</strong> Scroll to zoom | Drag to pan
      </div>
    </div>
  );
}

// Convert network data to box plot data
function convertToBoxPlotData(data: NetworkData) {
  // Group link values by node groups
  const groupedData = new Map<string, number[]>();

  data.links.forEach((link) => {
    const sourceNode = data.nodes.find((n) => n.id === link.source);
    const targetNode = data.nodes.find((n) => n.id === link.target);

    if (sourceNode) {
      const groupKey = `Group ${sourceNode.group}`;
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, []);
      }
      groupedData.get(groupKey)!.push(link.value);
    }

    if (targetNode && targetNode.group !== sourceNode?.group) {
      const groupKey = `Group ${targetNode.group}`;
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, []);
      }
      groupedData.get(groupKey)!.push(link.value);
    }
  });

  // Calculate box plot statistics for each group
  const boxPlotData: any[] = [];

  groupedData.forEach((values, group) => {
    const sorted = values.sort((a, b) => a - b);
    const q1 = d3.quantile(sorted, 0.25) || 0;
    const median = d3.quantile(sorted, 0.5) || 0;
    const q3 = d3.quantile(sorted, 0.75) || 0;
    const iqr = q3 - q1;
    const mean = d3.mean(sorted) || 0;

    // Calculate outliers using IQR method
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
    const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);

    const min = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0];
    const max = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[sorted.length - 1];

    boxPlotData.push({
      group,
      min,
      q1,
      median,
      q3,
      max,
      mean,
      outliers,
    });
  });

  return boxPlotData;
}