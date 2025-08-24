"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface RawDataPoint {
  id: number;
  name: string;
  level: number;
  has_children: number;
  children_count: number;
  value: number;
  is_root: number;
  depth_from_root: number;
  full_path: string;
  parent_path: string;
  node_type: string;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  level?: number;
  value?: number;
  node_type?: string;
  depth_from_root?: number;
  children_count?: number;
  is_root?: boolean;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
  value: number;
}

interface ProcessedData {
  nodes: Array<{
    id: string;
    name: string;
    level?: number;
    value?: number;
    node_type?: string;
    depth_from_root?: number;
    children_count?: number;
    is_root?: boolean;
  }>;
  links: any;
}

interface ChartData {
  processed_data: ProcessedData;
  raw_data?: RawDataPoint[];
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
    scales: {
      source_col: string;
      target_col: string | null;
      node_col: string;
      edge_structure: string | null;
    };
    color_scheme: {
      type: string;
      scheme: string;
      range: string[];
    };
  };
  data_profile: {
    total_rows: number;
    total_columns: number;
  };
}

interface ForceDirectedNetworkProps {
  data: ChartData;
}

const ForceDirectedNetwork = ({ data }: ForceDirectedNetworkProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const generateNetworkData = (rawData: RawDataPoint[]): ProcessedData => {
    // Create nodes from raw data
    const nodes: NetworkNode[] = rawData.map((item, index) => ({
      id: (item.id ?? index).toString(),
      name: item.name || `Node ${index}`,
      level: item.level ?? 0,
      value: item.value ?? 1,
      node_type: item.node_type || "default",
      depth_from_root: item.depth_from_root ?? 0,
      children_count: item.children_count ?? 0,
      is_root: (item.is_root ?? 0) === 1,
      group: item.level ?? 0, // Use level as group for coloring
      x: undefined,
      y: undefined,
      fx: null,
      fy: null,
      vx: undefined,
      vy: undefined,
    }));

    // Generate links based on hierarchy (parent-child relationships)
    const links: NetworkLink[] = [];

    // Create a map for quick lookup
    const pathToIdMap = new Map<string, string>();
    rawData.forEach((item, index) => {
      if (item.full_path) {
        pathToIdMap.set(item.full_path, (item.id ?? index).toString());
      }
    });

    // Generate links based on parent-child relationships
    rawData.forEach((item, index) => {
      if (!(item.is_root ?? 0) && item.parent_path) {
        const parentId = pathToIdMap.get(item.parent_path);
        if (parentId) {
          links.push({
            source: parentId,
            target: (item.id ?? index).toString(),
            value: item.value ?? 1,
          });
        }
      }
    });

    return { nodes, links };
  };

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { chart_config } = data;
    const { dimensions, color_scheme } = chart_config;
    const { width, height, margin } = dimensions;

    // Use the processed data directly
    let networkData = data.processed_data;

    // Return early if no data
    if (!networkData?.nodes || networkData.nodes.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("No network data available");
      return;
    }

    // Transform the simple nodes into NetworkNode format
    const nodes: NetworkNode[] = networkData.nodes.map((node, index) => ({
      id: node.id,
      name: node.name,
      level: node.level ?? Math.floor(Math.random() * 3), // Random level if not provided
      value: node.value ?? Math.floor(Math.random() * 50) + 10, // Random value if not provided
      node_type: node.node_type ?? "node",
      depth_from_root: node.depth_from_root ?? 0,
      children_count: node.children_count ?? 0,
      is_root: node.is_root ?? false,
      group: node.level ?? Math.floor(Math.random() * 3), // Use level or random for grouping
      x: undefined,
      y: undefined,
      fx: null,
      fy: null,
      vx: undefined,
      vy: undefined,
    }));

    const links: NetworkLink[] = networkData.links.map((link: any) => ({
      source: link.source,
      target: link.target,
      value: link.value ?? 1,
    }));

    // Set up color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(nodes.map((d) => (d.group ?? 0).toString()))
      .range(color_scheme?.range ?? d3.schemeCategory10);

    // Create main container
    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const containerWidth = width - margin.left - margin.right;
    const containerHeight = height - margin.top - margin.bottom;

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode, NetworkLink>(links)
          .id((d) => d.id)
          .distance(60)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force(
        "collision",
        d3
          .forceCollide<NetworkNode>()
          .radius((d) => Math.sqrt(d.value ?? 10) * 2 + 10)
      );

    // Create links
    const linkElements = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.value ?? 1) + 1);

    // Create nodes
    const nodeElements = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    // Add circles for nodes
    nodeElements
      .append("circle")
      .attr("r", (d) => Math.sqrt(d.value ?? 10) * 0.8 + 8)
      .attr("fill", (d) => colorScale((d.group ?? 0).toString()) as any)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");

    // Add labels
    nodeElements
      .append("text")
      .attr("dx", 0)
      .attr("dy", (d) => Math.sqrt(d.value ?? 10) * 0.8 + 25)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("fill", "#333")
      .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
      .text((d) => d.name ?? "Unknown");

    // Add drag behavior
    const drag = d3
      .drag<SVGGElement, NetworkNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(drag);

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "12px 16px")
      .style("border-radius", "8px")
      .style("font-size", "14px")
      .style("font-family", "system-ui, -apple-system, sans-serif")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
      .style("border", "1px solid rgba(255, 255, 255, 0.2)");

    // Add hover effects
    nodeElements
      .on("mouseover", function (event, d) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("r", Math.sqrt(d.value ?? 10) * 0.8 + 12)
          .style("filter", "drop-shadow(3px 3px 6px rgba(0,0,0,0.4))");

        tooltip.style("visibility", "visible").html(`
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${
              d.name ?? "Unknown"
            }</div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">ID:</span> 
              <span style="font-weight: 600;">${d.id}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Type:</span> 
              <span style="font-weight: 600;">${d.node_type ?? "Unknown"}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Level:</span> 
              <span style="font-weight: 600;">${d.level ?? 0}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Value:</span> 
              <span style="font-weight: 600;">${d.value ?? 0}</span>
            </div>
            <div style="color: #ccc;">
              <span>Children:</span> 
              <span style="font-weight: 600;">${d.children_count ?? 0}</span>
            </div>
          `);

        // Highlight connected links
        linkElements
          .style("stroke-opacity", (l) =>
            (l.source as NetworkNode).id === d.id ||
            (l.target as NetworkNode).id === d.id
              ? 1
              : 0.1
          )
          .style("stroke-width", (l) =>
            (l.source as NetworkNode).id === d.id ||
            (l.target as NetworkNode).id === d.id
              ? Math.sqrt(l.value ?? 1) + 3
              : Math.sqrt(l.value ?? 1) + 1
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 15 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("r", Math.sqrt(d.value ?? 10) * 0.8 + 8)
          .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");

        tooltip.style("visibility", "hidden");

        // Reset link styles
        linkElements
          .style("stroke-opacity", 0.6)
          .style("stroke-width", (d) => Math.sqrt(d.value ?? 1) + 1);
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => (d.source as NetworkNode).x!)
        .attr("y1", (d) => (d.source as NetworkNode).y!)
        .attr("x2", (d) => (d.target as NetworkNode).x!)
        .attr("y2", (d) => (d.target as NetworkNode).y!);

      nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Add legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 150}, 30)`);

    const legendData = Array.from(
      new Set(nodes.map((d) => d.node_type ?? "Node"))
    ).map((type) => {
      const node = nodes.find((n) => (n.node_type ?? "Node") === type)!;
      return {
        type,
        group: node.group ?? 0,
        color: colorScale((node.group ?? 0).toString()),
      };
    });

    const legendItems = legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => d.color as any);

    legendItems
      .append("text")
      .attr("x", 15)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#333")
      .text((d) => d.type);

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "700")
      .style("fill", "#333")
      .text("Force Directed Network");

    // Add instructions
    svg
      .append("text")
      .attr("x", 20)
      .attr("y", height - 10)
      .style("font-size", "11px")
      .style("fill", "#666")
      .text("Drag nodes • Zoom/Pan • Hover for details");

    // Cleanup function
    return () => {
      simulation.stop();
      d3.selectAll(".d3-tooltip").remove();
    };
  }, [data]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${data.chart_config.dimensions.width} ${data.chart_config.dimensions.height}`}
        className="w-full h-full"
        style={{ maxWidth: "100%", height: "600px" }}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default ForceDirectedNetwork;
