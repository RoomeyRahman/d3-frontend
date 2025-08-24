"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ProcessedDataPoint {
  geo_id: string;
  location_name: string;
  value: number;
}

interface ChartData {
  processed_data: ProcessedDataPoint[];
  field_mappings: {
    geo_id: string;
    location_name: string;
    value: string;
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
    scales: {
      color: {
        type: string;
        domain: number[];
        range: string[];
      };
    };
  };
}

interface ChoroplethMapProps {
  data: ChartData;
}

const ChoroplethMap = ({ data }: ChoroplethMapProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { processed_data, chart_config } = data;
    const { dimensions, scales } = chart_config;
    const { width, height, margin } = dimensions;

    // Group data by state and calculate average rate per state
    const stateData = d3.rollup(
      processed_data,
      (v) => d3.mean(v, (d) => d.value) || 0,
      (d) => d.location_name
    );

    // Convert to array format for easier handling
    const stateArray = Array.from(stateData, ([state, avgRate]) => ({
      state,
      avgRate,
    })).sort((a, b) => b.avgRate - a.avgRate);

    // Use the provided color scale configuration
    const [minValue, maxValue] = scales.color.domain;
    const colorScale = d3
      .scaleQuantize()
      .domain([minValue, maxValue])
      .range(scales.color.range as any);

    // Create main container
    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const availableWidth = width - margin.left - margin.right;
    const availableHeight = height - margin.top - margin.bottom - 80; // Space for legend

    // Calculate grid layout - arrange states in a grid
    const cols = Math.ceil(Math.sqrt(stateArray.length));
    const rows = Math.ceil(stateArray.length / cols);
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;

    // Create rectangles for each state
    const stateRects = container
      .selectAll(".state-rect")
      .data(stateArray)
      .enter()
      .append("g")
      .attr("class", "state-group")
      .attr("transform", (d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return `translate(${col * cellWidth}, ${row * cellHeight})`;
      });

    // Add rectangles
    stateRects
      .append("rect")
      .attr("class", "state-rect")
      .attr("x", 2)
      .attr("y", 2)
      .attr("width", cellWidth - 4)
      .attr("height", cellHeight - 4)
      .attr("fill", (d) => colorScale(d.avgRate))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .style("cursor", "pointer");

    // Add state names
    stateRects
      .append("text")
      .attr("class", "state-label")
      .attr("x", cellWidth / 2)
      .attr("y", cellHeight / 2 - 8)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", `${Math.min(cellWidth / 8, 10)}px`)
      .style("font-weight", "600")
      .style("fill", "#fff")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
      .text((d) => d.state);

    // Add values
    stateRects
      .append("text")
      .attr("class", "state-value")
      .attr("x", cellWidth / 2)
      .attr("y", cellHeight / 2 + 8)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", `${Math.min(cellWidth / 10, 9)}px`)
      .style("font-weight", "500")
      .style("fill", "#fff")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.8)")
      .text((d) => d.avgRate.toFixed(1));

    // Create legend
    const legendWidth = 300;
    const legendHeight = 20;
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${(width - legendWidth) / 2}, ${height - 60})`
      );

    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "choropleth-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    // Add gradient stops based on color scale
    scales.color.range.forEach((color, i) => {
      const offset = (i / (scales.color.range.length - 1)) * 100;
      gradient
        .append("stop")
        .attr("offset", `${offset}%`)
        .attr("stop-color", color);
    });

    // Legend rectangle
    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#choropleth-gradient)")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);

    // Legend axis
    const legendScale = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .tickSize(6)
      .tickFormat(d3.format(".1f"))
      .ticks(6);

    legend
      .append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "11px")
      .style("fill", "#333");

    // Legend title
    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("fill", "#333")
      .text("Average Rate by State");

    // Add interactivity
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

    stateRects
      .on("mouseover", function (event, d) {
        d3.select(this)
          .select(".state-rect")
          .transition()
          .duration(200)
          .attr("stroke-width", 3)
          .attr("stroke", "#333")
          .style("filter", "brightness(1.1)");

        // Get county count for this state
        const countyCount = processed_data.filter(
          (county) => county.location_name === d.state
        ).length;
        const rank = stateArray.findIndex((s) => s.state === d.state) + 1;

        tooltip.style("visibility", "visible").html(`
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${
              d.state
            }</div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Average Rate:</span> 
              <span style="font-weight: 600;">${d.avgRate.toFixed(2)}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Counties:</span> 
              <span style="font-weight: 600;">${countyCount}</span>
            </div>
            <div style="color: #ccc;">
              <span>Rank:</span> 
              <span style="font-weight: 600;">${rank} of ${stateArray.length}</span>
            </div>
          `);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 15 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .select(".state-rect")
          .transition()
          .duration(200)
          .attr("stroke-width", 1)
          .attr("stroke", "#fff")
          .style("filter", "brightness(1)");

        tooltip.style("visibility", "hidden");
      });

    // Add summary statistics
    const summaryGroup = svg
      .append("g")
      .attr("class", "summary")
      .attr("transform", `translate(20, 20)`);

    const totalCounties = processed_data.length;
    const totalStates = stateArray.length;
    const overallAvg = d3.mean(processed_data, (d) => d.value) || 0;

    summaryGroup
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("fill", "#666")
      .text(
        `${totalCounties} Counties • ${totalStates} States • Avg: ${overallAvg.toFixed(
          2
        )}`
      );

    // Cleanup function
    return () => {
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
        style={{ maxWidth: "100%", height: "500px" }}
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};

export default ChoroplethMap;
