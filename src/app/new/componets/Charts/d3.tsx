"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

type GraphInput = { nodes: any[]; links?: any[] };
type InputData = { [key: string]: any; nodes?: GraphInput["nodes"]; links?: GraphInput["links"] };

type ChartType =
  | "bar"
  | "line"
  | "scatter"
  | "histogram"
  | "pie"
  | "donut"
  | "area"
  | "heatmap"
  | "forceDirectedGraph"
  | "densityPlot"
  | "sunburst";

interface Props {
  data: InputData;
  chartType: ChartType;
  width?: number | string;
  height?: number;
  xField?: string;
  yField?: string;
  labelField?: string;
  valueField?: string;
  convertHint?: {
    numericKey?: string; 
    idKey?: string; 
  };
}

export default function D3DynamicChart({
  data,
  chartType,
  width = "100%",
  height = 420,
  xField,
  yField,
  labelField,
  valueField,
  convertHint,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // ---------- helpers to infer fields ----------
  function inferFieldsFromValues(values: Record<string, any>[]) {
    const numericKeys = new Set<string>();
    const dateKeys = new Set<string>();
    const stringKeys = new Set<string>();

    values.forEach((row) => {
      Object.entries(row).forEach(([k, v]) => {
        if (v == null) return;
        if (typeof v === "number") numericKeys.add(k);
        else if (v instanceof Date) dateKeys.add(k);
        else if (typeof v === "string") {
          const t = Date.parse(v);
          if (!Number.isNaN(t) && v.length >= 8 && /\d{4}/.test(v)) dateKeys.add(k);
          else stringKeys.add(k);
        } else if (typeof v === "boolean") stringKeys.add(k);
      });
    });

    return {
      numeric: Array.from(numericKeys),
      date: Array.from(dateKeys),
      categorical: Array.from(stringKeys),
      keys: values.length ? Object.keys(values[0]) : [],
    };
  }

  function is2DNumericArray(values: any): values is number[][] {
    if (!Array.isArray(values)) return false;
    return values.every((r) => Array.isArray(r) && r.every((c: any) => typeof c === "number"));
  }

  // ---------- CONVERTER HELPERS ----------
  // Heuristics & utility conversions so the renderer can accept alternate shapes.

  function toNodesFromValues(values: Record<string, any>[], idKeyHint?: string) {
    // Each table row becomes a node. Use id/name if present, otherwise index-based id.
    const idKeys = [idKeyHint, "id", "name", "key", "node", "label"].filter(Boolean) as string[];
    const chosenIdKey = idKeys.find((k) => values.some((v) => v[k] !== undefined));
    return values.map((row, i) => {
      const id = chosenIdKey ? row[chosenIdKey] : row.id ?? row.name ?? `n${i}`;
      return { ...row, id };
    });
  }

  function extractNumericArrayFromValues(values: any[], preferKey?: string) {
    // Try to find best numeric key; if raw values is numeric array, return directly
    if (!Array.isArray(values)) return [];
    const isNumberArray = values.every((v) => typeof v === "number");
    if (isNumberArray) return values as number[];

    // if array of objects and preferKey exists
    if (preferKey && values.some((v) => v && typeof v[preferKey] === "number")) {
      return values.map((v) => +v[preferKey]).filter((n) => !Number.isNaN(n));
    }

    // common numeric field names
    const candidates = ["value", "val", "rate", "count", "freq", "score", "degree"];
    const fields = new Set<string>();
    values.forEach((r) => {
      if (r && typeof r === "object") Object.keys(r).forEach((k) => fields.add(k));
    });

    // pick first candidate present
    const chosen = candidates.find((c) => fields.has(c)) ?? Array.from(fields).find((k) => values.some((v) => typeof v[k] === "number"));
    if (!chosen) {
      // fallback: try flattening x,y -> use x or y or compute distance from origin
      if (values.every((v) => v && typeof v.x === "number")) return values.map((v) => +v.x);
      if (values.every((v) => v && typeof v.y === "number")) return values.map((v) => +v.y);
      // as last resort, map to index 0..n-1
      return values.map((_, i) => i);
    }
    return values.map((v) => +v[chosen]).filter((n) => !Number.isNaN(n));
  }

  function extractXYFromNodesOrValues(raw: any[]) {
    // Return array of {x,y} if possible from nodes or table rows
    if (!Array.isArray(raw)) return [];
    const hasXY = raw.every((r) => r && (typeof r.x === "number" || !Number.isNaN(Number(r.x))) && (typeof r.y === "number" || !Number.isNaN(Number(r.y))));
    if (hasXY) return raw.map((r) => ({ x: +r.x, y: +r.y }));
    // Maybe coordinates are in [lng, lat] array form
    if (raw.every((r) => Array.isArray(r.position) && r.position.length >= 2 && typeof r.position[0] === "number" && typeof r.position[1] === "number")) {
      return raw.map((r) => ({ x: +r.position[0], y: +r.position[1] }));
    }
    // not found
    return [];
  }

  function nodesDegreeArray(nodes: any[], links: any[]) {
    const deg = new Map<any, number>();
    (nodes || []).forEach((n) => deg.set(n.id ?? n.name ?? n, 0));
    (links || []).forEach((l) => {
      const s = l.source;
      const t = l.target;
      deg.set(s, (deg.get(s) ?? 0) + 1);
      deg.set(t, (deg.get(t) ?? 0) + 1);
    });
    return (nodes || []).map((n) => deg.get(n.id ?? n.name ?? n) ?? 0);
  }

  // ---------- renderers (dynamic) ----------
  function clearSvg(svg: d3.Selection<SVGSVGElement | null, unknown, null, undefined>) {
    svg.selectAll("*").remove();
  }

  /* --- (Existing renderers: renderBar, renderLine, scatter, histogram, pie, area, heatmap, renderForce)
     ... keep all previous renderer functions exactly as before; unchanged here to keep brevity in this snippet.
     For the real file they're all present below (unchanged).  */

  function renderBar(svgEl: SVGSVGElement, allValues: Record<string, any>[], opts: { x: string; y: string }) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 16, bottom: 50, left: 56 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const data = allValues.slice();
    const x = d3.scaleBand().domain(data.map((d) => String(d[opts.x]))).range([0, w]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d) => +d[opts.y]) ?? 0]).nice().range([h, 0]);

    g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    g
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");
    
    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => x(String(d[opts.x])) ?? 0)
      .attr("y", (d) => y(+d[opts.y]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => h - y(+d[opts.y]))
      .attr("rx", 3)
      .attr("fill", "steelblue");
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .extent([[0, 0], [w, h]])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(x);
        const newY = event.transform.rescaleY(y);
        g.select(".x-axis").call(d3.axisBottom(newX)).selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end");
        g.select(".y-axis").call(d3.axisLeft(newY));
        g.selectAll("rect")
          .attr("x", (d) => newX(String(d[opts.x])) ?? 0)
          .attr("y", (d) => newY(+d[opts.y]))
          .attr("width", newX.bandwidth())
          .attr("height", (d) => h - newY(+d[opts.y]));
      });
    svg.call(zoom);
  }

  function renderLine(svgEl: SVGSVGElement, allValues: Record<string, any>[], opts: { x: string | null; y: string }) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 20, bottom: 40, left: 56 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let xScale: any;
    let xAccessor: (d: any, i?: number) => number | Date;
    if (opts.x) {
      const sample = allValues.find((d) => d[opts.x] !== undefined && d[opts.x] !== null);
      const isDate = sample && (sample[opts.x] instanceof Date || !Number.isNaN(Date.parse(sample[opts.x])));
      if (isDate) {
        const parsed = allValues.map((d) => new Date(d[opts.x]));
        xScale = d3.scaleTime().domain(d3.extent(parsed) as [Date, Date]).range([0, w]);
        xAccessor = (d) => new Date(d[opts.x]);
      } else {
        xScale = d3.scaleLinear().domain([0, allValues.length - 1]).range([0, w]);
        xAccessor = (_d, i = 0) => i;
      }
    } else {
      xScale = d3.scaleLinear().domain([0, allValues.length - 1]).range([0, w]);
      xAccessor = (_d, i = 0) => i;
    }
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues, (d) => +d[opts.y]) ?? 0])
      .nice()
      .range([h, 0]);

    g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(xScale as any));
    
    const line = d3
      .line<any>()
      .x((d, i) => xScale(xAccessor(d, i) as any))
      .y((d) => y(+d[opts.y]))
      .curve(d3.curveMonotoneX);
    
    g.append("path").datum(allValues).attr("d", line as any).attr("fill", "none").attr("stroke", "#2b6cb0").attr("stroke-width", 2);
    
    g.selectAll("circle")
      .data(allValues)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(xAccessor(d, i) as any))
      .attr("cy", (d) => y(+d[opts.y]))
      .attr("r", 3)
      .attr("fill", "#2b6cb0");
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .extent([[0, 0], [w, h]])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(xScale);
        const newY = event.transform.rescaleY(y);
        g.select(".x-axis").call(d3.axisBottom(newX));
        g.select(".y-axis").call(d3.axisLeft(newY));
        const newLine = d3.line<any>().x((d, i) => newX(xAccessor(d, i) as any)).y((d) => newY(+d[opts.y])).curve(d3.curveMonotoneX);
        g.select("path").attr("d", newLine as any);
        g.selectAll("circle")
          .attr("cx", (d, i) => newX(xAccessor(d, i) as any))
          .attr("cy", (d) => newY(+d[opts.y]));
      });
    svg.call(zoom);
  }

  function renderScatter(svgEl: SVGSVGElement, allValues: Record<string, any>[], opts: { x: string; y: string }) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 20, bottom: 40, left: 56 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([d3.min(allValues, (d) => +d[opts.x]) ?? 0, d3.max(allValues, (d) => +d[opts.x]) ?? 1]).nice().range([0, w]);
    const y = d3.scaleLinear().domain([d3.min(allValues, (d) => +d[opts.y]) ?? 0, d3.max(allValues, (d) => +d[opts.y]) ?? 1]).nice().range([h, 0]);

    g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
    
    g.selectAll("circle")
      .data(allValues)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(+d[opts.x]))
      .attr("cy", (d) => y(+d[opts.y]))
      .attr("r", (d: any) => (d.r ? +d.r : 4))
      .attr("opacity", 0.8)
      .attr("fill", "#3182ce");
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .extent([[0, 0], [w, h]])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(x);
        const newY = event.transform.rescaleY(y);
        g.select(".x-axis").call(d3.axisBottom(newX));
        g.select(".y-axis").call(d3.axisLeft(newY));
        g.selectAll("circle")
          .attr("cx", (d) => newX(+d[opts.x]))
          .attr("cy", (d) => newY(+d[opts.y]));
      });
    svg.call(zoom);
  }

  function renderHistogram(svgEl: SVGSVGElement, allValues: Record<string, any>[], numericKey: string) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 20, bottom: 40, left: 56 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const values = allValues.map((d) => +d[numericKey]).filter((v) => !Number.isNaN(v));
    const x = d3.scaleLinear().domain(d3.extent(values) as [number, number]).nice().range([0, w]);
    const bins = d3.bin().thresholds(20)(values);
    const y = d3.scaleLinear().domain([0, d3.max(bins, (d) => d.length) ?? 1]).range([h, 0]);

    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
    g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    
    g.selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.x0 ?? 0))
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
      .attr("height", (d) => h - y(d.length))
      .attr("fill", "#718096");
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .extent([[0, 0], [w, h]])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(x);
        const newY = event.transform.rescaleY(y);
        g.select(".x-axis").call(d3.axisBottom(newX));
        g.select(".y-axis").call(d3.axisLeft(newY));
        g.selectAll("rect")
          .attr("x", (d) => newX(d.x0 ?? 0))
          .attr("y", (d) => newY(d.length))
          .attr("width", (d) => Math.max(0, newX(d.x1 ?? 0) - newX(d.x0 ?? 0) - 1))
          .attr("height", (d) => h - newY(d.length));
      });
    svg.call(zoom);
  }

  function renderPie(svgEl: SVGSVGElement, allValues: Record<string, any>[], opts: { label: string; value: string }, donut = false) {
    const svg = d3.select(svgEl);
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(300, Math.floor(bounding?.width ?? 600));
    const H = height;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${W / 2},${H / 2})`);
    const data = allValues.map((d) => ({ label: String(d[opts.label]), value: +d[opts.value] || 0 }));
    const radius = Math.min(W, H) / 2 - 10;
    const pie = d3.pie<any>().value((d) => d.value);
    const arc = d3.arc<any>().innerRadius(donut ? radius * 0.5 : 0).outerRadius(radius);

    const arcs = g.selectAll(".arc").data(pie(data)).enter().append("g").attr("class", "arc");
    arcs.append("path").attr("d", arc as any).attr("fill", (d, i) => d3.schemeCategory10[i % 10]);
    arcs
      .append("text")
      .attr("transform", (d) => `translate(${(arc.centroid as any)(d)})`)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.label)
      .style("font-size", "10px");
  }

  function renderArea(svgEl: SVGSVGElement, allValues: Record<string, any>[], opts: { x: string | null; y: string }) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 20, bottom: 40, left: 56 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    let xScale: any;
    let xAccessor: (d: any, i?: number) => number | Date;
    if (opts.x) {
      const sample = allValues.find((d) => d[opts.x] !== undefined && d[opts.x] !== null);
      const isDate = sample && (sample[opts.x] instanceof Date || !Number.isNaN(Date.parse(sample[opts.x])));
      if (isDate) {
        const parsed = allValues.map((d) => new Date(d[opts.x]));
        xScale = d3.scaleTime().domain(d3.extent(parsed) as [Date, Date]).range([0, w]);
        xAccessor = (d) => new Date(d[opts.x]);
      } else {
        xScale = d3.scaleLinear().domain([0, allValues.length - 1]).range([0, w]);
        xAccessor = (_d, i = 0) => i;
      }
    } else {
      xScale = d3.scaleLinear().domain([0, allValues.length - 1]).range([0, w]);
      xAccessor = (_d, i = 0) => i;
    }

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues, (d) => +d[opts.y]) ?? 0])
      .nice()
      .range([h, 0]);

    g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(xScale as any));
    
    const area = d3
      .area<any>()
      .x((d, i) => xScale(xAccessor(d, i) as any))
      .y0(h)
      .y1((d) => y(+d[opts.y]))
      .curve(d3.curveMonotoneX);
    
    g.append("path").attr("class", "area").datum(allValues).attr("d", area as any).attr("fill", "rgba(59,130,246,0.3)");
    g.append("path")
      .attr("class", "line")
      .datum(allValues)
      .attr("d", d3.line<any>().x((d, i) => xScale(xAccessor(d, i) as any)).y((d) => y(+d[opts.y])).curve(d3.curveMonotoneX) as any)
      .attr("fill", "none")
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 1.5);
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .extent([[0, 0], [w, h]])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(xScale);
        const newY = event.transform.rescaleY(y);
        g.select(".x-axis").call(d3.axisBottom(newX));
        g.select(".y-axis").call(d3.axisLeft(newY));
        const newArea = d3.area<any>().x((d, i) => newX(xAccessor(d, i) as any)).y0(h).y1((d) => newY(+d[opts.y])).curve(d3.curveMonotoneX);
        g.select(".area").attr("d", newArea as any);
        const newLine = d3.line<any>().x((d, i) => newX(xAccessor(d, i) as any)).y((d) => newY(+d[opts.y])).curve(d3.curveMonotoneX);
        g.select(".line").attr("d", newLine as any);
      });
    svg.call(zoom);
  }

  function renderHeatmap(svgEl: SVGSVGElement, raw: any) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 20, bottom: 40, left: 48 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    if (is2DNumericArray(raw)) {
      const rows = raw.length;
      const cols = raw[0].length;
      const cellW = w / cols;
      const cellH = h / rows;
      const flat = raw.flat();
      const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([d3.min(flat) ?? 0, d3.max(flat) ?? 1]);

      const row = g.selectAll("g").data(raw).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * cellH})`);
      row
        .selectAll("rect")
        .data((d: number[]) => d)
        .enter()
        .append("rect")
        .attr("x", (_d: any, i: number) => i * cellW)
        .attr("width", cellW - 1)
        .attr("height", cellH - 1)
        .attr("fill", (d: any) => color(d as number) as string);
    } else if (Array.isArray(raw)) {
      const rows = Array.from(new Set(raw.map((d: any) => d.row)));
      const cols = Array.from(new Set(raw.map((d: any) => d.col)));
      const cellW = w / cols.length;
      const cellH = h / rows.length;
      const flat = raw.map((d: any) => +d.value);
      const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([d3.min(flat) ?? 0, d3.max(flat) ?? 1]);

      g.selectAll("rect")
        .data(raw)
        .enter()
        .append("rect")
        .attr("x", (d: any) => cols.indexOf(d.col) * cellW)
        .attr("y", (d: any) => rows.indexOf(d.row) * cellH)
        .attr("width", cellW - 1)
        .attr("height", cellH - 1)
        .attr("fill", (d: any) => color(+d.value) as string);
    } else if (raw && raw.values && Array.isArray(raw.values) && typeof raw.rows === "number") {
      const rows = raw.rows;
      const cols = raw.cols;
      const values = raw.values;
      const cellW = w / cols;
      const cellH = h / rows;
      const flat = values.flat();
      const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([d3.min(flat) ?? 0, d3.max(flat) ?? 1]);

      const row = g.selectAll("g").data(values).enter().append("g").attr("transform", (d, i) => `translate(0, ${i * cellH})`);
      row
        .selectAll("rect")
        .data((d: number[]) => d)
        .enter()
        .append("rect")
        .attr("x", (d: any, i: number) => i * cellW)
        .attr("width", cellW - 1)
        .attr("height", cellH - 1)
        .attr("fill", (d: any) => color(d as number) as string);
    } else {
      g.append("text").attr("x", 10).attr("y", 20).text("Heatmap input not recognized. Provide a matrix or array of {row,col,value}.");
    }
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", `translate(${margin.left},${margin.top}) ${event.transform.toString()}`);
      });
    svg.call(zoom);
  }

  function renderForce(svgEl: SVGSVGElement, nodes: any[], links: any[]) {
    const svg = d3.select(svgEl);
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();
    const g = svg.append("g");

    // Clone nodes and links to ensure they are extensible for D3 simulation
    const nodesCopy = (nodes || []).map(n => ({ ...n }));
    const linksCopy = (links || []).map(l => ({ ...l }));

    const link = g
      .append("g")
      .attr("stroke", "#999")
      .selectAll("line")
      .data(linksCopy)
      .enter()
      .append("line")
      .attr("stroke-width", (d: any) => +d.value || 1.5)
      .attr("stroke-opacity", 0.8);

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodesCopy)
      .enter()
      .append("g")
      .call((sel) => sel.append("circle").attr("r", (d: any) => (d.r ? +d.r : 8)).attr("fill", (d: any) => (d.color ? d.color : "#ff7b7b")))
      .call((sel) => sel.append("text").text((d: any) => d.id).attr("x", 12).attr("y", 4).style("font-size", "11px"));

    const simulation = d3
      .forceSimulation(nodesCopy as any)
      .force("link", d3.forceLink(linksCopy as any).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(W / 2, H / 2));

    simulation.on("tick", () => {
      (link as any).attr("x1", (d: any) => (d.source as any).x).attr("y1", (d: any) => (d.source as any).y).attr("x2", (d: any) => (d.target as any).x).attr("y2", (d: any) => (d.target as any).y);
      (node as any).attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    const zoom = d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom);
  }

  // ---------- SUNBURST renderer ----------
  function renderSunburst(svgEl: SVGSVGElement, data: any) {
    const svg = d3.select(svgEl);
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${W / 2},${H / 2})`);

    const radius = Math.min(W, H) / 2;

    // Partition the data
    const partition = d3.partition().size([2 * Math.PI, radius]);

    // Create a root node
    const root = d3.hierarchy(data)
      .sum((d: any) => d.value || 1)
      .sort((a, b) => b.value - a.value);

    partition(root);

    // Create arc generator
    const arc = d3.arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => d.y0)
      .outerRadius((d: any) => d.y1);

    // Draw the arcs
    const path = g.selectAll("path")
      .data(root.descendants())
      .enter().append("path")
      .attr("d", arc as any)
      .attr("fill", (d: any) => d3.interpolateRainbow(d.depth / 5))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Add labels
    g.selectAll("text")
      .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
      .enter().append("text")
      .attr("transform", function(d: any) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90})translate(${y},0)rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.name || d.data.label || "")
      .style("font-size", "10px")
      .style("fill", "#fff");

    // Add zoom
    const zoom = d3.zoom().on("zoom", (event) => {
      g.attr("transform", `translate(${W / 2},${H / 2}) ${event.transform.toString()}`);
    });
    svg.call(zoom);
  }

  // ---------- DENSITY renderer (1D KDE + 2D contour density) ----------
  function renderDensity(svgEl: SVGSVGElement, rawValues: any[], providedNodes?: any[], providedLinks?: any[]) {
    const svg = d3.select(svgEl);
    const margin = { top: 20, right: 20, bottom: 40, left: 56 };
    const bounding = wrapperRef.current?.getBoundingClientRect();
    const W = typeof width === "number" ? width : Math.max(400, Math.floor(bounding?.width ?? 800));
    const H = height;
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Autoconvert: if rawValues not appropriate, try to convert from nodes/links
    let raw = rawValues ?? [];

    // if raw is empty but there are nodes, attempt conversion
    if ((!Array.isArray(raw) || raw.length === 0) && Array.isArray(providedNodes) && providedNodes.length > 0) {
      // try node->xy first, then node->numeric array (degree or numeric prop)
      const xy = extractXYFromNodesOrValues(providedNodes);
      if (xy.length > 0) {
        raw = xy;
      } else {
        const nums = extractNumericArrayFromValues(providedNodes, convertHint?.numericKey);
        raw = nums.length > 0 ? nums : nodesDegreeArray(providedNodes, providedLinks ?? []);
      }
    }

    // detect 2D vs 1D
    const is2D = Array.isArray(raw) && raw.length > 0 && raw.every((d) => d && typeof d === "object" && d.x != null && d.y != null && !Number.isNaN(+d.x) && !Number.isNaN(+d.y));
    const isNumberArray = Array.isArray(raw) && raw.every((d) => typeof d === "number");
    const isValueObjects = Array.isArray(raw) && raw.every((d) => d && typeof d === "object" && d.value != null && !Number.isNaN(+d.value));
    const isObjectArray = Array.isArray(raw) && raw.every((d) => d && typeof d === "object");

    if (is2D) {
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
    } else if (isNumberArray || isValueObjects || isObjectArray) {
      const values = isNumberArray ? (raw as number[]) : isValueObjects ? (raw as any[]).map((d) => +d.value) : extractNumericArrayFromValues(raw, convertHint?.numericKey);
      if (values.length === 0) {
        g.append("text").attr("x", 10).attr("y", 20).text("No numeric values for density.");
        return;
      }
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
            .x((d) => x(d[0]))
            .y((d) => y(d[1]))
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
            .x((d) => x(d[0]))
            .y((d) => y(d[1]))
        );

      g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));
    } else {
      g.append("text").attr("x", 10).attr("y", 20).text("Density input not recognized. Provide numbers, {x,y} pairs, or node data convertible to these.");
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
  }

  // ---------- main effect ----------
  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;
    const svg = d3.select(svgRef.current);
    clearSvg(svg);

    const hasNodes = Array.isArray(data?.nodes) && data!.nodes!.length > 0;
    const hasValues = Array.isArray(data?.values) && data!.values!.length > 0;

    let inferred: ReturnType<typeof inferFieldsFromValues> | null = null;
    if (hasValues) {
      inferred = inferFieldsFromValues(data!.values!);
    }

    try {
      if (chartType === "forceDirectedGraph") {
        if (!hasNodes) {
          // if we have values but not nodes, convert values->nodes
          if (hasValues) {
            const nodes = toNodesFromValues(data!.values!, convertHint?.idKey);
            console.log('nodes',nodes);
            
            renderForce(svgRef.current!, nodes, []);
          } else {
            svg.append("text").attr("x", 10).attr("y", 20).text("Force-directed requires data.nodes + data.links or convertible `values`.");
          }
        } else {
          renderForce(svgRef.current!, data!.nodes!, data!.links ?? []);
        }
        return;
      }

      if (chartType === "heatmap") {
        // same logic as before
        if (hasValues) {
          const maybeMatrix = data!.values!;
          if (is2DNumericArray(maybeMatrix)) {
            renderHeatmap(svgRef.current!, maybeMatrix);
          } else {
            renderHeatmap(svgRef.current!, (data as any).values && (data as any).rows ? data : data!.values);
          }
        } else if ((data as any).values && is2DNumericArray((data as any).values)) {
          renderHeatmap(svgRef.current!, (data as any).values);
        } else if ((data as any).values && (data as any).rows) {
          renderHeatmap(svgRef.current!, (data as any));
        } else {
          svg.append("text").attr("x", 10).attr("y", 20).text("Heatmap data not found / recognized.");
        }
        return;
      }

      if (chartType === "sunburst") {
        // sunburst expects hierarchical data; check for any key containing hierarchical data
        let hierarchicalData = null;
        for (const key in data) {
          if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object' && data[key][0] !== null) {
            hierarchicalData = data[key][0]; // assuming first item is root
            break;
          }
        }
        if (hierarchicalData) {
          renderSunburst(svgRef.current!, hierarchicalData);
        } else {
          svg.append("text").attr("x", 10).attr("y", 20).text("Sunburst requires hierarchical data in any data key.");
        }
        return;
      }

      if (chartType === "densityPlot") {
        // density will accept values OR nodes (with conversion); pass both to renderer
        const raw = data?.values ?? [];
        const nodes = data?.nodes ?? [];
        const links = data?.links ?? [];
        if ((!raw || raw.length === 0) && (!nodes || nodes.length === 0)) {
          svg.append("text").attr("x", 10).attr("y", 20).text("Density requires data.values (numbers or objects) or data.nodes convertible to numeric/xy.");
        } else {
          renderDensity(svgRef.current!, raw, nodes, links);
        }
        return;
      }

      if (!hasValues) {
        svg.append("text").attr("x", 10).attr("y", 20).text("Tabular `values` array required for this chart type.");
        return;
      }

      // handle other tabular charts (bar, line, scatter, etc.)
      const values = data!.values!;
      let chosenX = xField || null;
      let chosenY = yField || null;
      let chosenLabel = labelField || null;
      let chosenValue = valueField || null;

      if (inferred) {
        if (!chosenY) chosenY = inferred.numeric[0] ?? null;
        if (!chosenX) {
          chosenX = inferred.categorical[0] ?? inferred.date[0] ?? inferred.keys[0] ?? null;
        }
        if (!chosenLabel) chosenLabel = inferred.categorical[0] ?? inferred.keys[0] ?? null;
        if (!chosenValue) chosenValue = inferred.numeric[0] ?? inferred.keys[0] ?? null;
      }

      switch (chartType) {
        case "bar":
          if (!chosenX || !chosenY) {
            svg.append("text").attr("x", 10).attr("y", 20).text("Bar chart requires categorical X and numeric Y (auto-inferred failed).");
          } else {
            renderBar(svgRef.current!, values, { x: chosenX, y: chosenY });
          }
          break;
        case "line":
          if (!chosenY) {
            svg.append("text").attr("x", 10).attr("y", 20).text("Line chart requires a numeric Y field.");
          } else {
            renderLine(svgRef.current!, values, { x: chosenX, y: chosenY });
          }
          break;
        case "area":
          if (!chosenY) {
            svg.append("text").attr("x", 10).attr("y", 20).text("Area chart requires a numeric Y field.");
          } else {
            renderArea(svgRef.current!, values, { x: chosenX, y: chosenY });
          }
          break;
        case "scatter":
          let xForScatter = chosenX && inferred?.numeric.includes(chosenX) ? chosenX : inferred?.numeric[0];
          let yForScatter = chosenY && inferred?.numeric.includes(chosenY) ? chosenY : inferred?.numeric[1] ?? inferred?.numeric[0];
          if (!xForScatter || !yForScatter) {
            svg.append("text").attr("x", 10).attr("y", 20).text("Scatter requires two numeric fields (auto-inferred failed).");
          } else {
            renderScatter(svgRef.current!, values, { x: xForScatter, y: yForScatter });
          }
          break;
        case "histogram":
          if (!chosenY) {
            const numericKey = inferred?.numeric[0];
            if (!numericKey) {
              svg.append("text").attr("x", 10).attr("y", 20).text("Histogram requires at least one numeric field.");
            } else {
              renderHistogram(svgRef.current!, values, numericKey);
            }
          } else {
            renderHistogram(svgRef.current!, values, chosenY);
          }
          break;
        case "pie":
        case "donut": {
          const label = chosenLabel ?? inferred?.categorical[0] ?? inferred?.keys[0];
          const val = chosenValue ?? inferred?.numeric[0] ?? inferred?.keys[1] ?? chosenY;
          if (!label || !val) {
            svg.append("text").attr("x", 10).attr("y", 20).text("Pie requires a label (categorical) and a value (numeric).");
          } else {
            renderPie(svgRef.current!, values, { label, value: val }, chartType === "donut");
          }
          break;
        }
        default:
          svg.append("text").attr("x", 10).attr("y", 20).text(`Chart type "${chartType}" not implemented in dynamic renderer.`);
      }
    } catch (err: any) {
      svg.append("text").attr("x", 10).attr("y", 20).text("Rendering error: " + (err.message || String(err)));
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, [data, chartType, width, height, xField, yField, labelField, valueField, convertHint]);

  return (
    <div ref={wrapperRef} className="bg-white rounded shadow p-4">
      <svg ref={svgRef} width={typeof width === "number" ? width : "100%"} height={height} />
      <div className="mt-2 text-xs text-gray-600">Dynamic D3 chart — chartType: <span className="font-medium">{chartType}</span></div>
    </div>
  );
}
