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

interface HierarchyNode {
  name: string;
  group: number;
  children?: HierarchyNode[];
}

interface HierarchicalEdgeBundlingProps {
  data: NetworkData;
  width?: number;
  height?: number;
}

export default function HierarchicalEdgeBundling({ data, width = 800, height = 600 }: HierarchicalEdgeBundlingProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    // Convert network data to hierarchical structure
    const hierarchyData = convertToHierarchy(data);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const radius = Math.min(width, height) / 2;

    // Create container for zoom/pan
    const container = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create cluster layout
    const cluster = d3.cluster<HierarchyNode>()
      .size([2 * Math.PI, radius - 100]);

    const root = d3.hierarchy(hierarchyData);
    cluster(root);

    // Draw links
    container.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", d3.linkRadial<d3.HierarchyLink<HierarchyNode>, d3.HierarchyPointNode<HierarchyNode>>()
        .angle(d => d.x)
        .radius(d => d.y));

    // Draw nodes
    const node = container.append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", d => `rotate(${(d.x || 0) * 180 / Math.PI - 90}) translate(${d.y},0)`);

    node.append("circle")
      .attr("fill", d => d.children ? "#555" : "#999")
      .attr("r", 2.5);

    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => (d.x || 0) < Math.PI === !d.children ? 6 : -6)
      .attr("text-anchor", d => (d.x || 0) < Math.PI === !d.children ? "start" : "end")
      .attr("transform", d => (d.x || 0) >= Math.PI ? "rotate(180)" : null)
      .text(d => d.data.name)
      .clone(true).lower()
      .attr("stroke", "white");

    // Add bundled edges
    const bundles = createBundles(data.links, root as d3.HierarchyPointNode<HierarchyNode>);

    container.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.1)
      .selectAll("path")
      .data(bundles)
      .join("path")
      .attr("d", d3.lineRadial<{ x: number; y: number }>()
        .angle(d => d.x)
        .radius(d => d.y)
        .curve(d3.curveBundle.beta(0.85)));

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        container.attr("transform", `translate(${width / 2},${height / 2}) ${event.transform}`);
      });

    svg.call(zoom as any);

    // Add zoom controls
    const controls = svg.append("g")
      .attr("class", "zoom-controls")
      .attr("transform", `translate(${width - 50}, 10)`);

    // Zoom in button
    const zoomInBtn = controls.append("g")
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(zoom.scaleBy as any, 1.3);
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
        svg.transition().duration(300).call(zoom.scaleBy as any, 0.7);
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
        svg.transition().duration(300).call(zoom.transform as any, d3.zoomIdentity);
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
        <strong>Controls:</strong> Scroll to zoom | Drag to pan | Bundled edges show connections
      </div>
    </div>
  );
}

// Convert network data to hierarchical structure
function convertToHierarchy(data: NetworkData): HierarchyNode {
  const nodeMap = new Map(data.nodes.map((n) => [n.id, { ...n, children: [] as HierarchyNode[] }]));

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
  function buildChildren(parentId: string): HierarchyNode[] {
    const children: HierarchyNode[] = [];
    data.links.forEach((link) => {
      if (link.source === parentId && !visited.has(link.target)) {
        visited.add(link.target);
        const childNode = nodeMap.get(link.target);
        if (childNode) {
          const child: HierarchyNode = {
            name: childNode.id,
            group: childNode.group,
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

// Create bundled paths for edges
function createBundles(links: Link[], root: d3.HierarchyPointNode<HierarchyNode>) {
  const nodePositions = new Map<string, { x: number; y: number }>();

  root.each((d) => {
    if (d.x !== undefined && d.y !== undefined) {
      nodePositions.set(d.data.name, { x: d.x, y: d.y });
    }
  });

  const bundles: { x: number; y: number }[][] = [];

  links.forEach((link) => {
    const sourcePos = nodePositions.get(link.source);
    const targetPos = nodePositions.get(link.target);

    if (sourcePos && targetPos) {
      // Create a bundled path with intermediate points
      const path = [
        sourcePos,
        { x: (sourcePos.x + targetPos.x) / 2, y: (sourcePos.y + targetPos.y) / 2 },
        targetPos
      ];
      bundles.push(path);
    }
  });

  return bundles;
}