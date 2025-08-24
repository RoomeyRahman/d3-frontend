"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface HeatmapData {
  x: string;
  y: string;
  value: number | null;
  x_index: number;
  y_index: number;
}

interface HeatmapProps {
  data: {
    processed_data: HeatmapData[];
    data_profile: {
      total_rows: number;
      total_columns: number;
      numerical_columns: string[];
      categorical_columns: string[];
      temporal_columns: string[];
    };
    field_mappings: {
      x: string;
      y: string;
      value: string;
    };
  };
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colorScheme?: string;
  showLabels?: boolean;
  showTooltip?: boolean;
  cellPadding?: number;
  maxDisplayLabels?: number; // New prop to control label density
}

const D3Heatmap: React.FC<HeatmapProps> = ({
  data,
  width = 800,
  height = 600,
  margin = { top: 80, right: 100, bottom: 120, left: 150 }, // Increased margins
  colorScheme = "Blues",
  showLabels = false, // Changed default to false for dense data
  showTooltip = true,
  cellPadding = 2,
  maxDisplayLabels = 20, // New prop
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !data?.processed_data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get unique x and y values
    const xValues = Array.from(
      new Set(data.processed_data.map((d) => d.x))
    ).sort();
    const yValues = Array.from(
      new Set(data.processed_data.map((d) => d.y))
    ).sort();

    // Calculate dynamic dimensions based on data size
    const minCellSize = 20;
    const maxLabelLength = Math.max(
      ...xValues.map((x) => x.length),
      ...yValues.map((y) => y.length)
    );

    const dynamicWidth = Math.max(
      width,
      xValues.length * minCellSize + margin.left + margin.right
    );
    const dynamicHeight = Math.max(
      height,
      yValues.length * minCellSize + margin.top + margin.bottom
    );

    // Update SVG dimensions
    svg.attr("width", dynamicWidth).attr("height", dynamicHeight);

    const innerWidth = dynamicWidth - margin.left - margin.right;
    const innerHeight = dynamicHeight - margin.top - margin.bottom;

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(xValues)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(yValues)
      .range([0, innerHeight])
      .padding(0.05);

    // Get valid values for color scale
    const validValues = data.processed_data
      .map((d) => d.value)
      .filter((v) => v !== null && v !== undefined) as number[];

    const colorScale = d3
      .scaleSequential()
      .domain(d3.extent(validValues) as [number, number])
      .interpolator(d3[`interpolate${colorScheme}` as keyof typeof d3] as any);

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3
      .select(tooltipRef.current)
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Create cells
    g.selectAll(".cell")
      .data(data.processed_data)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (d) => xScale(d.x)!)
      .attr("y", (d) => yScale(d.y)!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => {
        if (d.value === null || d.value === undefined) {
          return "#f0f0f0";
        }
        return colorScale(d.value);
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        if (showTooltip) {
          d3.select(this).attr("stroke-width", 2).attr("stroke", "#333");

          tooltip.transition().duration(200).style("opacity", 0.9);

          tooltip
            .html(
              `
            <strong>${data.field_mappings.x}:</strong> ${d.x}<br/>
            <strong>${data.field_mappings.y}:</strong> ${d.y}<br/>
            <strong>${data.field_mappings.value}:</strong> ${
                d.value !== null ? d.value.toFixed(2) : "N/A"
              }
          `
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        }
      })
      .on("mouseout", function () {
        if (showTooltip) {
          d3.select(this).attr("stroke-width", 1).attr("stroke", "#fff");

          tooltip.transition().duration(500).style("opacity", 0);
        }
      });

    // Add value labels if enabled and cells are large enough
    const cellWidth = xScale.bandwidth();
    const cellHeight = yScale.bandwidth();
    const shouldShowLabels = showLabels && cellWidth > 40 && cellHeight > 20;

    if (shouldShowLabels) {
      g.selectAll(".label")
        .data(data.processed_data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", (d) => xScale(d.x)! + xScale.bandwidth() / 2)
        .attr("y", (d) => yScale(d.y)! + yScale.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("font-size", Math.min(cellWidth / 6, cellHeight / 3, 12) + "px")
        .style("font-weight", "bold")
        .style("fill", (d) => {
          if (d.value === null || d.value === undefined) return "#999";
          const brightness = d3.lab(colorScale(d.value)).l;
          return brightness > 50 ? "#000" : "#fff";
        })
        .text((d) => {
          if (d.value === null || d.value === undefined) return "N/A";
          if (cellWidth < 60) return d.value.toFixed(1);
          return d.value < 0.01 ? d.value.toExponential(1) : d.value.toFixed(2);
        })
        .style("pointer-events", "none");
    }

    // Add X axis with smart label handling
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(6);

    const xAxisGroup = g
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis);

    // Handle X axis labels based on data density
    const xLabels = xAxisGroup.selectAll("text");
    const totalXLabels = xValues.length;

    if (totalXLabels > 20) {
      // Show every nth label for dense data
      const step = Math.ceil(totalXLabels / 15);
      xLabels.style("display", (d, i) => (i % step === 0 ? "block" : "none"));
    }

    xLabels
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style(
        "font-size",
        Math.min(11, Math.max(8, innerWidth / totalXLabels / 6)) + "px"
      )
      .text((d) => {
        // Truncate long labels
        const text = String(d);
        return text.length > 15 ? text.substring(0, 12) + "..." : text;
      });

    // Add Y axis with smart label handling
    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(6);

    const yAxisGroup = g.append("g").attr("class", "y-axis").call(yAxis);

    // Handle Y axis labels based on data density
    const yLabels = yAxisGroup.selectAll("text");
    const totalYLabels = yValues.length;

    if (totalYLabels > 20) {
      // Show every nth label for dense data
      const step = Math.ceil(totalYLabels / 15);
      yLabels.style("display", (d, i) => (i % step === 0 ? "block" : "none"));
    }

    yLabels
      .style(
        "font-size",
        Math.min(11, Math.max(8, innerHeight / totalYLabels / 3)) + "px"
      )
      .text((d) => {
        // Truncate long labels
        const text = String(d);
        return text.length > 20 ? text.substring(0, 17) + "..." : text;
      });

    // Remove axis lines
    g.select(".x-axis .domain").remove();
    g.select(".y-axis .domain").remove();

    // Add title
    svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", dynamicWidth / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text(`${data.field_mappings.x} vs ${data.field_mappings.y} Heatmap`);

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendScale = d3
      .scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format(".2f"));

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${dynamicWidth - margin.right - legendWidth}, ${
          dynamicHeight - 40
        })`
      );

    const legendGradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    legendGradient
      .selectAll("stop")
      .data(d3.range(0, 1.01, 0.1))
      .enter()
      .append("stop")
      .attr("offset", (d) => `${d * 100}%`)
      .attr("stop-color", (d) =>
        colorScale(legendScale.invert(d * legendWidth))
      );

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legend
      .append("g")
      .attr("class", "legend-axis")
      .attr("transform", `translate(0,${legendHeight})`)
      .call(legendAxis);

    legend
      .append("text")
      .attr("class", "legend-title")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(data.field_mappings.value);
  }, [
    data,
    mounted,
    width,
    height,
    margin,
    colorScheme,
    showLabels,
    showTooltip,
  ]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse">Loading heatmap...</div>
      </div>
    );
  }

  if (!data?.processed_data || data.processed_data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">No Data Available</div>
          <div className="text-sm">
            Unable to generate heatmap visualization
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <div className="relative" style={{ minWidth: "800px" }}>
        <svg
          ref={svgRef}
          className="border border-gray-200 rounded-lg shadow-sm"
          style={{ background: "white", display: "block" }}
        />
        {showTooltip && (
          <div ref={tooltipRef} className="absolute pointer-events-none" />
        )}
      </div>

      {/* Data Statistics */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Total Data Points:</span>
            <span className="font-medium">{data.processed_data.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Unique X Values:</span>
            <span className="font-medium">
              {new Set(data.processed_data.map((d) => d.x)).size}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Unique Y Values:</span>
            <span className="font-medium">
              {new Set(data.processed_data.map((d) => d.y)).size}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Valid Values:</span>
            <span className="font-medium">
              {data.processed_data.filter((d) => d.value !== null).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default D3Heatmap;
