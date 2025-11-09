import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface CharacterNode {
  name: string;
  value?: number;
  children?: CharacterNode[];
}

interface FlatDataItem {
  source: string;
  target: string;
  value: number;
}

interface ChartConfiguration {
  chartType: string;
  dimensions: {
    width: number;
    height: number;
  };
  styling?: {
    opacity?: number;
    strokeWidth?: number;
    colorScheme?: string;
  };
  chartSpecific?: {
    padAngle?: number;
    cornerRadius?: number;
  };
  data: {
    flat_data: FlatDataItem[];
  };
}

interface SunburstChartProps {
  data: {
    chart_configuration: ChartConfiguration;
  };
}

export const SunburstChart: React.FC<SunburstChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<CharacterNode | null>(null);

  useEffect(() => {
    if (!data || !data || !svgRef.current) return;

    const config = data;
    const flatData = config.data.flat_data;

    if (!flatData || flatData.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Convert flat data to hierarchical structure
    const convertToHierarchy = (data: FlatDataItem[]): CharacterNode => {
      const nodes = new Map<string, CharacterNode>();
      const root: CharacterNode = { name: "Les Misérables", children: [] };

      // Create nodes
      data.forEach((link) => {
        if (!nodes.has(link.source)) {
          nodes.set(link.source, { name: link.source, children: [] });
        }
        if (!nodes.has(link.target)) {
          nodes.set(link.target, { name: link.target, children: [] });
        }
      });

      // Build hierarchy - group by target characters
      const connections = new Map<string, CharacterNode[]>();
      data.forEach((link) => {
        if (!connections.has(link.target)) {
          connections.set(link.target, []);
        }
        connections
          .get(link.target)!
          .push({ name: link.source, value: link.value });
      });

      // Get main characters (those who are targets)
      const mainCharacters = [...new Set(data.map((d) => d.target))];

      mainCharacters.forEach((char) => {
        const charNode: CharacterNode = { name: char, children: [] };
        const links = connections.get(char) || [];

        if (links.length > 0) {
          charNode.children = links;
        } else {
          charNode.value = 1;
        }

        root.children!.push(charNode);
      });

      return root;
    };

    const hierarchyData = convertToHierarchy(flatData);

    // Set up dimensions
    const width = config.dimensions.width;
    const height = config.dimensions.height;
    const radius = Math.min(width, height) / 2;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Create partition layout
    const partition = d3.partition<CharacterNode>().size([2 * Math.PI, radius]);

    // Create root hierarchy
    const root = d3
      .hierarchy(hierarchyData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    partition(root);

    // Create arc generator
    const arc = d3
      .arc<d3.HierarchyRectangularNode<CharacterNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .padAngle(config.chartSpecific?.padAngle || 0.005)
      .cornerRadius(config.chartSpecific?.cornerRadius || 3);

    // Draw arcs
    svg
      .selectAll("path")
      .data(root.descendants().filter((d) => d.depth > 0))
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", (d) => color(d.data.name))
      .style("opacity", config.styling?.opacity || 0.8)
      .style("stroke", "#fff")
      .style("stroke-width", config.styling?.strokeWidth || 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event: MouseEvent, d) {
        d3.select(this).style("opacity", 1).style("stroke-width", 2);

        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`)
            .html(`<strong>${d.data.name}</strong><br/>Value: ${d.value || 0}`);
        }
      })
      .on("mousemove", function (event: MouseEvent) {
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        }
      })
      .on("mouseout", function () {
        d3.select(this)
          .style("opacity", config.styling?.opacity || 0.8)
          .style("stroke-width", config.styling?.strokeWidth || 1);

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("display", "none");
        }
      })
      .on("click", function (event: MouseEvent, d) {
        setSelectedNode(d.data);
      });

    // Add labels for larger segments
    svg
      .selectAll("text")
      .data(root.descendants().filter((d) => d.depth > 0 && d.x1 - d.x0 > 0.1))
      .enter()
      .append("text")
      .attr("transform", (d) => {
        const angle = (d.x0 + d.x1) / 2;
        const radius = (d.y0 + d.y1) / 2;
        return `rotate(${
          (angle * 180) / Math.PI - 90
        }) translate(${radius},0) rotate(${angle > Math.PI ? 180 : 0})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) =>
        (d.x0 + d.x1) / 2 > Math.PI ? "end" : "start"
      )
      .style("font-size", "10px")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .text((d) =>
        d.data.name.length > 15
          ? d.data.name.substring(0, 12) + "..."
          : d.data.name
      );

    // Add center label
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Les Misérables");
  }, [data]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-6xl w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Character Relationships - Les Misérables
          </h1>
          <p className="text-gray-600">
            Interactive sunburst chart showing character connections. Hover over
            segments for details.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <svg ref={svgRef} className="drop-shadow-md"></svg>
        </div>

        {selectedNode && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-lg text-blue-900 mb-2">
              Selected Character
            </h3>
            <p className="text-blue-800">
              <strong>Name:</strong> {selectedNode.name}
            </p>
            {selectedNode.value && (
              <p className="text-blue-800">
                <strong>Connections:</strong> {selectedNode.value}
              </p>
            )}
          </div>
        )}

        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm z-50"
          style={{ display: "none" }}
        ></div>
      </div>
    </div>
  );
};
