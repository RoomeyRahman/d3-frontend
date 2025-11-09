import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export const ViolinPlot = ({ data }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !data.chart_configuration) return;

    const config = data.chart_configuration;
    const rawData = config.data.values;
    const { width, height, margin } = config.dimensions;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get x and y field names from dataMapping
    const xField = config.dataMapping.x; // "source"
    const yField = config.dataMapping.y || "value"; // "weight" or "value"

    // Group data by source (x-axis categories)
    const groupedData = d3.group(rawData, (d) => d[xField]);
    const categories = Array.from(groupedData.keys());

    // Extract values for each category
    const dataByCategory = categories.map((cat) => ({
      category: cat,
      values: groupedData.get(cat).map((d) => d[yField]),
    }));

    // X scale (categorical)
    const xScale = d3
      .scaleBand()
      .domain(categories)
      .range([0, innerWidth])
      .padding(0.1);

    // Y scale (log scale as specified in config)
    const allValues = rawData.map((d) => d[yField]).filter((v) => v > 0);
    const yMin = d3.min(allValues);
    const yMax = d3.max(allValues);

    const yScale = d3
      .scaleLog()
      .domain([Math.max(0.1, yMin), yMax])
      .range([innerHeight, 0])
      .clamp(true);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Kernel density estimator
    const kernelDensityEstimator = (kernel, X) => {
      return (V) => X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))]);
    };

    const kernelEpanechnikov = (bandwidth) => {
      return (x) =>
        Math.abs((x /= bandwidth)) <= 1 ? (0.75 * (1 - x * x)) / bandwidth : 0;
    };

    // Draw violins
    dataByCategory.forEach((d) => {
      const values = d.values.filter((v) => v > 0);
      if (values.length === 0) return;

      const bandwidth = 0.5;
      const kde = kernelDensityEstimator(
        kernelEpanechnikov(bandwidth),
        yScale.ticks(50)
      );
      const density = kde(values);

      // Scale density for width
      const maxDensity = d3.max(density, (d) => d[1]);
      const xOffset = xScale(d.category) + xScale.bandwidth() / 2;
      const violinWidth = xScale.bandwidth() * 0.8;

      const densityScale = d3
        .scaleLinear()
        .domain([0, maxDensity])
        .range([0, violinWidth / 2]);

      // Create area generator
      const area = d3
        .area()
        .curve(d3.curveBasis)
        .x0((d) => xOffset - densityScale(d[1]))
        .x1((d) => xOffset + densityScale(d[1]))
        .y((d) => yScale(d[0]));

      // Draw violin
      g.append("path")
        .datum(density)
        .attr("d", area)
        .attr("fill", colorScale(d.category))
        .attr("opacity", 0.7)
        .attr("stroke", colorScale(d.category))
        .attr("stroke-width", 1);

      // Draw median line
      const median = d3.median(values);
      g.append("line")
        .attr("x1", xOffset - violinWidth / 4)
        .attr("x2", xOffset + violinWidth / 4)
        .attr("y1", yScale(median))
        .attr("y2", yScale(median))
        .attr("stroke", "white")
        .attr("stroke-width", 2);
    });

    // X axis
    const xAxis = g
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    xAxis
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Y axis
    g.append("g").call(d3.axisLeft(yScale).ticks(10, ".0f"));

    // X axis label
    if (config.axes.x.label) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(config.axes.x.label);
    }

    // Y axis label
    if (config.axes.y.label) {
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(config.axes.y.label);
    }
  }, [data]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
      <svg ref={svgRef}></svg>
    </div>
  );
};
