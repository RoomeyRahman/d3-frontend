"use client";
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { addTooltips, ChartData } from "@/app/utils/chartUtils";

interface AreaChartProps {
  data: ChartData;
}

const AreaChart = ({ data }: AreaChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { processed_data, field_mappings, chart_config } = data;
    const { dimensions } = chart_config;
    const { width, height, margin } = dimensions;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Parse dates and prepare data
    const parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ");
    const parsedData = processed_data.map((d) => ({
      ...d,
      [field_mappings.x]:
        parseDate(d[field_mappings.x]) || new Date(d[field_mappings.x]),
      [field_mappings.y]: +d[field_mappings.y],
    }));

    // Sort data by date
    const sortedData = parsedData.sort(
      (a, b) =>
        (a[field_mappings.x] as Date).getTime() -
        (b[field_mappings.x] as Date).getTime()
    );

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(
        d3.extent(sortedData, (d) => d[field_mappings.x] as Date) as [
          Date,
          Date
        ]
      )
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(sortedData, (d) => d[field_mappings.y] as number) as number,
      ])
      .nice()
      .range([innerHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create gradient for area fill
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "areaGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", yScale(0))
      .attr("x2", 0)
      .attr(
        "y2",
        yScale(
          d3.max(sortedData, (d) => d[field_mappings.y] as number) as number
        )
      );

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.8);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3b82f6")
      .attr("stop-opacity", 0.1);

    // Area generator
    const area = d3
      .area<any>()
      .x((d) => xScale(d[field_mappings.x] as Date))
      .y0(yScale(0))
      .y1((d) => yScale(d[field_mappings.y] as number))
      .curve(d3.curveMonotoneX);

    // Line generator for the top edge
    const line = d3
      .line<any>()
      .x((d) => xScale(d[field_mappings.x] as Date))
      .y((d) => yScale(d[field_mappings.y] as number))
      .curve(d3.curveMonotoneX);

    // Create the area
    const areaPath = g
      .append("path")
      .datum(sortedData)
      .attr("class", "area")
      .attr("fill", "url(#areaGradient)")
      .attr("d", area);

    // Create the line on top of area
    const linePath = g
      .append("path")
      .datum(sortedData)
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Animate area and line drawing
    const totalLength = linePath.node()?.getTotalLength() || 0;

    // Animate the line
    linePath
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .attr("stroke-dashoffset", 0);

    // Animate the area with a clip path
    const clipPath = g.append("clipPath").attr("id", "clip");

    const clipRect = clipPath
      .append("rect")
      .attr("width", 0)
      .attr("height", innerHeight);

    areaPath.attr("clip-path", "url(#clip)");

    clipRect.transition().duration(2000).attr("width", innerWidth);

    // Add dots
    g.selectAll(".dot")
      .data(sortedData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d[field_mappings.x] as Date))
      .attr("cy", (d) => yScale(d[field_mappings.y] as number))
      .attr("r", 4)
      .attr("fill", "#2563eb")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .transition()
      .delay((d, i) => i * 50 + 1000)
      .duration(500)
      .style("opacity", 1);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickFormat((domainValue) => {
          return d3.timeFormat("%b %Y")(domainValue as Date);
        })
      )
      .selectAll("text")
      .style("fill", "black")
      .style("font-size", "12px");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "black")
      .style("font-size", "12px");

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .style("stroke", "#e5e7eb")
      .style("stroke-dasharray", "3,3");

    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .style("stroke", "#e5e7eb")
      .style("stroke-dasharray", "3,3");

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - innerHeight / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "black")
      .style("font-size", "14px")
      .text(field_mappings.y);

    g.append("text")
      .attr(
        "transform",
        `translate(${innerWidth / 2}, ${innerHeight + margin.bottom})`
      )
      .style("text-anchor", "middle")
      .style("fill", "black")
      .style("font-size", "14px")
      .text(field_mappings.x);

    // Add tooltips to dots
    addTooltips(g.selectAll(".dot"), data);
  }, [data]);

  return (
    <svg
      ref={svgRef}
      width={data.chart_config.dimensions.width}
      height={data.chart_config.dimensions.height}
      className="w-full h-auto"
    />
  );
};

export default AreaChart;
