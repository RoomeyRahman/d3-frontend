"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { extractNumericArrayFromValues, extractXYFromNodesOrValues, nodesDegreeArray, ConvertHint } from "@/app/utils/dataConverters";

interface DensityPlotProps {
  data: any[];
  nodes?: any[];
  links?: any[];
  width?: number | string;
  height?: number;
  convertHint?: ConvertHint;
}

export default function DensityPlot({
  data,
  nodes,
  links,
  width = "100%",
  height = 420,
  convertHint,
}: DensityPlotProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 56 };
    const bounding = wrapperRef.current.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Autoconvert: if data not appropriate, try to convert from nodes/links
    let raw = data ?? [];

    // if raw is empty but there are nodes, attempt conversion
    if ((!Array.isArray(raw) || raw.length === 0) && Array.isArray(nodes) && nodes.length > 0) {
      const xy = extractXYFromNodesOrValues(nodes);
      if (xy.length > 0) {
        raw = xy;
      } else {
        const nums = extractNumericArrayFromValues(nodes, convertHint?.numericKey);
        raw = nums.length > 0 ? nums : nodesDegreeArray(nodes, links ?? []);
      }
    }

    // detect 2D vs 1D
    const is2D = Array.isArray(raw) && raw.length > 0 && raw.every((d: any) => d && typeof d === "object" && d.x != null && d.y != null && !Number.isNaN(+d.x) && !Number.isNaN(+d.y));
    const isNumberArray = Array.isArray(raw) && raw.every((d) => typeof d === "number");
    const isValueObjects = Array.isArray(raw) && raw.every((d: any) => d && typeof d === "object" && d.value != null && !Number.isNaN(+d.value));
    const isObjectArray = Array.isArray(raw) && raw.every((d: any) => d && typeof d === "object");

    if (is2D) {
      render2DDensity(svg, g, raw, w, h);
    } else if (isNumberArray || isValueObjects || isObjectArray) {
      const values = isNumberArray ? (raw as number[]) : isValueObjects ? (raw as any[]).map((d: any) => +d.value) : extractNumericArrayFromValues(raw, convertHint?.numericKey);
      if (values.length === 0) {
        g.append("text").attr("x", 10).attr("y", 20).text("No numeric values for density.");
        return;
      }
      render1DDensity(g, values, w, h);
    } else {
      g.append("text").attr("x", 10).attr("y", 20).text("Density input not recognized. Provide numbers, {x,y} pairs, or node data convertible to these.");
    }
  }, [data, nodes, links, width, height, convertHint]);

  return (
    <div ref={wrapperRef} className="bg-white rounded shadow p-4">
      <svg ref={svgRef} width={typeof width === "number" ? width : "100%"} height={height} />
    </div>
  );
}

function render2DDensity(svg: any, g: any, raw: any[], w: number, h: number) {
  const xs = raw.map((d: any) => +d.x);
  const ys = raw.map((d: any) => +d.y);
  const x = d3.scaleLinear().domain(d3.extent(xs) as [number, number]).nice().range([0, w]);
  const y = d3.scaleLinear().domain(d3.extent(ys) as [number, number]).nice().range([h, 0]);

  g.selectAll("circle.scatter")
    .data(raw)
    .enter()
    .append("circle")
    .attr("class", "scatter")
    .attr("cx", (d: any) => x(+d.x))
    .attr("cy", (d: any) => y(+d.y))
    .attr("r", 1.5)
    .attr("opacity", 0.4)
    .attr("fill", "#444");
  
  const contours = d3
    .contourDensity()
    .x((d: any) => x(+d.x))
    .y((d: any) => y(+d.y))
    .size([w, h])
    .bandwidth(Math.max(10, Math.min(w, h) / 20))(raw);
  
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, d3.max(contours, (c) => c.value) ?? 1]);
  
  g.selectAll("path.contour")
    .data(contours)
    .enter()
    .append("path")
    .attr("class", "contour")
    .attr("d", d3.geoPath() as any)
    .attr("fill", (d: any) => color(d.value))
    .attr("stroke", "none")
    .attr("opacity", 0.8);
  
  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .extent([[0, 0], [w, h]])
    .on("zoom", (event) => {
      const newX = event.transform.rescaleX(x);
      const newY = event.transform.rescaleY(y);
      g.select(".x-axis").call(d3.axisBottom(newX));
      g.select(".y-axis").call(d3.axisLeft(newY));
      g.selectAll("circle.scatter")
        .attr("cx", (d: any) => newX(+d.x))
        .attr("cy", (d: any) => newY(+d.y));
    });
  svg.call(zoom);

  g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
}

function render1DDensity(g: any, values: number[], w: number, h: number) {
  const x = d3.scaleLinear().domain(d3.extent(values) as [number, number]).nice().range([0, w]);
  const ticks = x.ticks(80);
  const bw = (d3.max(values)! - d3.min(values)!) / 20 || 1;
  const kde = kernelDensityEstimator(kernelEpanechnikov(bw), ticks);
  const density = kde(values);

  const y = d3.scaleLinear().domain([0, d3.max(density, (d) => d[1]) ?? 1]).range([h, 0]);

  g.append("path")
    .datum(density)
    .attr("fill", "#69b3a2")
    .attr("opacity", 0.5)
    .attr(
      "d",
      d3
        .line<any>()
        .curve(d3.curveBasis)
        .x((d: any) => x(d[0]))
        .y((d: any) => y(d[1]))
    );

  g.append("path")
    .datum(density)
    .attr("fill", "none")
    .attr("stroke", "#22543d")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line<any>()
        .curve(d3.curveBasis)
        .x((d: any) => x(d[0]))
        .y((d: any) => y(d[1]))
    );

  g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));
}

function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
  return function (V: number[]) {
    return X.map(function (x) {
      return [x, d3.mean(V, function (v) { return kernel(x - v); }) ?? 0];
    });
  };
}

function kernelEpanechnikov(bandwidth: number) {
  return function (v: number) {
    v = v / bandwidth;
    return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / bandwidth : 0;
  };
}
