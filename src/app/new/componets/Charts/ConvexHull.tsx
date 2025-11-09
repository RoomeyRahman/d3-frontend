import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export const ConvexHullChart = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.chart_configuration) return;

    const config = data.chart_configuration;
    const { width, height, margin } = config.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Extract unique nodes from the network data
    const nodeMap = new Map();
    config.data.values.forEach((link) => {
      if (!nodeMap.has(link.source)) {
        nodeMap.set(link.source, { id: link.source, connections: 0 });
      }
      if (!nodeMap.has(link.target)) {
        nodeMap.set(link.target, { id: link.target, connections: 0 });
      }
      nodeMap.get(link.source).connections += link.value;
      nodeMap.get(link.target).connections += link.value;
    });

    const nodes = Array.from(nodeMap.values());

    // Create force simulation to position nodes
    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force("collision", d3.forceCollide().radius(20))
      .stop();

    // Run simulation
    for (let i = 0; i < 300; i++) simulation.tick();

    // Get points for convex hull
    const points = nodes.map((d) => [d.x, d.y]);

    // Compute convex hull
    const hull = d3.polygonHull(points);

    // Create scales
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw convex hull
    if (hull) {
      g.append("path")
        .datum(hull)
        .attr("class", "hull")
        .attr("d", (d) => `M${d.join("L")}Z`)
        .attr("fill", colorScale(0))
        .attr("fill-opacity", config.styling.fillOpacity)
        .attr("stroke", colorScale(0))
        .attr("stroke-width", config.styling.strokeWidth)
        .attr("stroke-opacity", config.styling.opacity);
    }

    // Draw points
    const circles = g
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 4)
      .attr("fill", (d, i) => colorScale(Math.floor(i / 10)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9);

    // Add tooltip
    if (config.tooltip.enabled) {
      const tooltip = d3
        .select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);

      circles
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(`<strong>${d.id}</strong><br/>Connections: ${d.connections}`)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(200).style("opacity", 0);
        });

      return () => tooltip.remove();
    }

    // Add axes
    if (config.axes.x.show) {
      const xScale = d3
        .scaleLinear()
        .domain([0, innerWidth])
        .range([0, innerWidth]);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(config.axes.x.tickCount))
        .append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 35)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(config.axes.x.label);
    }

    if (config.axes.y.show) {
      const yScale = d3
        .scaleLinear()
        .domain([0, innerHeight])
        .range([innerHeight, 0]);

      g.append("g")
        .call(d3.axisLeft(yScale).ticks(config.axes.y.tickCount))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -45)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(config.axes.y.label);
    }
  }, [data]);

  return (
    <div
      style={{ padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}
    >
      <svg
        ref={svgRef}
        style={{ background: "white", borderRadius: "4px" }}
      ></svg>
    </div>
  );
};
