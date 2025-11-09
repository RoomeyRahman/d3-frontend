import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export const LineChart = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !svgRef.current || !data) return;

    // Extract configuration and data
    const config = data.chart_configuration || data;
    const rawData = config.data?.values || data.data?.values || [];

    if (!rawData.length) return;

    const { width, height, margin } = config.dimensions || {
      width: 1200,
      height: 700,
      margin: { top: 60, right: 220, bottom: 100, left: 80 },
    };

    const dataMapping = config.dataMapping || {
      x: "source",
      y: "value",
      series: "target",
    };
    const useLogScale = config.scales?.y?.type === "log";

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Extract data using mapping
    const xKey = dataMapping.x;
    const yKey = dataMapping.y || "weight";
    const seriesKey = dataMapping.series;

    // Get unique x values and series
    const allXValues = [...new Set(rawData.map((d) => d[xKey]))].sort();
    const allSeries = [...new Set(rawData.map((d) => d[seriesKey]))];

    // Group data by series
    const groupedData = d3.group(rawData, (d) => d[seriesKey]);

    // Create scales
    const xScale = d3
      .scalePoint()
      .domain(allXValues)
      .range([0, innerWidth])
      .padding(0.5);

    const yMax = d3.max(rawData, (d) => d[yKey]) || 10;
    const yMin = d3.min(rawData, (d) => d[yKey]) || 1;

    let yScale;
    if (useLogScale) {
      yScale = d3
        .scaleLog()
        .domain([Math.max(yMin, 0.5), yMax])
        .range([innerHeight, 0])
        .clamp(true);
    } else {
      yScale = d3
        .scaleLinear()
        .domain([0, yMax])
        .nice()
        .range([innerHeight, 0]);
    }

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(allSeries);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid
    g.selectAll(".grid-line-y")
      .data(yScale.ticks(8))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.6);

    // Line generator
    const line = d3
      .line()
      .x((d) => xScale(d[xKey]))
      .y((d) => yScale(d[yKey]))
      .curve(d3.curveLinear)
      .defined((d) => d[yKey] != null && d[yKey] > 0);

    // Draw lines for each series (only top 10 for visibility)
    const topSeries = Array.from(groupedData.entries())
      .sort(
        (a, b) => d3.sum(b[1], (d) => d[yKey]) - d3.sum(a[1], (d) => d[yKey])
      )
      .slice(0, 10);

    topSeries.forEach(([seriesName, seriesData]) => {
      const sortedData = seriesData.sort((a, b) => {
        const aIdx = allXValues.indexOf(a[xKey]);
        const bIdx = allXValues.indexOf(b[xKey]);
        return aIdx - bIdx;
      });

      const color = colorScale(seriesName);

      // Draw line
      g.append("path")
        .datum(sortedData)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", line)
        .style("opacity", 0.7);

      // Draw points
      g.selectAll(`.point-${seriesName.replace(/[^a-zA-Z0-9]/g, "_")}`)
        .data(sortedData)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(d[xKey]))
        .attr("cy", (d) => yScale(d[yKey]))
        .attr("r", 3)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 5);

          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("opacity", 1)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 10 + "px").html(`
              <div style="
                background: rgba(15, 23, 42, 0.95); 
                color: white; 
                padding: 12px; 
                border-radius: 8px; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-size: 13px;
                line-height: 1.5;
                border: 1px solid rgba(255,255,255,0.1);
              ">
                <div style="font-weight: 700; color: #60A5FA; margin-bottom: 6px;">${seriesName}</div>
                <div><span style="color: #CBD5E1;">Source:</span> <span style="font-weight: 600;">${d[xKey]}</span></div>
                <div><span style="color: #CBD5E1;">Weight:</span> <span style="font-weight: 600; color: #10B981;">${d[yKey]}</span></div>
              </div>
            `);
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 3);
          d3.select(tooltipRef.current).style("opacity", 0);
        });
    });

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(
            allXValues.filter(
              (_, i) => i % Math.ceil(allXValues.length / 10) === 0
            )
          )
      )
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "11px")
      .style("fill", "#374151");

    const yAxisFormat = useLogScale
      ? (d) => (d >= 1 ? d3.format("d")(d) : d3.format(".1f")(d))
      : d3.format("d");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(yAxisFormat).ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#374151");

    // Labels
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 70)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(config.axes?.x?.label || "Source");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -60)
      .attr("x", -innerHeight / 2)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(config.axes?.y?.label || "Weight");

    // Title
    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", 35)
      .style("font-size", "18px")
      .style("font-weight", "700")
      .style("fill", "#111827")
      .text(
        config.accessibility?.ariaLabel || "Character Network Visualization"
      );

    // Legend (top 10 series)
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${width - margin.right + 20}, ${margin.top})`
      );

    topSeries.forEach(([seriesName], i) => {
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 22})`);

      legendItem
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", colorScale(seriesName))
        .attr("stroke-width", 2);

      legendItem
        .append("circle")
        .attr("cx", 10)
        .attr("cy", 0)
        .attr("r", 3)
        .attr("fill", colorScale(seriesName));

      legendItem
        .append("text")
        .attr("x", 25)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .style("fill", "#374151")
        .text(
          seriesName.length > 15
            ? seriesName.substring(0, 13) + "..."
            : seriesName
        );
    });
  }, [isClient, data]);

  if (!isClient) {
    return (
      <div
        style={{ width: 1200, height: 700 }}
        className="flex items-center justify-center"
      >
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{ width: 1200, height: 700 }}
        className="flex items-center justify-center"
      >
        <div className="text-gray-500">No data provided</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 transition-opacity"
        style={{ zIndex: 1000 }}
      />
    </div>
  );
};
