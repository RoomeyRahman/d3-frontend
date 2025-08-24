"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface SankeyLink {
  depth_from_root: number;
  children_count: number;
  id: string;
}

interface SankeyData {
  chart_type: string;
  processed_data: {
    links: SankeyLink[];
  };
  chart_config: {
    dimensions: {
      width: number;
      height: number;
      margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
    };
    color_scheme: {
      range: string[];
    };
  };
}

interface SankeyProps {
  data: SankeyData;
}

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  sourceLinks?: SankeyProcessedLink[];
  targetLinks?: SankeyProcessedLink[];
}

interface SankeyProcessedLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  y0?: number;
  y1?: number;
  width?: number;
}

const SankeyDiagram: React.FC<SankeyProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: string;
  }>({ show: false, x: 0, y: 0, content: "" });

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height, margin } = data.chart_config.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Process the data to create proper Sankey nodes and links
    const processedData = processDataForSankey(data.processed_data.links);

    if (!processedData.nodes.length || !processedData.links.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "text-gray-500")
        .text("No data available for Sankey diagram");
      return;
    }

    // Create the main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create Sankey layout
    const sankey = createSankeyLayout(innerWidth, innerHeight);
    const { nodes, links } = sankey(processedData);

    // Color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(nodes.map((d) => d.name))
      .range(data.chart_config.color_scheme.range);

    // Draw links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d", sankeyLinkPath)
      .attr("stroke", (d: any) => colorScale(d.source.name) as string)
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d: any) => Math.max(1, d.width))
      .attr("fill", "none")
      .style("cursor", "pointer")
      .on("mouseover", function (event: MouseEvent, d: any) {
        d3.select(this).attr("stroke-opacity", 0.8);
        setTooltip({
          show: true,
          x: event.pageX + 10,
          y: event.pageY - 10,
          content: `${d.source.name} → ${d.target.name}<br/>Flow: ${d.value}`,
        });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-opacity", 0.5);
        setTooltip((prev) => ({ ...prev, show: false }));
      });

    // Draw nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d: any) => d.x)
      .attr("y", (d: any) => d.y)
      .attr("width", (d: any) => d.width)
      .attr("height", (d: any) => d.height)
      .attr("fill", (d: any) => colorScale(d.name) as string)
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function (event: MouseEvent, d: any) {
        d3.select(this).attr("fill-opacity", 0.8);
        setTooltip({
          show: true,
          x: event.pageX + 10,
          y: event.pageY - 10,
          content: `${d.name}<br/>Value: ${d.value}`,
        });
      })
      .on("mouseout", function (event: MouseEvent, d: any) {
        d3.select(this).attr("fill-opacity", 1);
        setTooltip((prev) => ({ ...prev, show: false }));
      });

    // Add node labels
    g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d: any) => d.x + d.width / 2)
      .attr("y", (d: any) => d.y + d.height / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", "black")
      .text((d: any) => d.name)
      .style("pointer-events", "none");
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("Sankey Flow Diagram");
  }, [data, mounted]);
  if (!mounted) {
    return (
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: data.chart_config.dimensions.height }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
          <span className="text-gray-600">Loading chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        width={data.chart_config.dimensions.width}
        height={data.chart_config.dimensions.height}
        className="w-full h-auto"
        style={{ maxWidth: "100%", height: "auto" }}
      />

      {tooltip.show && (
        <div
          className="absolute bg-gray-800 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-10 shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

// Helper function to process data for Sankey diagram
function processDataForSankey(links: SankeyLink[]): {
  nodes: SankeyNode[];
  links: SankeyProcessedLink[];
} {
  const nodeMap = new Map<string, SankeyNode>();
  const processedLinks: SankeyProcessedLink[] = [];

  // Create nodes from unique depth levels and children counts
  links.forEach((link) => {
    const sourceId = `depth_${link.depth_from_root}`;
    const targetId = `children_${link.children_count}`;

    // Create source node
    if (!nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, {
        id: sourceId,
        name: `Depth ${link.depth_from_root}`,
        value: 0,
        sourceLinks: [],
        targetLinks: [],
      });
    }

    // Create target node
    if (!nodeMap.has(targetId)) {
      nodeMap.set(targetId, {
        id: targetId,
        name: `${link.children_count} Children`,
        value: 0,
        sourceLinks: [],
        targetLinks: [],
      });
    }
  });

  // Group links by source-target pairs and sum their values
  const linkGroups = new Map<string, number>();
  links.forEach((link) => {
    const sourceId = `depth_${link.depth_from_root}`;
    const targetId = `children_${link.children_count}`;
    const linkKey = `${sourceId}-${targetId}`;

    linkGroups.set(linkKey, (linkGroups.get(linkKey) || 0) + 1);
  });

  // Create processed links
  linkGroups.forEach((value, linkKey) => {
    const [sourceId, targetId] = linkKey.split("-");
    const sourceNode = nodeMap.get(sourceId)!;
    const targetNode = nodeMap.get(targetId)!;

    const processedLink: SankeyProcessedLink = {
      source: sourceNode,
      target: targetNode,
      value: value,
    };

    processedLinks.push(processedLink);
    sourceNode.sourceLinks!.push(processedLink);
    targetNode.targetLinks!.push(processedLink);
  });

  // Calculate node values
  nodeMap.forEach((node) => {
    node.value = Math.max(
      d3.sum(node.sourceLinks!, (d) => d.value),
      d3.sum(node.targetLinks!, (d) => d.value)
    );
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links: processedLinks,
  };
}

// Simplified Sankey layout function
function createSankeyLayout(width: number, height: number) {
  return function (data: {
    nodes: SankeyNode[];
    links: SankeyProcessedLink[];
  }) {
    const { nodes, links } = data;

    // Group nodes by their type (depth vs children)
    const depthNodes = nodes.filter((n) => n.id.startsWith("depth_"));
    const childrenNodes = nodes.filter((n) => n.id.startsWith("children_"));

    const nodeWidth = 20;
    const nodePadding = 10;

    // Position depth nodes on the left
    const leftX = 50;
    const rightX = width - nodeWidth - 50;

    // Calculate positions for depth nodes
    const depthHeight = Math.max(
      20,
      (height - (depthNodes.length - 1) * nodePadding) / depthNodes.length
    );
    depthNodes.forEach((node, i) => {
      node.x = leftX;
      node.y = i * (depthHeight + nodePadding);
      node.width = nodeWidth;
      node.height = Math.max(
        5,
        depthHeight * (node.value / d3.max(depthNodes, (d) => d.value)!)
      );
    });

    // Calculate positions for children nodes
    const childrenHeight = Math.max(
      20,
      (height - (childrenNodes.length - 1) * nodePadding) / childrenNodes.length
    );
    childrenNodes.forEach((node, i) => {
      node.x = rightX;
      node.y = i * (childrenHeight + nodePadding);
      node.width = nodeWidth;
      node.height = Math.max(
        5,
        childrenHeight * (node.value / d3.max(childrenNodes, (d) => d.value)!)
      );
    });

    // Calculate link positions
    links.forEach((link) => {
      link.width = Math.max(1, link.value * 3);
      link.y0 = link.source.y! + link.source.height! / 2;
      link.y1 = link.target.y! + link.target.height! / 2;
    });

    return { nodes, links };
  };
}

// Path generator for Sankey links
function sankeyLinkPath(d: any) {
  const curvature = 0.5;
  const x0 = d.source.x + d.source.width;
  const x1 = d.target.x;
  const xi = d3.interpolateNumber(x0, x1);
  const x2 = xi(curvature);
  const x3 = xi(1 - curvature);
  const y0 = d.y0;
  const y1 = d.y1;

  return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
}

export default SankeyDiagram;
