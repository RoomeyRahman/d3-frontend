"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface LineChartData {
  name?: string;
  year?: number;
  value?: number;
  [key: string]: any;
}

interface LineChartProps {
  data: {
    processed_data: LineChartData[];
    data_profile?: {
      total_rows: number;
      total_columns: number;
      numerical_columns: string[];
      categorical_columns: string[];
      temporal_columns: string[];
    };
    field_mappings?: {
      x: string;
      y: string;
      group?: string;
    };
    chart_config?: {
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
  showPoints?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 900,
  height = 500,
  margin = { top: 40, right: 150, bottom: 80, left: 100 },
  showPoints = true,
  showTooltip = true,
  animate = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !data?.processed_data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const processedData = data.processed_data;
    if (processedData.length === 0) return;

    // Auto-detect data structure
    const firstItem = processedData[0];
    const keys = Object.keys(firstItem);

    // Use provided field mappings or auto-detect
    let xField = data.field_mappings?.x;
    let yField = data.field_mappings?.y;
    let groupField = data.field_mappings?.group;

    if (!xField) {
      xField =
        keys.find((k) =>
          ["year", "date", "time", "x"].some((field) =>
            k.toLowerCase().includes(field)
          )
        ) || "year";
    }

    if (!yField) {
      yField =
        keys.find(
          (k) =>
            ["value", "amount", "count", "y"].some((field) =>
              k.toLowerCase().includes(field)
            ) || typeof firstItem[k] === "number"
        ) || "value";
    }

    if (!groupField && keys.length > 2) {
      groupField =
        keys.find(
          (k) =>
            k !== xField &&
            k !== yField &&
            ["name", "category", "group", "series"].some((field) =>
              k.toLowerCase().includes(field)
            )
        ) || "name";
    }

    // Use chart config dimensions if available
    const chartWidth = data.chart_config?.dimensions.width || width;
    const chartHeight = data.chart_config?.dimensions.height || height;
    const chartMargin = data.chart_config?.dimensions.margin || margin;

    const innerWidth = chartWidth - chartMargin.left - chartMargin.right;
    const innerHeight = chartHeight - chartMargin.top - chartMargin.bottom;

    svg.attr("width", chartWidth).attr("height", chartHeight);

    // Clean and prepare data
    const cleanedData = processedData
      .filter(
        (d) => d[xField!] != null && d[yField!] != null && !isNaN(+d[yField!])
      )
      .map((d) => ({
        ...d,
        [xField!]: +d[xField!], // Convert to number for years
        [yField!]: +d[yField!],
      }))
      .sort((a, b) => +a[xField!] - +b[yField!]);

    if (cleanedData.length === 0) return;

    // Group data by group field if it exists
    const groupedData =
      groupField && cleanedData[0][groupField]
        ? Array.from(d3.group(cleanedData, (d) => d[groupField!]).entries())
        : [["All Data", cleanedData]];

    // Create scales
    const xExtent = d3.extent(cleanedData, (d) => +d[xField!]) as [
      number,
      number
    ];
    const yExtent = d3.extent(cleanedData, (d) => +d[yField!]) as [
      number,
      number
    ];

    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .nice()
      .range([innerHeight, 0]);

    // Color scale for multiple lines
    const colorScale = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(groupedData.map(([key]) => key));

    const g = svg
      .append("g")
      .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);

    // Line generator
    const line = d3
      .line<any>()
      .x((d) => xScale(+d[xField!]))
      .y((d) => yScale(+d[yField!]))
      .curve(d3.curveMonotoneX);

    // Draw lines for each group
    groupedData.forEach(([groupName, groupData]) => {
      const color = colorScale(groupName);
      const sortedGroupData = groupData.sort(
        (a, b) => +a[xField!] - +b[xField!]
      );

      // Draw line
      const path = g
        .append("path")
        .datum(sortedGroupData)
        .attr("class", `line-${groupName.toString().replace(/\s+/g, "-")}`)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line);

      // Animate line drawing
      if (animate) {
        const totalLength =
          (path.node() as SVGPathElement)?.getTotalLength() || 0;
        path
          .attr("stroke-dasharray", totalLength + " " + totalLength)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(1500)
          .attr("stroke-dashoffset", 0);
      }

      // Add points
      if (showPoints) {
        const dots = g
          .selectAll(`.dot-${groupName.toString().replace(/\s+/g, "-")}`)
          .data(sortedGroupData)
          .enter()
          .append("circle")
          .attr("class", `dot dot-${groupName.toString().replace(/\s+/g, "-")}`)
          .attr("cx", (d) => xScale(+d[xField!]))
          .attr("cy", (d) => yScale(+d[yField!]))
          .attr("r", 4)
          .attr("fill", color)
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .style("opacity", animate ? 0 : 1)
          .style("cursor", "pointer");

        if (animate) {
          dots
            .transition()
            .delay((d, i) => i * 30 + 1500)
            .duration(300)
            .style("opacity", 1);
        }

        // Add tooltip events only if tooltip ref exists
        if (showTooltip && tooltipRef.current) {
          const tooltip = d3
            .select(tooltipRef.current)
            .style("opacity", "0")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          dots
            .on("mouseover", function (event, d) {
              d3.select(this).transition().duration(200).attr("r", 6);

              tooltip.transition().duration(200).style("opacity", "0.9");

              const tooltipContent = `
                <strong>${
                  groupField && d[groupField] ? d[groupField] : "Value"
                }</strong><br/>
                <strong>${xField}:</strong> ${d[xField!]}<br/>
                <strong>${yField}:</strong> ${d3.format(",")(d[yField!])}
              `;

              tooltip
                .html(tooltipContent)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 28 + "px");
            })
            .on("mouseout", function () {
              d3.select(this).transition().duration(200).attr("r", 4);

              tooltip.transition().duration(500).style("opacity", "0");
            });
        }
      }
    });

    // Add grid lines
    g.selectAll(".grid-line-x")
      .data(xScale.ticks(8))
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 1);

    g.selectAll(".grid-line-y")
      .data(yScale.ticks(6))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 1);

    // Add X axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("fill", "black")
      .style("font-size", "12px");

    // Add Y axis
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".2s")))
      .selectAll("text")
      .style("fill", "black")
      .style("font-size", "12px");

    // Add axis labels
    g.append("text")
      .attr("class", "y-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - chartMargin.left)
      .attr("x", 0 - innerHeight / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "black")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(yField.charAt(0).toUpperCase() + yField.slice(1));

    g.append("text")
      .attr("class", "x-label")
      .attr(
        "transform",
        `translate(${innerWidth / 2}, ${innerHeight + chartMargin.bottom - 20})`
      )
      .style("text-anchor", "middle")
      .style("fill", "black")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(xField.charAt(0).toUpperCase() + xField.slice(1));

    // Add legend if multiple groups
    if (groupedData.length > 1) {
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr(
          "transform",
          `translate(${chartWidth - chartMargin.right + 10}, ${
            chartMargin.top
          })`
        );

      const legendItems = legend
        .selectAll(".legend-item")
        .data(groupedData.map(([key]) => key))
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

      legendItems
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", (d) => colorScale(d))
        .attr("stroke-width", 3);

      legendItems
        .append("text")
        .attr("x", 25)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "black")
        .text((d) => (d.length > 20 ? d.substring(0, 17) + "..." : d));
    }
  }, [data, isClient, width, height, margin, showPoints, showTooltip, animate]);

  // Server-side rendering placeholder
  if (!isClient) {
    return (
      <div
        className="flex items-center justify-center border border-gray-200 rounded-lg bg-white"
        style={{ width: width || 900, height: height || 500 }}
      >
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (!data?.processed_data || data.processed_data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 border border-gray-200 rounded-lg bg-white"
        style={{ width: width || 900, height: height || 500 }}
      >
        <div className="text-center">
          <div className="text-lg mb-2">No Data Available</div>
          <div className="text-sm">
            Unable to generate line chart visualization
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        <svg
          ref={svgRef}
          className="border border-gray-200 rounded-lg shadow-sm bg-white"
        />
        {showTooltip && (
          <div ref={tooltipRef} className="pointer-events-none absolute" />
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
            <span>Data Series:</span>
            <span className="font-medium">
              {data.processed_data[0]?.name
                ? new Set(data.processed_data.map((d) => d.name)).size
                : 1}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Year Range:</span>
            <span className="font-medium">
              {Math.min(...data.processed_data.map((d) => d.year || 0))} -{" "}
              {Math.max(...data.processed_data.map((d) => d.year || 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineChart;
