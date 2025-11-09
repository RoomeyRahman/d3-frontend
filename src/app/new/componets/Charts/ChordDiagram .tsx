import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export const ChordDiagram = ({ chartConfiguration }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    const { nodes, links } = chartConfiguration.data;
    const { width = 800, height = 600 } = chartConfiguration.dimensions || {};

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const outerRadius = Math.min(width, height) * 0.4;
    const innerRadius = outerRadius - 30;

    // Create a matrix from the links data
    const nodeById = new Map(nodes.map((d) => [d.id, d]));
    const matrix = [];
    const indexById = new Map();

    nodes.forEach((node, i) => {
      indexById.set(node.id, i);
      matrix[i] = new Array(nodes.length).fill(0);
    });

    links.forEach((link) => {
      const sourceIndex = indexById.get(link.source);
      const targetIndex = indexById.get(link.target);
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        matrix[sourceIndex][targetIndex] = link.value;
        matrix[targetIndex][sourceIndex] = link.value; // Make symmetric
      }
    });

    // Create chord layout
    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const ribbon = d3.ribbon().radius(innerRadius);

    const chords = chord(matrix);

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Draw the ribbons (connections)
    const ribbons = g
      .append("g")
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbon)
      .attr("fill", (d) => color(nodes[d.source.index].group))
      .attr("opacity", 0.6)
      .attr("stroke", "none")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("opacity", 0.9)
          .attr("stroke", "#000")
          .attr("stroke-width", 1);

        // Show tooltip
        const sourceNode = nodes[d.source.index];
        const targetNode = nodes[d.target.index];
        tooltip
          .style("display", "block")
          .html(
            `<strong>${sourceNode.id}</strong> ↔ <strong>${targetNode.id}</strong><br/>Strength: ${d.source.value}`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.6).attr("stroke", "none");
        tooltip.style("display", "none");
      });

    // Draw the arcs (groups)
    const group = g.append("g").selectAll("g").data(chords.groups).join("g");

    group
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => color(nodes[d.index].group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 3);

        tooltip
          .style("display", "block")
          .html(
            `<strong>${nodes[d.index].id}</strong><br/>Group: ${
              nodes[d.index].group
            }`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 2);
        tooltip.style("display", "none");
      });

    // Add labels
    group
      .append("text")
      .each((d) => {
        d.angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr("dy", ".35em")
      .attr(
        "transform",
        (d) => `
        rotate(${(d.angle * 180) / Math.PI - 90})
        translate(${outerRadius + 10})
        ${d.angle > Math.PI ? "rotate(180)" : ""}
      `
      )
      .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : "start"))
      .style("font-size", "10px")
      .style("font-family", "sans-serif")
      .text((d) => nodes[d.index].id);

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [chartConfiguration]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <svg ref={svgRef}></svg>
      <div
        style={{
          marginTop: "20px",
          maxWidth: "600px",
          textAlign: "center",
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#666",
        }}
      ></div>
    </div>
  );
};
