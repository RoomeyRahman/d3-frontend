import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name?: string;
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

interface ChartData {
  chart_configuration: {
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
      color: {
        type: string;
        scheme: string;
      };
    };
    chartSpecific: {
      forceStrength: number;
      linkDistance: number;
      linkStrength: number;
      collideRadius: number;
    };
    data: {
      nodes: Array<{
        id: string;
        group: number;
      }>;
      links: Array<{
        source: string;
        target: string;
        value: number;
      }>;
    };
  };
}

interface ForceDirectedNetworkProps {
  data: ChartData;
}

const ForceDirectedNetwork = ({ data }: ForceDirectedNetworkProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { chart_configuration } = data;
    const { dimensions, chartSpecific, scales } = chart_configuration;
    const { width, height, margin } = dimensions;

    // Extract nodes and links from the nested data structure
    const nodesData = chart_configuration.data.nodes;
    const linksData = chart_configuration.data.links;

    if (!nodesData || nodesData.length === 0) {
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

    // Transform the nodes into NetworkNode format
    const nodes: NetworkNode[] = nodesData.map((node) => ({
      id: node.id,
      name: node.id,
      group: node.group,
      x: undefined,
      y: undefined,
      fx: null,
      fy: null,
      vx: undefined,
      vy: undefined,
    }));

    const links: NetworkLink[] = linksData.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }));

    // Set up color scale
    const colorScale = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(nodes.map((d) => d.group.toString()));

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
          .distance(chartSpecific?.linkDistance || 50)
          .strength(chartSpecific?.linkStrength || 0.5)
      )
      .force(
        "charge",
        d3.forceManyBody().strength(chartSpecific?.forceStrength || -300)
      )
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force(
        "collision",
        d3
          .forceCollide<NetworkNode>()
          .radius(chartSpecific?.collideRadius || 10)
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
      .attr("stroke-width", (d) => Math.sqrt(d.value) * 0.5);

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
      .attr("r", 8)
      .attr("fill", (d) => colorScale(d.group.toString()) as any)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");

    // Add labels
    nodeElements
      .append("text")
      .attr("dx", 0)
      .attr("dy", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .style("font-weight", "600")
      .style("fill", "#333")
      .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
      .text((d) => d.name || d.id);

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
          .attr("r", 12)
          .style("filter", "drop-shadow(3px 3px 6px rgba(0,0,0,0.4))");

        // Count connections
        const linkCount = links.filter(
          (l) =>
            (l.source as NetworkNode).id === d.id ||
            (l.target as NetworkNode).id === d.id
        ).length;

        tooltip.style("visibility", "visible").html(`
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${
              d.name || d.id
            }</div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">ID:</span> 
              <span style="font-weight: 600;">${d.id}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Group:</span> 
              <span style="font-weight: 600;">${d.group}</span>
            </div>
            <div style="color: #ccc;">
              <span>Connections:</span> 
              <span style="font-weight: 600;">${linkCount}</span>
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
              ? Math.sqrt(l.value) * 0.8
              : Math.sqrt(l.value) * 0.5
          )
          .style("stroke", (l) =>
            (l.source as NetworkNode).id === d.id ||
            (l.target as NetworkNode).id === d.id
              ? "#ff6b6b"
              : "#999"
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
          .attr("r", 8)
          .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");

        tooltip.style("visibility", "hidden");

        // Reset link styles
        linkElements
          .style("stroke-opacity", 0.6)
          .style("stroke-width", (d) => Math.sqrt(d.value) * 0.5)
          .style("stroke", "#999");
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
    const uniqueGroups = Array.from(new Set(nodes.map((d) => d.group))).sort(
      (a, b) => a - b
    );

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 30)`);

    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("font-size", "14px")
      .style("font-weight", "700")
      .style("fill", "#333")
      .text("Groups");

    const legendItems = legend
      .selectAll(".legend-item")
      .data(uniqueGroups)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 22 + 20})`);

    legendItems
      .append("circle")
      .attr("r", 6)
      .attr("fill", (d) => colorScale(d.toString()) as any);

    legendItems
      .append("text")
      .attr("x", 12)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", "#333")
      .text((d) => `Group ${d}`);

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "700")
      .style("fill", "#333")
      .text("Force Directed Network Graph");

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
        viewBox={`0 0 ${data.chart_configuration.dimensions.width} ${data.chart_configuration.dimensions.height}`}
        className="w-full h-full"
        style={{ maxWidth: "100%", height: "600px" }}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default ForceDirectedNetwork;
