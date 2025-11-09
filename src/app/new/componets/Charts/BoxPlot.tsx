import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";

const BoxPlot = ({ data }) => {
  const svgRef = useRef(null);

  // Safely extract configuration and values
  const config = data?.chart_configuration || data;
  const values = config?.data?.values || data?.values || [];

  // Get dimensions from config or use defaults
  const dimensions = config?.dimensions || {
    width: 900,
    height: 600,
    margin: { top: 20, right: 20, bottom: 80, left: 70 },
  };

  const { width, height, margin } = dimensions;

  // Calculate statistics for box plot
  const calculateStats = (numbers) => {
    if (!numbers || numbers.length === 0) return null;

    const sorted = [...numbers].sort((a, b) => a - b);
    const q1 = d3.quantile(sorted, 0.25);
    const q2 = d3.quantile(sorted, 0.5);
    const q3 = d3.quantile(sorted, 0.75);
    const iqr = q3 - q1;

    const lowerWhisker = Math.max(sorted[0], q1 - 1.5 * iqr);
    const upperWhisker = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);

    const outliers = sorted.filter((v) => v < lowerWhisker || v > upperWhisker);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      q1,
      q2,
      q3,
      lowerWhisker,
      upperWhisker,
      outliers,
      mean: d3.mean(numbers),
    };
  };

  // Group data by source and calculate box plot stats
  const boxPlotData = useMemo(() => {
    if (!values || values.length === 0) return [];

    const grouped = d3.group(values, (d) => d.source || d.category || d.name);

    const sourceStats = Array.from(grouped, ([source, items]) => {
      const vals = items.map(
        (item) => item.value || item.weight || item.val || 0
      );
      const stats = calculateStats(vals);
      return stats
        ? {
            source,
            values: vals,
            count: vals.length,
            stats,
          }
        : null;
    })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Show top 15 sources

    return sourceStats;
  }, [values]);

  useEffect(() => {
    if (!svgRef.current || boxPlotData.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(boxPlotData.map((d) => d.source))
      .range([0, chartWidth])
      .padding(0.2);

    const allValues = boxPlotData.flatMap((d) => [d.stats.min, d.stats.max]);
    const yMin = Math.max(0.1, d3.min(allValues));
    const yMax = d3.max(allValues);

    const yScale = d3
      .scaleLog()
      .domain([yMin, yMax])
      .range([chartHeight, 0])
      .clamp(true);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // X-axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .style("font-size", "11px");

    // Y-axis
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).ticks(10).tickFormat(d3.format("~s")));

    // X-axis label
    g.append("text")
      .attr("class", "x-axis-label")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 60)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(config?.axes?.x?.label || "Character");

    // Y-axis label
    g.append("text")
      .attr("class", "y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(config?.axes?.y?.label || "Connection Weight (log scale)");

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "8px")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    const boxWidth = config?.chartSpecific?.boxWidth || 30;

    // Draw box plots
    const boxGroups = g
      .selectAll(".box-group")
      .data(boxPlotData)
      .enter()
      .append("g")
      .attr("class", "box-group")
      .attr(
        "transform",
        (d) => `translate(${xScale(d.source) + xScale.bandwidth() / 2},0)`
      );

    // Whiskers
    boxGroups
      .append("line")
      .attr("class", "whisker")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", (d) => yScale(d.stats.lowerWhisker))
      .attr("y2", (d) => yScale(d.stats.upperWhisker))
      .attr("stroke", (d, i) => colorScale(i))
      .attr("stroke-width", 1);

    // Lower whisker cap
    boxGroups
      .append("line")
      .attr("class", "whisker-cap")
      .attr("x1", -boxWidth / 4)
      .attr("x2", boxWidth / 4)
      .attr("y1", (d) => yScale(d.stats.lowerWhisker))
      .attr("y2", (d) => yScale(d.stats.lowerWhisker))
      .attr("stroke", (d, i) => colorScale(i))
      .attr("stroke-width", 1);

    // Upper whisker cap
    boxGroups
      .append("line")
      .attr("class", "whisker-cap")
      .attr("x1", -boxWidth / 4)
      .attr("x2", boxWidth / 4)
      .attr("y1", (d) => yScale(d.stats.upperWhisker))
      .attr("y2", (d) => yScale(d.stats.upperWhisker))
      .attr("stroke", (d, i) => colorScale(i))
      .attr("stroke-width", 1);

    // Box (IQR)
    boxGroups
      .append("rect")
      .attr("class", "box")
      .attr("x", -boxWidth / 2)
      .attr("y", (d) => yScale(d.stats.q3))
      .attr("width", boxWidth)
      .attr("height", (d) =>
        Math.max(1, yScale(d.stats.q1) - yScale(d.stats.q3))
      )
      .attr("fill", (d, i) => colorScale(i))
      .attr("fill-opacity", 0.6)
      .attr("stroke", (d, i) => colorScale(i))
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill-opacity", 0.8).attr("stroke-width", 3);

        tooltip.transition().duration(200).style("opacity", 1);

        tooltip
          .html(
            `
          <strong>${d.source}</strong><br/>
          Count: ${d.count}<br/>
          Min: ${d.stats.min}<br/>
          Q1: ${d.stats.q1.toFixed(1)}<br/>
          Median: ${d.stats.q2.toFixed(1)}<br/>
          Q3: ${d.stats.q3.toFixed(1)}<br/>
          Max: ${d.stats.max}<br/>
          Mean: ${d.stats.mean.toFixed(1)}
        `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill-opacity", 0.6).attr("stroke-width", 2);

        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Median line
    boxGroups
      .append("line")
      .attr("class", "median")
      .attr("x1", -boxWidth / 2)
      .attr("x2", boxWidth / 2)
      .attr("y1", (d) => yScale(d.stats.q2))
      .attr("y2", (d) => yScale(d.stats.q2))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Outliers
    boxGroups
      .selectAll(".outlier")
      .data((d) =>
        d.stats.outliers.map((outlier) => ({
          outlier,
          source: d.source,
          color: colorScale(boxPlotData.indexOf(d)),
        }))
      )
      .enter()
      .append("circle")
      .attr("class", "outlier")
      .attr("cx", 0)
      .attr("cy", (d) => yScale(d.outlier))
      .attr("r", config?.chartSpecific?.outlierRadius || 4)
      .attr("fill", (d) => d.color)
      .attr("fill-opacity", 0.6)
      .attr("stroke", (d) => d.color)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 6).attr("fill-opacity", 1);

        tooltip.transition().duration(200).style("opacity", 1);

        tooltip
          .html(
            `
          <strong>${d.source}</strong><br/>
          Outlier: ${d.outlier}
        `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("r", config?.chartSpecific?.outlierRadius || 4)
          .attr("fill-opacity", 0.6);

        tooltip.transition().duration(200).style("opacity", 0);
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [boxPlotData, width, height, margin, config]);

  if (!values || values.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-red-600">No data available</h2>
        <p className="text-gray-600">
          Please provide data in the correct format.
        </p>
      </div>
    );
  }

  if (boxPlotData.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-red-600">
          No valid data to display
        </h2>
        <p className="text-gray-600">
          Unable to create box plot from the provided data.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default BoxPlot;
