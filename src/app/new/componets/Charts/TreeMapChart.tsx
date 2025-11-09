import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const TreemapChart = ({ data }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (
      !data ||
      !data.chart_configuration ||
      !data.chart_configuration.data ||
      !data.chart_configuration.data.flat_data
    ) {
      return;
    }

    const flatData = data.chart_configuration.data.flat_data;
    const config = data.chart_configuration;
    const { width, height } = config.dimensions;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create hierarchical data structure from flat network data
    // Group by source to create a tree structure
    const nodeMap = new Map();
    const root = { name: "Characters", children: [] };

    // Aggregate values by source character
    const sourceAggregation = new Map();
    flatData.forEach((d) => {
      if (!sourceAggregation.has(d.source)) {
        sourceAggregation.set(d.source, 0);
      }
      sourceAggregation.set(
        d.source,
        sourceAggregation.get(d.source) + d.value
      );
    });

    // Create children nodes for the root
    sourceAggregation.forEach((value, name) => {
      root.children.push({
        name: name,
        value: value,
      });
    });

    // Create hierarchy
    const hierarchy = d3
      .hierarchy(root)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);

    // Create treemap layout
    const treemap = d3
      .treemap()
      .size([width, height])
      .paddingInner(config.chartSpecific.paddingInner)
      .round(config.chartSpecific.round);

    // Apply treemap layout
    const treeRoot = treemap(hierarchy);

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("aria-label", config.accessibility.ariaLabel);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create cells
    const cell = svg
      .selectAll("g")
      .data(treeRoot.leaves())
      .join("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    cell
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => colorScale(d.data.name))
      .attr("stroke", "#fff")
      .attr("stroke-width", config.styling.strokeWidth)
      .attr("opacity", config.styling.fillOpacity)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("opacity", 1)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);

        // Show tooltip
        tooltip
          .style("display", "block")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px")
          .html(`<strong>${d.data.name}</strong><br/>Value: ${d.data.value}`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("opacity", config.styling.fillOpacity)
          .attr("stroke", "#fff")
          .attr("stroke-width", config.styling.strokeWidth);

        tooltip.style("display", "none");
      });

    // Add text labels
    cell
      .append("text")
      .attr("x", 4)
      .attr("y", 14)
      .attr("font-size", config.styling.fontSize)
      .attr("font-family", config.styling.fontFamily)
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .text((d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        // Only show text if cell is large enough
        if (width > 30 && height > 20) {
          return d.data.name;
        }
        return "";
      })
      .each(function (d) {
        const width = d.x1 - d.x0;
        const textLength = this.getComputedTextLength();
        if (textLength > width - 8) {
          // Truncate text if too long
          let text = d.data.name;
          while (textLength > width - 8 && text.length > 0) {
            text = text.slice(0, -1);
            d3.select(this).text(text + "...");
            if (this.getComputedTextLength() <= width - 8) break;
          }
        }
      });

    // Add value labels
    cell
      .append("text")
      .attr("x", 4)
      .attr("y", 28)
      .attr("font-size", "10px")
      .attr("font-family", config.styling.fontFamily)
      .attr("fill", "#333")
      .text((d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width > 30 && height > 35) {
          return d.data.value;
        }
        return "";
      });

    // Create tooltip
    const tooltip = d3
      .select("body")
      .selectAll(".treemap-tooltip")
      .data([null])
      .join("div")
      .attr("class", "treemap-tooltip")
      .style("position", "absolute")
      .style("display", "none")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");
  }, [data]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default TreemapChart;
