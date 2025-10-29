"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface DataPoint {
  [key: string]: string | number;
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

interface ChartConfig {
  chartType: string;
  dataMapping?: {
    x?: string;
    y?: string;
    color?: string;
  };
  dimensions: ChartDimensions;
  data: {
    values?: DataPoint[];
    flat_data?: DataPoint[];
    processed_data?: DataPoint[];
  };
  metadata?: {
    fallback?: boolean;
    reason?: string;
  };
}

interface MasterScatterPlotProps {
  data: {
    chart_configuration: ChartConfig;
  };
}

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
    if (!data?.chart_configuration || !svgRef.current) return;

    const config = data.chart_configuration;

    // Get data from various possible locations
    const rawData =
      config.data?.values ||
      config.data?.flat_data ||
      config.data?.processed_data;

    if (!rawData || rawData.length === 0) {
      console.warn("No data available");
      return;
    }

    // Auto-detect field mappings if not provided
    const sampleData = rawData[0];
    const fields = Object.keys(sampleData);

    const fieldMappings = {
      x: config.dataMapping?.x || fields[0] || "source",
      y: config.dataMapping?.y || fields[1] || "target",
      color:
        config.dataMapping?.color ||
        (fields[2] !== "value" ? fields[2] : undefined),
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { dimensions } = config;
    const { width, height, margin } = dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Process data - convert to numbers where appropriate
    const processedData: DataPoint[] = rawData.map((d: DataPoint) => {
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

    // Determine if we have color mapping
    const hasColorMapping =
      fieldMappings.color &&
      fieldMappings.color !== fieldMappings.x &&
      fieldMappings.color !== fieldMappings.y;

    // Get values for each axis
    const xValues = processedData.map((d) => d[fieldMappings.x]);
    const yValues = processedData.map((d) => d[fieldMappings.y]);

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

    // Color scale
    let colorScale: (value: unknown, index?: number) => string;
    if (hasColorMapping && fieldMappings.color) {
      const colorValues = processedData.map((d) => d[fieldMappings.color!]);
      const colorIsNumeric = colorValues.every(
        (v) => typeof v === "number" && !isNaN(v)
      );

      if (colorIsNumeric) {
        const colorExtent = d3.extent(colorValues as number[]) as [
          number,
          number
        ];
        const sequentialScale = d3
          .scaleSequential(d3.interpolateTurbo)
          .domain(colorExtent);
        colorScale = (value) => sequentialScale(Number(value));
      } else {
        const colorDomain = [...new Set(colorValues.map(String))];
        const allColors = [
          ...d3.schemeCategory10,
          ...d3.schemeSet3,
          ...d3.schemeTableau10,
        ];
        const categoricalColorScale = d3
          .scaleOrdinal<string, string>(allColors)
          .domain(colorDomain);
        colorScale = (value) => categoricalColorScale(String(value));
      }
    } else {
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

      // Create brush
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
            dots.style("opacity", 0.8);
            return;
          }

          const [[x0, y0], [x1, y1]] = selection;

          dots.style("opacity", (d: DataPoint) => {
            let x: number, y: number;

            if (xIsNumeric) {
              x = (xScale as d3.ScaleLinear<number, number>)(
                Number(d[fieldMappings.x])
              );
            } else {
              const bandScale = xScale as d3.ScaleBand<string>;
              x =
                (bandScale(String(d[fieldMappings.x])) || 0) +
                bandScale.bandwidth() / 2;
            }

            if (yIsNumeric) {
              y = (yScale as d3.ScaleLinear<number, number>)(
                Number(d[fieldMappings.y])
              );
            } else {
              const bandScale = yScale as d3.ScaleBand<string>;
              y =
                (bandScale(String(d[fieldMappings.y])) || 0) +
                bandScale.bandwidth() / 2;
            }

            return x >= x0 && x <= x1 && y >= y0 && y <= y1 ? 1 : 0.2;
          });
        });

      g.append("g").attr("class", "brush").call(brush);

      // Create dots
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
              Number(d[fieldMappings.x])
            );
          } else {
            const bandScale = xScale as d3.ScaleBand<string>;
            return (
              (bandScale(String(d[fieldMappings.x])) || 0) +
              bandScale.bandwidth() / 2
            );
          }
        })
        .attr("cy", (d) => {
          if (yIsNumeric) {
            return (yScale as d3.ScaleLinear<number, number>)(
              Number(d[fieldMappings.y])
            );
          } else {
            const bandScale = yScale as d3.ScaleBand<string>;
            return (
              (bandScale(String(d[fieldMappings.y])) || 0) +
              bandScale.bandwidth() / 2
            );
          }
        })
        .attr("fill", (d, i) =>
          hasColorMapping && fieldMappings.color
            ? colorScale(d[fieldMappings.color], i)
            : colorScale(i, i)
        )
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

      // Animate dots
      dots
        .transition()
        .duration(1000)
        .delay((d, i) => i * 3)
        .attr("r", 5)
        .style("opacity", 0.8);

      // Add hover interactions
      dots
        .on("mouseover", function (event: MouseEvent, d: DataPoint) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", 9)
            .style("opacity", 1)
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))");

          let tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 6px; color: #fbbf24;">${
              fieldMappings.x
            } vs ${fieldMappings.y}</div>
            <div style="margin-bottom: 4px;"><strong>${
              fieldMappings.x
            }:</strong> ${
            xIsNumeric
              ? Number(d[fieldMappings.x]).toLocaleString()
              : String(d[fieldMappings.x])
          }</div>
            <div style="margin-bottom: 4px;"><strong>${
              fieldMappings.y
            }:</strong> ${
            yIsNumeric
              ? Number(d[fieldMappings.y]).toLocaleString()
              : String(d[fieldMappings.y])
          }</div>
          `;

          if (hasColorMapping && fieldMappings.color) {
            const colorValue = d[fieldMappings.color];
            const colorIsNum =
              typeof colorValue === "number" && !isNaN(colorValue);
            tooltipContent += `<div><strong>${fieldMappings.color}:</strong> ${
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
            .attr("r", 5)
            .style("opacity", 0.8)
            .attr("stroke-width", 1)
            .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

          tooltip.style("opacity", 0);
        });

      // Add axes
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
        .style("font-size", "12px")
        .attr("transform", xIsNumeric ? "" : "rotate(-45)")
        .style("text-anchor", xIsNumeric ? "middle" : "end");

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

      // Axis labels
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
        .text(fieldMappings.x);

      g.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 15)
        .attr("x", 0 - innerHeight / 2)
        .style("text-anchor", "middle")
        .style("fill", "#1f2937")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text(fieldMappings.y);

      // Add color legend if applicable
      if (hasColorMapping && fieldMappings.color) {
        const colorValues = processedData.map((d) => d[fieldMappings.color!]);
        const colorIsNumeric = colorValues.every(
          (v) => typeof v === "number" && !isNaN(v)
        );

        if (colorIsNumeric) {
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

          legendGroup
            .append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)")
            .style("stroke", "#374151")
            .style("stroke-width", 1)
            .style("rx", 2);

          legendGroup
            .append("g")
            .attr("class", "legend-axis")
            .attr("transform", `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).tickFormat(d3.format(".2s")))
            .selectAll("text")
            .style("fill", "#374151")
            .style("font-size", "10px");

          legendGroup
            .append("text")
            .attr("transform", `translate(${legendWidth / 2}, -10)`)
            .style("text-anchor", "middle")
            .style("fill", "#1f2937")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .text(fieldMappings.color);
        }
      }

      // Add zoom for numeric axes
      if (xIsNumeric && yIsNumeric) {
        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.5, 10])
          .on("zoom", function (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
            const { transform } = event;

            const newXScale = transform.rescaleX(
              xScale as d3.ScaleLinear<number, number>
            );
            const newYScale = transform.rescaleY(
              yScale as d3.ScaleLinear<number, number>
            );

            dots
              .attr("cx", (d) => newXScale(Number(d[fieldMappings.x])))
              .attr("cy", (d) => newYScale(Number(d[fieldMappings.y])));

            g.select<SVGGElement>(".x-axis").call(
              d3.axisBottom(newXScale).tickFormat(d3.format(".2s"))
            );
            g.select<SVGGElement>(".y-axis").call(
              d3.axisLeft(newYScale).tickFormat(d3.format(".2s"))
            );

            g.selectAll(".grid").remove();
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
          });

        svg.call(zoom);

        svg.on("dblclick.zoom", function () {
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        });
      }
    }

    return () => {
      svg.selectAll("*").remove();
    };
  }, [data]);

  if (!data?.chart_configuration) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-gray-500 mb-2">No data available</div>
          <div className="text-sm text-gray-400">
            Please provide valid chart configuration
          </div>
        </div>
      </div>
    );
  }

  const config = data.chart_configuration;
  const { dimensions } = config;

  return (
    <div className="relative w-full flex items-center flex-col justify-center p-4">
      {config.metadata?.fallback && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
          <span className="font-semibold text-orange-800">Fallback Mode: </span>
          <span className="text-orange-600">{config.metadata.reason}</span>
        </div>
      )}
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
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over points for details • Drag to brush select • Double-click to
        reset zoom
      </div>
    </div>
  );
};

export default MasterScatterPlot;
