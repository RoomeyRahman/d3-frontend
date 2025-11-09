import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";

const Histogram = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);

  // Extract configuration
  const chartConfig = data;

  const { histogramData, xScale, yScale, valueExtent, dimensions } =
    useMemo(() => {
      if (!chartConfig?.data?.values) {
        return {
          histogramData: [],
          xScale: null,
          yScale: null,
          valueExtent: [0, 0],
          dimensions: null,
        };
      }

      // Smart detection of value field
      // Check dataMapping first, then fall back to common field names
      let valueKey =
        chartConfig.dataMapping?.x || chartConfig.dataMapping?.value || "value";

      // Validate if the key exists in the data
      const sampleItem = chartConfig.data.values[0];
      if (sampleItem && !sampleItem.hasOwnProperty(valueKey)) {
        // Try alternative keys
        const possibleKeys = ["value", "weight", "count", "amount", "y"];
        valueKey =
          possibleKeys.find((key) => sampleItem.hasOwnProperty(key)) || "value";
      }

      // Extract numeric values
      const values = chartConfig.data.values
        .map((item) => {
          const val = item[valueKey];
          return typeof val === "number" ? val : parseFloat(val);
        })
        .filter((v) => v != null && !isNaN(v) && isFinite(v));

      if (values.length === 0) {
        console.warn("No valid numeric values found in data");
        return {
          histogramData: [],
          xScale: null,
          yScale: null,
          valueExtent: [0, 0],
          dimensions: null,
        };
      }

      const min = Math.min(...values);
      const max = Math.max(...values);

      // Create histogram bins
      const numBins = chartConfig.chartSpecific?.bins || 20;
      const histogram = d3.histogram().domain([min, max]).thresholds(numBins);

      const bins = histogram(values);

      // Create scales
      const dims = chartConfig.dimensions || {
        width: 900,
        height: 600,
        margin: { top: 60, right: 40, bottom: 80, left: 80 },
      };

      const innerWidth = dims.width - dims.margin.left - dims.margin.right;
      const innerHeight = dims.height - dims.margin.top - dims.margin.bottom;

      const xScale = d3
        .scaleLinear()
        .domain([min, max])
        .range([0, innerWidth])
        .nice();

      const yMax = Math.max(...bins.map((d) => d.length)) || 1;
      const useLogScale = chartConfig.scales?.y?.type === "log";

      let yScale;
      if (useLogScale && yMax > 1) {
        yScale = d3
          .scaleLog()
          .domain([1, yMax])
          .range([innerHeight, 0])
          .clamp(true);
      } else {
        yScale = d3
          .scaleLinear()
          .domain([0, yMax])
          .range([innerHeight, 0])
          .nice();
      }

      return {
        histogramData: bins,
        xScale,
        yScale,
        valueExtent: [min, max],
        dimensions: dims,
        valueKey,
      };
    }, [chartConfig]);

  useEffect(() => {
    if (
      !svgRef.current ||
      !xScale ||
      !yScale ||
      histogramData.length === 0 ||
      !dimensions
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height, margin } = dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yScale.ticks(8))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.7);

    // Draw bars
    const binColor = chartConfig.styling?.binColor || "#6366f1";
    const fillOpacity = chartConfig.styling?.fillOpacity || 0.7;
    const strokeWidth =
      chartConfig.styling?.strokeWidth !== undefined
        ? chartConfig.styling.strokeWidth
        : 1;

    g.selectAll(".bar")
      .data(histogramData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.x0) + 1)
      .attr("y", (d) => (d.length > 0 ? yScale(d.length) : yScale(0)))
      .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
      .attr("height", (d) =>
        d.length > 0 ? innerHeight - yScale(d.length) : 0
      )
      .attr("fill", binColor)
      .attr("opacity", fillOpacity)
      .attr("stroke", strokeWidth > 0 ? d3.rgb(binColor).darker(0.5) : "none")
      .attr("stroke-width", strokeWidth)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 1)
          .attr("stroke-width", Math.max(strokeWidth, 2));

        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("opacity", 1)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 10 + "px").html(`
              <div style="
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-size: 13px;
                line-height: 1.6;
                border: 1px solid rgba(255,255,255,0.1);
              ">
                <div style="font-weight: 700; color: #60A5FA; margin-bottom: 6px;">Bin Range</div>
                <div><span style="color: #CBD5E1;">From:</span> <span style="font-weight: 600;">${d.x0.toFixed(
                  1
                )}</span></div>
                <div><span style="color: #CBD5E1;">To:</span> <span style="font-weight: 600;">${d.x1.toFixed(
                  1
                )}</span></div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #CBD5E1;">Frequency:</span> <span style="font-weight: 700; color: #10B981; font-size: 14px;">${
                    d.length
                  }</span>
                </div>
              </div>
            `);
        }
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", fillOpacity)
          .attr("stroke-width", strokeWidth);

        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("opacity", 0);
        }
      });

    // Add axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(chartConfig.axes?.x?.tickCount || 10)
      .tickFormat(d3.format(".0f"));

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "500");

    const yAxisFormat =
      chartConfig.scales?.y?.type === "log"
        ? (d) => (d >= 1 ? d3.format("d")(d) : d3.format(".1f")(d))
        : d3.format("d");

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(chartConfig.axes?.y?.tickCount || 8)
      .tickFormat(yAxisFormat);

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "500");

    // X-axis label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(chartConfig.axes?.x?.label || "Value");

    // Y-axis label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -55)
      .attr("x", -innerHeight / 2)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(chartConfig.axes?.y?.label || "Frequency");

    // Title
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", 30)
      .style("font-size", "18px")
      .style("font-weight", "700")
      .style("fill", "#111827")
      .text(chartConfig.accessibility?.ariaLabel || "Histogram Distribution");

    // Add statistics box
    const allValues = histogramData.flatMap((bin) => bin);
    const totalCount = histogramData.reduce((sum, bin) => sum + bin.length, 0);
    const mean = d3.mean(allValues) || 0;
    const median = d3.median(allValues) || 0;

    const stats = g
      .append("g")
      .attr("class", "stats")
      .attr("transform", `translate(${innerWidth - 150}, 10)`);

    stats
      .append("rect")
      .attr("width", 140)
      .attr("height", 85)
      .attr("fill", "white")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 1)
      .attr("rx", 6);

    stats
      .append("text")
      .attr("x", 10)
      .attr("y", 20)
      .style("font-size", "11px")
      .style("font-weight", "700")
      .style("fill", "#6b7280")
      .text("Statistics");

    stats
      .append("text")
      .attr("x", 10)
      .attr("y", 40)
      .style("font-size", "10px")
      .style("fill", "#4b5563")
      .text(`Count: ${totalCount}`);

    stats
      .append("text")
      .attr("x", 10)
      .attr("y", 56)
      .style("font-size", "10px")
      .style("fill", "#4b5563")
      .text(`Mean: ${mean.toFixed(2)}`);

    stats
      .append("text")
      .attr("x", 10)
      .attr("y", 72)
      .style("font-size", "10px")
      .style("fill", "#4b5563")
      .text(`Median: ${median.toFixed(2)}`);
  }, [histogramData, xScale, yScale, chartConfig, dimensions]);

  if (!chartConfig?.data?.values) {
    return (
      <div
        className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200"
        style={{ height: 600 }}
      >
        <div className="text-center">
          <div className="text-gray-500 text-lg">No data provided</div>
        </div>
      </div>
    );
  }

  if (histogramData.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200"
        style={{ height: 600 }}
      >
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">
            No valid data to display
          </div>
          <div className="text-gray-400 text-sm">
            Looking for numeric field:{" "}
            {chartConfig.dataMapping?.x ||
              chartConfig.dataMapping?.value ||
              "value"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex flex-col gap-2 mb-4">
        <p className="text-sm text-gray-600">
          {chartConfig.accessibility?.description ||
            "Distribution of values in the dataset"}
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} className="mx-auto" />
      </div>

      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 transition-opacity"
        style={{ zIndex: 1000 }}
      />
    </div>
  );
};

export default Histogram;
