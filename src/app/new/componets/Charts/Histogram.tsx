"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
  width: number;
  density: number;
}

interface ChartData {
  processed_data?: HistogramBin[];
  bins?: HistogramBin[];
  field_mappings?: Record<string, string>;
  chart_config: {
    dimensions: {
      width: number;
      height: number;
      margin?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
      };
    };
    scales?: {
      x?: {
        domain: [number, number];
      };
      y?: {
        domain: [number, number];
      };
    };
  };
}

interface HistogramProps {
  data: ChartData;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  color?: string;
}

const Histogram = ({
  data,
  title = "Data Distribution Histogram",
  xAxisLabel = "Values",
  yAxisLabel = "Frequency",
  color = "#3b82f6",
}: HistogramProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { processed_data, bins, chart_config } = data;
    const { dimensions } = chart_config;
    const { width, height } = dimensions;

    // Default margins if not provided
    const margin = dimensions.margin || {
      top: 40,
      right: 30,
      bottom: 60,
      left: 60,
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    let histogramBins: any[] = [];

    if (
      processed_data &&
      Array.isArray(processed_data) &&
      processed_data.length > 0
    ) {
      // Use the processed_data array which contains HistogramBin objects
      histogramBins = processed_data.map((bin) => ({
        x0: bin.x0,
        x1: bin.x1,
        length: bin.count, // Use count property for bar height
        count: bin.count,
        data: [], // We don't have individual data points for pre-computed bins
      }));
    } else if (bins && bins.length > 0) {
      // Fallback to bins property
      histogramBins = bins.map((bin) => ({
        x0: bin.x0,
        x1: bin.x1,
        length: bin.count,
        count: bin.count,
        data: [],
      }));
    } else {
      console.warn("No valid data provided for histogram");
      return;
    }

    if (histogramBins.length === 0) {
      console.warn("No histogram bins to display");
      return;
    }

    let xExtent: [number, number];
    let maxCount: number;

    if (chart_config.scales?.x?.domain) {
      xExtent = chart_config.scales.x.domain;
    } else {
      xExtent = d3.extent(histogramBins.flatMap((d) => [d.x0, d.x1])) as [
        number,
        number
      ];
    }

    if (chart_config.scales?.y?.domain) {
      maxCount = chart_config.scales.y.domain[1];
    } else {
      maxCount = d3.max(histogramBins, (d) => d.length) || 0;
    }

    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([innerHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const bars = g
      .selectAll(".bar")
      .data(histogramBins)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.x0 || 0))
      .attr("width", (d) => {
        const barWidth = xScale(d.x1 || 0) - xScale(d.x0 || 0);
        return Math.max(1, barWidth - 1); // Ensure minimum width and gap
      })
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", (d) => (d.length === 0 ? "#e5e7eb" : color)) // Different color for zero-count bins
      .attr("opacity", (d) => (d.length === 0 ? 0.3 : 0.8)) // Lower opacity for zero-count bins
      .attr("stroke", "white")
      .attr("stroke-width", 0.5);

    // Animate bars
    bars
      .transition()
      .duration(750)
      .attr("y", (d) => yScale(d.length))
      .attr("height", (d) => innerHeight - yScale(d.length));

    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((d) => {
            if (Math.abs(d) >= 1000000) return d3.format(".2s")(d);
            if (Math.abs(d) >= 1000) return d3.format(",.0f")(d);
            return d3.format(".1f")(d);
          })
          .ticks(8)
      );

    xAxis
      .selectAll("text")
      .style("fill", "#374151")
      .style("font-size", "11px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    const yAxis = g.append("g").call(d3.axisLeft(yScale).ticks(6));

    yAxis.selectAll("text").style("fill", "#374151").style("font-size", "11px");

    // Style axis lines
    g.selectAll(".domain, .tick line")
      .style("stroke", "#d1d5db")
      .style("stroke-width", 1);

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - innerHeight / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "500")
      .text(yAxisLabel);

    g.append("text")
      .attr(
        "transform",
        `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`
      )
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "500")
      .text(xAxisLabel);

    // Add title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .style("fill", "#111827")
      .text(title);

    bars
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke-width", 2)
          .attr("stroke", "#1f2937");

        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "histogram-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(17, 24, 39, 0.95)")
          .style("color", "white")
          .style("padding", "12px 16px")
          .style("border-radius", "8px")
          .style("font-size", "13px")
          .style("pointer-events", "none")
          .style("opacity", 0)
          .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)")
          .style("z-index", "1000");

        tooltip.transition().duration(200).style("opacity", 1);

        const rangeStart = d3.format(",.0f")(d.x0 || 0);
        const rangeEnd = d3.format(",.0f")(d.x1 || 0);

        tooltip.html(`
          <div style="font-weight: 600; margin-bottom: 4px;">Range: ${rangeStart} - ${rangeEnd}</div>
          <div>Count: ${d.count || d.length}</div>
        `);

        // Position tooltip
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        }
      })
      .on("mousemove", (event) => {
        d3.select(".histogram-tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", d.length === 0 ? 0.3 : 0.8) // Restore original opacity
          .attr("stroke-width", 0.5)
          .attr("stroke", "white");

        d3.select(".histogram-tooltip").remove();
      });
  }, [data, title, xAxisLabel, yAxisLabel, color]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for histogram</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        width={data.chart_config.dimensions.width}
        height={data.chart_config.dimensions.height}
        className="w-full h-auto border border-gray-200 rounded-lg bg-white"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
};

export default Histogram;
