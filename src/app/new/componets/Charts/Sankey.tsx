import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export const SankeyDiagram = ({ data: chartData }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!chartData || !chartData.chart_configuration) return;

    const config = chartData.chart_configuration;
    const data = config.data;

    if (!data || !data.nodes || !data.links) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = config.dimensions.width;
    const height = config.dimensions.height;
    const margin = config.dimensions.margin;
    const nodeWidth = config.chartSpecific.nodeWidth;
    const nodePadding = config.chartSpecific.nodePadding;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create node and link maps
    const nodeMap = new Map(data.nodes.map((d) => [d.id, { ...d }]));
    const links = data.links.map((d) => ({
      source: d.source,
      target: d.target,
      value: d.value,
    }));

    // Calculate node values
    nodeMap.forEach((node) => {
      node.sourceLinks = [];
      node.targetLinks = [];
      node.value = 0;
    });

    links.forEach((link) => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (source && target) {
        link.sourceNode = source;
        link.targetNode = target;
        source.sourceLinks.push(link);
        target.targetLinks.push(link);
        source.value += link.value;
      }
    });

    // Compute node depths and positions
    const nodes = Array.from(nodeMap.values());

    // Calculate depth for each node
    nodes.forEach((node) => (node.depth = 0));
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 100) {
      changed = false;
      iterations++;
      nodes.forEach((node) => {
        node.targetLinks.forEach((link) => {
          const sourceDepth = link.sourceNode.depth + 1;
          if (node.depth < sourceDepth) {
            node.depth = sourceDepth;
            changed = true;
          }
        });
      });
    }

    // Calculate reverse depth
    const maxDepth = d3.max(nodes, (d) => d.depth) || 0;
    nodes.forEach((node) => (node.height = maxDepth));
    changed = true;
    iterations = 0;
    while (changed && iterations < 100) {
      changed = false;
      iterations++;
      nodes.forEach((node) => {
        node.sourceLinks.forEach((link) => {
          const targetHeight = link.targetNode.height - 1;
          if (node.height > targetHeight) {
            node.height = targetHeight;
            changed = true;
          }
        });
      });
    }

    // Position nodes
    const columns = d3.group(nodes, (d) => d.depth);
    const columnWidth = innerWidth / (maxDepth + 1);

    columns.forEach((columnNodes, depth) => {
      const totalValue = d3.sum(columnNodes, (d) => d.value);
      const scale =
        (innerHeight - (columnNodes.length - 1) * nodePadding) / totalValue;

      let y = 0;
      columnNodes.sort((a, b) => a.group - b.group);
      columnNodes.forEach((node) => {
        node.x0 = depth * columnWidth;
        node.x1 = node.x0 + nodeWidth;
        node.y0 = y;
        node.y1 = y + node.value * scale;
        y = node.y1 + nodePadding;
      });
    });

    // Position links
    nodes.forEach((node) => {
      node.sourceLinks.sort((a, b) => a.targetNode.y0 - b.targetNode.y0);
      node.targetLinks.sort((a, b) => a.sourceNode.y0 - b.sourceNode.y0);
    });

    links.forEach((link) => {
      const source = link.sourceNode;
      const target = link.targetNode;

      const sourceValue = d3.sum(source.sourceLinks, (d) => d.value);
      const targetValue = d3.sum(target.targetLinks, (d) => d.value);

      const sy = (source.y1 - source.y0) / sourceValue;
      const ty = (target.y1 - target.y0) / targetValue;

      link.width = link.value * Math.min(sy, ty);

      link.y0 =
        source.y0 +
        d3.sum(
          source.sourceLinks.slice(0, source.sourceLinks.indexOf(link)),
          (d) => d.width
        );
      link.y1 =
        target.y0 +
        d3.sum(
          target.targetLinks.slice(0, target.targetLinks.indexOf(link)),
          (d) => d.width
        );
    });

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw links
    const link = g
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", (d) => {
        const x0 = d.sourceNode.x1;
        const x1 = d.targetNode.x0;
        const xi = d3.interpolateNumber(x0, x1);
        const x2 = xi(0.5);
        const y0 = d.y0 + d.width / 2;
        const y1 = d.y1 + d.width / 2;
        return `M${x0},${y0}C${x2},${y0} ${x2},${y1} ${x1},${y1}`;
      })
      .attr("stroke", (d) => color(d.sourceNode.group))
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", config.styling.opacity)
      .style("cursor", "pointer");

    link
      .append("title")
      .text((d) => `${d.source} → ${d.target}\nValue: ${d.value}`);

    // Draw nodes
    const node = g
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("width", (d) => d.x1 - d.x0)
      .attr("fill", (d) => color(d.group))
      .attr("opacity", config.styling.fillOpacity)
      .style("cursor", "pointer");

    node.append("title").text((d) => `${d.id}\nValue: ${d.value.toFixed(0)}`);

    // Add labels
    g.append("g")
      .style("font", "10px sans-serif")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d) => (d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < innerWidth / 2 ? "start" : "end"))
      .text((d) => d.id)
      .style("fill", "#333")
      .style("pointer-events", "none");
  }, [chartData]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
      <svg ref={svgRef}></svg>
    </div>
  );
};
