"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Type definitions
interface DataPoint {
  [key: string]: string | number;
}

interface FieldMappings {
  x: string;
  y: string;
  color?: string;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

interface ChartLayout {
  show_legend?: boolean;
  show_grid?: boolean;
  show_axes?: boolean;
  point_radius?: number;
}

interface ChartConfig {
  dimensions: ChartDimensions;
  layout?: ChartLayout;
}

interface ChartData {
  processed_data: DataPoint[];
  field_mappings: FieldMappings;
  chart_config: ChartConfig;
}

interface MasterScatterPlotProps {
  data: ChartData;
}

// Custom brush event type since d3 doesn't export it directly
interface D3BrushEvent {
  selection: [[number, number], [number, number]] | null;
  sourceEvent?: Event;
  target?: unknown;
  type?: string;
}

const MasterScatterPlot: React.FC<MasterScatterPlotProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [brushSelection, setBrushSelection] = useState<
    [[number, number], [number, number]] | null
  >(null);

  console.log(brushSelection);

  useEffect(() => {
    if (!data || !data.processed_data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { processed_data, field_mappings, chart_config } = data;
    const { dimensions } = chart_config;
    const { width, height, margin } = dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Convert string numbers to actual numbers, but preserve categorical data
    const processedData: DataPoint[] = processed_data.map((d: DataPoint) => {
      const newD: DataPoint = {};
      Object.keys(d).forEach((key) => {
        const value = d[key];
        const numValue = Number(value);
        newD[key] =
          (!isNaN(numValue) &&
            !isNaN(parseFloat(String(value))) &&
            typeof value !== "string") ||
          /^\d+\.?\d*$/.test(String(value))
            ? numValue
            : value;
      });
      return newD;
    });

    // Determine if we have color mapping (3D data)
    const hasColorMapping =
      field_mappings.color &&
      field_mappings.color !== field_mappings.x &&
      field_mappings.color !== field_mappings.y;

    // Determine data types for each axis
    const xValues = processedData.map((d) => d[field_mappings.x]);
    const yValues = processedData.map((d) => d[field_mappings.y]);

    const xIsNumeric = xValues.every((v) => typeof v === "number" && !isNaN(v));
    const yIsNumeric = yValues.every((v) => typeof v === "number" && !isNaN(v));

    // Create X scale
    let xScale: d3.ScaleLinear<number, number> | d3.ScaleBand<string>;
    if (xIsNumeric) {
      const xExtent = d3.extent(xValues as number[]) as [number, number];
      xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]).nice();
    } else {
      const xDomain = [...new Set(xValues.map(String))].sort();
      xScale = d3
        .scaleBand()
        .domain(xDomain)
        .range([0, innerWidth])
        .padding(0.1);
    }

    // Create Y scale
    let yScale: d3.ScaleLinear<number, number> | d3.ScaleBand<string>;
    if (yIsNumeric) {
      const yExtent = d3.extent(yValues as number[]) as [number, number];
      yScale = d3.scaleLinear().domain(yExtent).range([innerHeight, 0]).nice();
    } else {
      const yDomain = [...new Set(yValues.map(String))].sort();
      yScale = d3
        .scaleBand()
        .domain(yDomain)
        .range([innerHeight, 0])
        .padding(0.1);
    }

    // Enhanced color schemes for better visualization
    const colorSchemes = {
      viridis: d3.interpolateViridis,
      plasma: d3.interpolatePlasma,
      turbo: d3.interpolateTurbo,
      cool: d3.interpolateCool,
      warm: d3.interpolateWarm,
      categorical: d3.schemeCategory10,
      set3: d3.schemeSet3,
      tableau: d3.schemeTableau10,
    };

    // Color scale for 3D data
    let colorScale: (value: unknown, index?: number) => string;
    if (hasColorMapping && field_mappings.color) {
      const colorValues = processedData.map((d) => d[field_mappings.color!]);
      const colorIsNumeric = colorValues.every(
        (v) => typeof v === "number" && !isNaN(v)
      );

      if (colorIsNumeric) {
        const colorExtent = d3.extent(colorValues as number[]) as [
          number,
          number
        ];
        // Use a more vibrant color scheme
        const sequentialScale = d3
          .scaleSequential(colorSchemes.turbo)
          .domain(colorExtent);
        colorScale = (value) => sequentialScale(Number(value));
      } else {
        const colorDomain = [...new Set(colorValues.map(String))];
        // Use multiple color schemes for better distinction
        const allColors = [
          ...colorSchemes.categorical,
          ...colorSchemes.set3,
          ...colorSchemes.tableau,
        ];
        const categoricalColorScale = d3
          .scaleOrdinal<string, string>(allColors)
          .domain(colorDomain);
        colorScale = (value) => categoricalColorScale(String(value));
      }
    } else {
      // Default gradient for 2D data
      const gradientColors = ["#3b82f6", "#8b5cf6", "#ec4899"];
      const defaultScale = d3.scaleOrdinal<string, string>(gradientColors);
      colorScale = (value, index: number = 0) =>
        defaultScale(String(index % 3));
    }

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid lines
    if (chart_config.layout?.show_grid !== false) {
      // Horizontal grid lines
      if (yIsNumeric) {
        g.append("g")
          .attr("class", "grid")
          .call(
            d3
              .axisLeft(yScale as d3.ScaleLinear<number, number>)
              .tickSize(-innerWidth)
              .tickFormat(() => "")
          )
          .selectAll("line")
          .style("stroke", "#e0e0e0")
          .style("stroke-width", 1);
      }

      // Vertical grid lines
      if (xIsNumeric) {
        g.append("g")
          .attr("class", "grid")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(
            d3
              .axisBottom(xScale as d3.ScaleLinear<number, number>)
              .tickSize(-innerHeight)
              .tickFormat(() => "")
          )
          .selectAll("line")
          .style("stroke", "#e0e0e0")
          .style("stroke-width", 1);
      }
    }

    // Create tooltip
    if (tooltipRef.current) {
      const tooltip = d3
        .select(tooltipRef.current)
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)");

      // Create brush for interactivity
      const brush = d3
        .brush()
        .extent([
          [0, 0],
          [innerWidth, innerHeight],
        ])
        .on("brush end", function (event: D3BrushEvent) {
          const selection = event.selection;
          setBrushSelection(selection);

          if (!selection) {
            // Reset all dots
            dots.style("opacity", 0.8);
            return;
          }

          const [[x0, y0], [x1, y1]] = selection;

          // Highlight dots within selection
          dots.style("opacity", (d: DataPoint) => {
            let x: number, y: number;

            if (xIsNumeric) {
              x = (xScale as d3.ScaleLinear<number, number>)(
                Number(d[field_mappings.x])
              );
            } else {
              const bandScale = xScale as d3.ScaleBand<string>;
              x =
                (bandScale(String(d[field_mappings.x])) || 0) +
                bandScale.bandwidth() / 2;
            }

            if (yIsNumeric) {
              y = (yScale as d3.ScaleLinear<number, number>)(
                Number(d[field_mappings.y])
              );
            } else {
              const bandScale = yScale as d3.ScaleBand<string>;
              y =
                (bandScale(String(d[field_mappings.y])) || 0) +
                bandScale.bandwidth() / 2;
            }

            return x >= x0 && x <= x1 && y >= y0 && y <= y1 ? 1 : 0.2;
          });
        });

      // Add brush
      g.append("g").attr("class", "brush").call(brush);

      // Create dots with enhanced styling
      const dots = g
        .selectAll<SVGCircleElement, DataPoint>(".dot")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 0)
        .attr("cx", (d) => {
          if (xIsNumeric) {
            return (xScale as d3.ScaleLinear<number, number>)(
              Number(d[field_mappings.x])
            );
          } else {
            const bandScale = xScale as d3.ScaleBand<string>;
            return (
              (bandScale(String(d[field_mappings.x])) || 0) +
              bandScale.bandwidth() / 2
            );
          }
        })
        .attr("cy", (d) => {
          if (yIsNumeric) {
            return (yScale as d3.ScaleLinear<number, number>)(
              Number(d[field_mappings.y])
            );
          } else {
            const bandScale = yScale as d3.ScaleBand<string>;
            return (
              (bandScale(String(d[field_mappings.y])) || 0) +
              bandScale.bandwidth() / 2
            );
          }
        })
        .attr("fill", (d, i) =>
          hasColorMapping && field_mappings.color
            ? colorScale(d[field_mappings.color], i)
            : colorScale(i, i)
        )
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

      // Animate dots entrance with staggered timing
      dots
        .transition()
        .duration(1000)
        .delay((d, i) => i * 3)
        .attr("r", chart_config.layout?.point_radius || 5)
        .style("opacity", 0.8);

      // Add enhanced hover interactions
      dots
        .on("mouseover", function (event: MouseEvent, d: DataPoint) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", (chart_config.layout?.point_radius || 5) * 1.8)
            .style("opacity", 1)
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))");

          // Show enhanced tooltip
          let tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 6px; color: #fbbf24;">${
              field_mappings.x
            } vs ${field_mappings.y}</div>
            <div style="margin-bottom: 4px;"><strong>${
              field_mappings.x
            }:</strong> ${
            xIsNumeric
              ? Number(d[field_mappings.x]).toLocaleString()
              : String(d[field_mappings.x])
          }</div>
            <div style="margin-bottom: 4px;"><strong>${
              field_mappings.y
            }:</strong> ${
            yIsNumeric
              ? Number(d[field_mappings.y]).toLocaleString()
              : String(d[field_mappings.y])
          }</div>
          `;

          if (hasColorMapping && field_mappings.color) {
            const colorValue = d[field_mappings.color];
            const colorIsNum =
              typeof colorValue === "number" && !isNaN(colorValue);
            tooltipContent += `<div><strong>${field_mappings.color}:</strong> ${
              colorIsNum
                ? Number(colorValue).toLocaleString()
                : String(colorValue)
            }</div>`;
          }

          tooltip
            .style("opacity", 1)
            .html(tooltipContent)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 15 + "px");
        })
        .on("mousemove", function (event: MouseEvent) {
          tooltip
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 15 + "px");
        })
        .on("mouseout", function (this: SVGCircleElement) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", chart_config.layout?.point_radius || 5)
            .style("opacity", 0.8)
            .attr("stroke-width", 1)
            .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

          tooltip.style("opacity", 0);
        });

      // Add axes
      if (chart_config.layout?.show_axes !== false) {
        // X-axis
        g.append("g")
          .attr("class", "x-axis")
          .attr("transform", `translate(0,${innerHeight})`)
          .call(
            xIsNumeric
              ? d3
                  .axisBottom(xScale as d3.ScaleLinear<number, number>)
                  .tickFormat(d3.format(".2s"))
              : d3.axisBottom(xScale as d3.ScaleBand<string>)
          )
          .selectAll("text")
          .style("fill", "#374151")
          .style("font-size", "12px");

        // Y-axis
        g.append("g")
          .attr("class", "y-axis")
          .call(
            yIsNumeric
              ? d3
                  .axisLeft(yScale as d3.ScaleLinear<number, number>)
                  .tickFormat(d3.format(".2s"))
              : d3.axisLeft(yScale as d3.ScaleBand<string>)
          )
          .selectAll("text")
          .style("fill", "#374151")
          .style("font-size", "12px");

        // X-axis label
        g.append("text")
          .attr("class", "x-label")
          .attr(
            "transform",
            `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`
          )
          .style("text-anchor", "middle")
          .style("fill", "#1f2937")
          .style("font-size", "14px")
          .style("font-weight", "600")
          .text(field_mappings.x);

        // Y-axis label
        g.append("text")
          .attr("class", "y-label")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left + 15)
          .attr("x", 0 - innerHeight / 2)
          .style("text-anchor", "middle")
          .style("fill", "#1f2937")
          .style("font-size", "14px")
          .style("font-weight", "600")
          .text(field_mappings.y);
      }

      // Add color legend for 3D data
      if (
        hasColorMapping &&
        field_mappings.color &&
        chart_config.layout?.show_legend !== false
      ) {
        const colorValues = processedData.map((d) => d[field_mappings.color!]);
        const colorIsNumeric = colorValues.every(
          (v) => typeof v === "number" && !isNaN(v)
        );

        if (colorIsNumeric) {
          // Numeric legend with gradient
          const legendWidth = 20;
          const legendHeight = 200;
          const legendX = innerWidth + margin.right - 35;
          const legendY = 20;

          const colorExtent = d3.extent(colorValues as number[]) as [
            number,
            number
          ];
          const legendScale = d3
            .scaleLinear()
            .domain(colorExtent)
            .range([legendHeight, 0]);

          const legendGroup = g
            .append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${legendX}, ${legendY})`);

          // Create gradient
          const defs = svg.append("defs");
          const gradientElement = defs
            .append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0)
            .attr("y1", legendHeight)
            .attr("x2", 0)
            .attr("y2", 0);

          const steps = 20;
          for (let i = 0; i <= steps; i++) {
            const value =
              colorExtent[0] + (colorExtent[1] - colorExtent[0]) * (i / steps);
            gradientElement
              .append("stop")
              .attr("offset", `${(i / steps) * 100}%`)
              .attr("stop-color", colorScale(value));
          }

          // Add legend rectangle with border
          legendGroup
            .append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)")
            .style("stroke", "#374151")
            .style("stroke-width", 1)
            .style("rx", 2);

          // Add legend axis
          legendGroup
            .append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).tickFormat(d3.format(".2s")))
            .selectAll("text")
            .style("fill", "#374151")
            .style("font-size", "10px");

          // Add legend title
          legendGroup
            .append("text")
            .attr("transform", `translate(${legendWidth / 2}, -10)`)
            .style("text-anchor", "middle")
            .style("fill", "#1f2937")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .text(field_mappings.color);
        } else {
          // Categorical legend with color swatches
          const uniqueValues = [...new Set(colorValues.map(String))];
          const legendX = innerWidth + margin.right - 150;
          const legendY = 20;

          const legendGroup = g
            .append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${legendX}, ${legendY})`);

          // Add legend title
          legendGroup
            .append("text")
            .attr("x", 75)
            .attr("y", -5)
            .style("text-anchor", "middle")
            .style("fill", "#1f2937")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .text(field_mappings.color);

          // Add legend items
          const legendItems = legendGroup
            .selectAll(".legend-item")
            .data(uniqueValues)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 22 + 10})`);

          // Add color circles (instead of squares for consistency)
          legendItems
            .append("circle")
            .attr("cx", 8)
            .attr("cy", 8)
            .attr("r", 6)
            .style("fill", (d) => colorScale(d))
            .style("stroke", "#fff")
            .style("stroke-width", 1.5)
            .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

          // Add labels
          legendItems
            .append("text")
            .attr("x", 20)
            .attr("y", 8)
            .attr("dy", "0.35em")
            .style("fill", "#374151")
            .style("font-size", "11px")
            .text((d) => String(d));
        }
      }

      // Add zoom functionality (only for numeric axes)
      if (xIsNumeric && yIsNumeric) {
        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.5, 10])
          .on("zoom", function (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
            const { transform } = event;

            // Update scales
            const newXScale = transform.rescaleX(
              xScale as d3.ScaleLinear<number, number>
            );
            const newYScale = transform.rescaleY(
              yScale as d3.ScaleLinear<number, number>
            );

            // Update dots
            dots
              .attr("cx", (d) => newXScale(Number(d[field_mappings.x])))
              .attr("cy", (d) => newYScale(Number(d[field_mappings.y])));

            // Update axes
            g.select<SVGGElement>(".x-axis").call(
              d3.axisBottom(newXScale).tickFormat(d3.format(".2s"))
            );
            g.select<SVGGElement>(".y-axis").call(
              d3.axisLeft(newYScale).tickFormat(d3.format(".2s"))
            );

            // Update grid
            g.selectAll(".grid").remove();
            if (chart_config.layout?.show_grid !== false) {
              g.append("g")
                .attr("class", "grid")
                .call(
                  d3
                    .axisLeft(newYScale)
                    .tickSize(-innerWidth)
                    .tickFormat(() => "")
                )
                .selectAll("line")
                .style("stroke", "#e0e0e0")
                .style("stroke-width", 1);

              g.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(
                  d3
                    .axisBottom(newXScale)
                    .tickSize(-innerHeight)
                    .tickFormat(() => "")
                )
                .selectAll("line")
                .style("stroke", "#e0e0e0")
                .style("stroke-width", 1);
            }
          });

        svg.call(zoom);

        // Double-click to reset zoom
        svg.on("dblclick.zoom", function () {
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        });
      }
    }

    // Clean up function
    return () => {
      svg.selectAll("*").remove();
    };
  }, [data]);

  if (!data || !data.processed_data) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No data available</div>
          <div className="text-sm text-gray-400">
            Please provide valid data configuration
          </div>
        </div>
      </div>
    );
  }

  const { dimensions } = data.chart_config;

  return (
    <div className="relative w-full flex items-center flex-col justify-center">
      <div className="w-full">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full"
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        />
        <div ref={tooltipRef} />
      </div>
      {/* Add interaction instructions */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over points for details • Drag to brush select • Double-click to
        reset zoom
      </div>
    </div>
  );
};

export default MasterScatterPlot;
