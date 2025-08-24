import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ChartData {
  processed_data: Array<{
    name: string;
    value: number;
    percentage: number;
    angle?: number;
  }>;
  field_mappings: {
    label: string;
    value: string;
  };
  chart_config: {
    dimensions: {
      width: number;
      height: number;
      radius?: number;
      center?: [number, number];
    };
  };
}

interface PieChartProps {
  data: ChartData;
}

const PieChart = ({ data }: PieChartProps) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { processed_data, field_mappings, chart_config } = data;
    const { dimensions } = chart_config;
    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2 - 40;

    // Use the processed data directly - it's already in the correct format
    const chartData = processed_data;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3
      .pie<any>()
      .value((d: any) => d[field_mappings.value])
      .sort(null);

    const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const arcs = g
      .selectAll(".arc")
      .data(pie(chartData))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Create pie slices
    const paths = arcs
      .append("path")
      .attr("fill", (d, i) => colorScale(i.toString()))
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Animate pie slices
    paths
      .transition()
      .duration(750)
      .attrTween("d", (d: any) => {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t: number) => arc(interpolate(t)) || "";
      });

    // Add labels with better positioning
    arcs
      .append("text")
      .attr("transform", (d: any) => {
        const centroid = arc.centroid(d);
        // Move labels outward for better readability
        centroid[0] *= 1.3;
        centroid[1] *= 1.3;
        return `translate(${centroid})`;
      })
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", "#333")
      .text((d: any) => {
        // Show age group and percentage
        const percentage = (d.data.percentage * 100).toFixed(1);
        return `${d.data[field_mappings.label]} (${percentage}%)`;
      });

    // Add tooltips
    paths
      .on("mouseover", function (event: MouseEvent, d: any) {
        // Highlight the slice
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("stroke-width", 3);

        // Create tooltip
        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px 12px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", 0);

        tooltip.transition().duration(200).style("opacity", 1);

        const percentage = (d.data.percentage * 100).toFixed(1);
        const value = d.data.value.toLocaleString();

        tooltip
          .html(
            `
          <strong>Age Group: ${d.data[field_mappings.label]}</strong><br/>
          Population: ${value}<br/>
          Percentage: ${percentage}%
        `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mousemove", function (event: MouseEvent) {
        d3.select(".tooltip")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function () {
        // Remove highlight
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke-width", 2);

        // Remove tooltip
        d3.select(".tooltip").remove();
      });

    // Add a title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Population Distribution by Age Group");
  }, [data]);

  return (
    <div className="w-full flex justify-center">
      <svg
        ref={svgRef}
        width={data?.chart_config?.dimensions?.width || 600}
        height={data?.chart_config?.dimensions?.height || 600}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default PieChart;
