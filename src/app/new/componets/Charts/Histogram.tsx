"use client";

import type React from "react";
import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";

interface HistogramConfig {
  chart_configuration: {
    chartType: string;
    dataMapping: {
      value: string;
    };
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
      x: {
        type: string;
        domain: string;
        range: (number | string)[];
        nice: boolean;
      };
      y: {
        type: string;
        domain: string;
        range: (number | string)[];
        nice: boolean;
        clamp: boolean;
      };
    };
    axes: {
      x: {
        show: boolean;
        label: string;
        tickFormat: string;
        tickCount: number;
      };
      y: {
        show: boolean;
        label: string;
        tickFormat: string;
        tickCount: number;
      };
    };
    tooltip: {
      enabled: boolean;
      template: string;
      fields: string[];
    };
    interactions: {
      zoom: boolean;
      pan: boolean;
      hover: boolean;
      brush: boolean;
    };
    styling: {
      colorScheme: string;
      strokeWidth: number;
      opacity: number;
      fillOpacity: number;
      binColor: string;
    };
    chartSpecific: {
      bins: number;
      thresholds: string;
    };
    accessibility: {
      ariaLabel: string;
      description: string;
    };
    data: {
      values: Array<{
        source: string;
        target: string;
        value: number;
      }>;
    };
  };
}

interface HistogramBin {
  x0: number;
  x1: number;
  length: number;
}

const Histogram: React.FC<{ data: HistogramConfig }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartConfig = data.chart_configuration;

  const { histogramData, xScale, yScale } = useMemo(() => {
    const values = chartConfig.data.values.map((item) => item.value);

    if (values.length === 0) {
      return { histogramData: [], xScale: null, yScale: null };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    const histogram = d3
      .histogram()
      .domain([min, max])
      .thresholds(chartConfig.chartSpecific.bins);

    const bins = histogram(values) as HistogramBin[];

    const xScale = d3
      .scaleLinear()
      .domain([min, max])
      .range([
        0,
        chartConfig.dimensions.width -
          chartConfig.dimensions.margin.left -
          chartConfig.dimensions.margin.right,
      ])
      .nice();

    const yMax = Math.max(...bins.map((d) => d.length));
    const yScale =
      chartConfig.scales.y.type === "log"
        ? d3
            .scaleLog()
            .domain([1, yMax])
            .range([
              chartConfig.dimensions.height -
                chartConfig.dimensions.margin.top -
                chartConfig.dimensions.margin.bottom,
              0,
            ])
            .clamp(true)
        : d3
            .scaleLinear()
            .domain([0, yMax])
            .range([
              chartConfig.dimensions.height -
                chartConfig.dimensions.margin.top -
                chartConfig.dimensions.margin.bottom,
              0,
            ])
            .nice();

    return { histogramData: bins, xScale, yScale };
  }, [
    chartConfig.data.values,
    chartConfig.chartSpecific.bins,
    chartConfig.dimensions,
    chartConfig.scales.y.type,
  ]);

  useEffect(() => {
    if (!svgRef.current || !xScale || !yScale || histogramData.length === 0)
      return;

    const svg = d3.select(svgRef.current);
    const width = chartConfig.dimensions.width;
    const height = chartConfig.dimensions.height;
    const margin = chartConfig.dimensions.margin;

    // Clear previous content
    svg.selectAll("*").remove();

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat(() => "")
      );

    g.selectAll(".bar")
      .data(histogramData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.x0))
      .attr("y", (d) => yScale(d.length))
      .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
      .attr(
        "height",
        (d) => height - margin.top - margin.bottom - yScale(d.length)
      )
      .attr("fill", chartConfig.styling.binColor)
      .attr("opacity", chartConfig.styling.fillOpacity)
      .attr("stroke", chartConfig.styling.binColor)
      .attr("stroke-width", chartConfig.styling.strokeWidth)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 1);

        if (tooltipRef.current) {
          const range = `${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}`;
          tooltipRef.current.innerHTML = `
            <div class="bg-background border border-border rounded-lg p-3 shadow-lg">
              <p class="text-sm font-semibold text-foreground">Range: ${range}</p>
              <p class="text-sm text-muted-foreground">Frequency: ${d.length}</p>
            </div>
          `;
          tooltipRef.current.style.display = "block";
          tooltipRef.current.style.left = event.pageX + 10 + "px";
          tooltipRef.current.style.top = event.pageY + 10 + "px";
        }
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", chartConfig.styling.fillOpacity);
        if (tooltipRef.current) {
          tooltipRef.current.style.display = "none";
        }
      });

    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(chartConfig.axes.x.tickCount))
      .append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", 40)
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .attr("class", "text-sm font-medium")
      .text(chartConfig.axes.x.label);

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(chartConfig.axes.y.tickCount))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(height - margin.top - margin.bottom) / 2)
      .attr("y", -40)
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .attr("class", "text-sm font-medium")
      .text(chartConfig.axes.y.label);

    svg.selectAll("text").attr("fill", "currentColor").attr("class", "text-xs");
  }, [histogramData, xScale, yScale, chartConfig]);

  return (
    <div className="w-full flex flex-col gap-4 p-6 bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {chartConfig.axes.x.label} Distribution
        </h2>
        <p className="text-sm text-muted-foreground">
          {chartConfig.accessibility.description}
        </p>
      </div>

      {/* Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          className="mx-auto"
          aria-label={chartConfig.accessibility.ariaLabel}
        />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none"
        style={{ display: "none", zIndex: 1000 }}
      />
    </div>
  );
};

export default Histogram;
