import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export const SunburstChart = ({ data }: any) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!data || !data.chart_configuration) return;

    const config = data.chart_configuration;
    const flatData = config.data.flat_data;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Convert flat data to hierarchical structure
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
    const partition = d3.partition().size([2 * Math.PI, radius]);

    // Create root hierarchy
    const root = d3
      .hierarchy(hierarchyData)
      .sum((d) => d.value || 0)
      .sort((a, b) => b.value - a.value);

    partition(root);

    // Create arc generator
    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .padAngle(config.chartSpecific.padAngle)
      .cornerRadius(config.chartSpecific.cornerRadius);

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Draw arcs
    const paths = svg
      .selectAll("path")
      .data(root.descendants().filter((d) => d.depth > 0))
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", (d) => color(d.data.name))
      .style("opacity", config.styling.opacity)
      .style("stroke", "#fff")
      .style("stroke-width", config.styling.strokeWidth)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1).style("stroke-width", 2);

        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(`<strong>${d.data.name}</strong><br/>Value: ${d.value}`);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .style("opacity", config.styling.opacity)
          .style("stroke-width", config.styling.strokeWidth);

        tooltip.style("display", "none");
      })
      .on("click", function (event, d) {
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

  // Convert flat data to hierarchical structure
  const convertToHierarchy = (flatData) => {
    const nodes = new Map();
    const root = { name: "Root", children: [] };

    // Create nodes
    flatData.forEach((link) => {
      if (!nodes.has(link.source)) {
        nodes.set(link.source, { name: link.source, children: [] });
      }
      if (!nodes.has(link.target)) {
        nodes.set(link.target, { name: link.target, value: 0 });
      }
    });

    // Build hierarchy
    const connections = new Map();
    flatData.forEach((link) => {
      if (!connections.has(link.target)) {
        connections.set(link.target, []);
      }
      connections
        .get(link.target)
        .push({ name: link.source, value: link.value });
    });

    // Get main characters (those who are targets)
    const mainCharacters = [...new Set(flatData.map((d) => d.target))];

    mainCharacters.forEach((char) => {
      const charNode = { name: char, children: [] };
      const links = connections.get(char) || [];

      if (links.length > 0) {
        charNode.children = links;
      } else {
        charNode.value = 1;
      }

      root.children.push(charNode);
    });

    return root;
  };

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

        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm"
          style={{ display: "none" }}
        ></div>
      </div>
    </div>
  );
};
