import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const DotPlotChart = ({ data }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const [hoveredDot, setHoveredDot] = useState(null);

  useEffect(() => {
    if (!data?.chart_configuration?.data?.flat_data) {
      console.warn("No data provided to DotPlotChart");
      return;
    }

    const config = data.chart_configuration;
    const plotData = config.data.flat_data;

    if (!Array.isArray(plotData) || plotData.length === 0) {
      console.warn("Data is empty or not an array");
      return;
    }

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = config.dimensions.margin;
    const width = config.dimensions.width - margin.left - margin.right;
    const height = config.dimensions.height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", config.dimensions.width)
      .attr("height", config.dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get unique categories for x-axis
    const xCategories = [
      ...new Set(plotData.map((d) => d[config.dataMapping.x])),
    ];

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(xCategories)
      .range([0, width])
      .padding(0.1);

    const yExtent = d3.extent(plotData, (d) => +d[config.dataMapping.y] || 0);
    const yScale = d3
      .scaleLinear()
      .domain([0, yExtent[1] || 100])
      .nice()
      .range([height, 0]);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Add X axis
    if (config.axes.x.show) {
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "11px");

      // X axis label
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text(config.axes.x.label);
    }

    // Add Y axis
    if (config.axes.y.show) {
      svg.append("g").call(d3.axisLeft(yScale)).style("font-size", "11px");

      // Y axis label
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .text(config.axes.y.label);
    }

    // Add grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Group data by x-axis category
    const groupedData = d3.group(plotData, (d) => d[config.dataMapping.x]);

    // Add dots
    groupedData.forEach((points, category) => {
      const categoryCenter = xScale(category) + xScale.bandwidth() / 2;
      const jitterWidth = xScale.bandwidth() * 0.8;

      svg
        .selectAll(`.dot-${CSS.escape(category)}`)
        .data(points)
        .enter()
        .append("circle")
        .attr("class", `dot dot-${CSS.escape(category)}`)
        .attr("cx", () => categoryCenter + (Math.random() - 0.5) * jitterWidth)
        .attr("cy", (d) => yScale(+d[config.dataMapping.y] || 0))
        .attr("r", 0)
        .attr("fill", colorScale(category))
        .attr("opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 8)
            .attr("opacity", 1)
            .attr("stroke-width", 2);

          setHoveredDot(d);

          tooltip
            .style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`).html(`
              <strong>${d[config.dataMapping.x]}</strong><br/>
              ${config.dataMapping.y}: ${d[config.dataMapping.y]}<br/>
              ${d.value ? `Value: ${d.value}` : ""}
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", 5)
            .attr("opacity", 0.7)
            .attr("stroke-width", 1.5);

          setHoveredDot(null);
          tooltip.style("display", "none");
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 20)
        .attr("r", 5);
    });

    // Add legend if enabled
    if (config.legend.show) {
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 120}, 10)`);

      xCategories.slice(0, 10).forEach((category, i) => {
        const legendRow = legend
          .append("g")
          .attr("transform", `translate(0, ${i * 20})`);

        legendRow
          .append("circle")
          .attr("cx", 5)
          .attr("cy", 5)
          .attr("r", 5)
          .attr("fill", colorScale(category));

        legendRow
          .append("text")
          .attr("x", 15)
          .attr("y", 9)
          .style("font-size", "11px")
          .text(
            category.length > 15 ? category.substring(0, 12) + "..." : category
          );
      });
    }
  }, [data]);

  if (!data?.chart_configuration?.data?.flat_data) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Data Available
          </h2>
          <p className="text-gray-600">
            Please provide data with the following structure:
          </p>
          <pre className="mt-4 p-4 bg-gray-50 rounded text-left text-xs overflow-auto">
            {`{
  chart_configuration: {
    data: {
      flat_data: [
        { source: "A", target: 50 },
        ...
      ]
    }
  }
}`}
          </pre>
        </div>
      </div>
    );
  }

  const config = data.chart_configuration;
  const plotData = config.data.flat_data;
  const stats = {
    totalPoints: plotData.length,
    categories: [
      ...new Set(plotData.map((d) => d[config.dataMapping?.x || "source"])),
    ].length,
    avgValue:
      plotData.length > 0
        ? Math.round(
            plotData.reduce(
              (sum, d) => sum + (+d[config.dataMapping?.y || "target"] || 0),
              0
            ) / plotData.length
          )
        : 0,
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-6xl w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-800">
              Dot Plot Visualization
            </h1>
            {config.metadata?.emergency_mode && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                Emergency Mode
              </span>
            )}
          </div>
          <p className="text-gray-600">
            Interactive dot plot showing distribution across categories. Hover
            over dots for details.
          </p>
          {config.metadata?.reason && (
            <p className="text-sm text-orange-600 mt-1">
              {config.metadata.reason}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center">
          <svg ref={svgRef} className="drop-shadow-md"></svg>

          {hoveredDot && (
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200 w-full max-w-md">
              <h3 className="font-semibold text-lg text-indigo-900 mb-2">
                Selected Point
              </h3>
              <div className="space-y-1 text-sm text-indigo-700">
                <p>
                  <span className="font-medium">Category:</span>{" "}
                  {hoveredDot[config.dataMapping?.x || "source"]}
                </p>
                <p>
                  <span className="font-medium">Value:</span>{" "}
                  {hoveredDot[config.dataMapping?.y || "target"]}
                </p>
                {hoveredDot.value && (
                  <p>
                    <span className="font-medium">Weight:</span>{" "}
                    {hoveredDot.value}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="font-semibold text-purple-900">
              Total Data Points
            </div>
            <div className="text-3xl font-bold text-purple-700 mt-1">
              {stats.totalPoints}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="font-semibold text-blue-900">Categories</div>
            <div className="text-3xl font-bold text-blue-700 mt-1">
              {stats.categories}
            </div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="font-semibold text-indigo-900">Average Value</div>
            <div className="text-3xl font-bold text-indigo-700 mt-1">
              {stats.avgValue}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">
            Chart Configuration
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="font-medium">Chart Type:</span>{" "}
              {config.chartType}
            </div>
            <div>
              <span className="font-medium">X Mapping:</span>{" "}
              {config.dataMapping?.x || "source"}
            </div>
            <div>
              <span className="font-medium">Y Mapping:</span>{" "}
              {config.dataMapping?.y || "target"}
            </div>
            <div>
              <span className="font-medium">Generated:</span>{" "}
              {config.metadata?.generated_at
                ? new Date(config.metadata.generated_at).toLocaleString()
                : "N/A"}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm z-50"
        style={{ display: "none" }}
      ></div>
    </div>
  );
};

export default DotPlotChart;
