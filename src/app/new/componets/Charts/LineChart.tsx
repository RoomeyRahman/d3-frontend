"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface UniversalLineChartProps {
  data: any[] | { [key: string]: any } | { processed_data?: any[] };
  width?: number;
  height?: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  xKey?: string; // Manual override for X dimension
  yKey?: string; // Manual override for Y dimension
  groupKey?: string; // Manual override for grouping dimension
  xLabel?: string;
  yLabel?: string;
  title?: string;
  showPoints?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  colors?: string[];
  useLogScale?: boolean;
  dateFormat?: boolean; // Auto-detect or force date parsing
}

const UniversalLineChart: React.FC<UniversalLineChartProps> = ({
  data,
  width = 1000,
  height = 600,
  margin = { top: 60, right: 200, bottom: 80, left: 120 },
  xKey,
  yKey,
  groupKey,
  xLabel,
  yLabel,
  title,
  showPoints = true,
  showGrid = true,
  animate = true,
  useLogScale = false,
  dateFormat,
  colors = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
    "#aec7e8",
    "#ffbb78",
    "#98df8a",
    "#ff9896",
    "#c5b0d5",
  ],
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Smart data transformation and detection
  const transformedData = React.useMemo(() => {
    if (!data) return { processedData: [], metadata: {} };

    let rawData: any[] = [];

    // Handle different data formats
    if (Array.isArray(data)) {
      rawData = data;
    } else if (data.processed_data && Array.isArray(data.processed_data)) {
      rawData = data.processed_data;
    } else if (typeof data === "object") {
      // Try to extract arrays from object
      const arrayValues = Object.values(data).filter(Array.isArray);
      if (arrayValues.length > 0) {
        rawData = arrayValues[0] as any[];
      } else {
        // Convert single object to array
        rawData = [data];
      }
    }

    if (!rawData.length) return { processedData: [], metadata: {} };

    // Analyze the structure of the first few items to understand the data
    const sampleSize = Math.min(5, rawData.length);
    const sample = rawData.slice(0, sampleSize);

    // Get all keys from sample data
    const allKeys = new Set<string>();
    sample.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        Object.keys(item).forEach((key) => allKeys.add(key));
      }
    });

    const keys = Array.from(allKeys);

    // Detect data types for each key
    const keyAnalysis: {
      [key: string]: {
        type: "number" | "date" | "string" | "mixed";
        isNumeric: boolean;
        isDate: boolean;
        values: any[];
        uniqueCount: number;
      };
    } = {};

    keys.forEach((key) => {
      const values = rawData
        .map((item) => item?.[key])
        .filter((val) => val != null && val !== "");

      const uniqueValues = [...new Set(values)];

      // Check if values are numeric
      const numericValues = values.filter((val) => {
        const num = Number(val);
        return !isNaN(num) && isFinite(num);
      });

      // Check if values are dates
      const dateValues = values.filter((val) => {
        if (typeof val === "string" && val.includes("T") && val.includes("Z"))
          return true;
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
          return true;
        const date = new Date(val);
        return (
          !isNaN(date.getTime()) &&
          date.getFullYear() > 1900 &&
          date.getFullYear() < 2100
        );
      });

      keyAnalysis[key] = {
        type:
          numericValues.length === values.length
            ? "number"
            : dateValues.length === values.length
            ? "date"
            : uniqueValues.length < values.length * 0.5
            ? "string"
            : "mixed",
        isNumeric: numericValues.length === values.length,
        isDate: dateValues.length === values.length,
        values: uniqueValues,
        uniqueCount: uniqueValues.length,
      };
    });

    // Smart key detection with better logic for music data format
    let detectedXKey = xKey;
    let detectedYKey = yKey;
    let detectedGroupKey = groupKey;

    if (!detectedXKey) {
      // Look for common X-axis patterns - prioritize year/time fields
      const xCandidates = keys.filter((key) => {
        const analysis = keyAnalysis[key];
        const lowerKey = key.toLowerCase();

        // Prioritize year/time patterns first
        if (
          [
            "year",
            "date",
            "time",
            "month",
            "day",
            "timestamp",
            "period",
            "x",
          ].some((pattern) => lowerKey.includes(pattern))
        )
          return true;

        // Date patterns
        if (analysis.isDate) return true;

        // Numeric with reasonable range for years (1900-2100)
        if (
          analysis.isNumeric &&
          analysis.values.some((v) => v >= 1900 && v <= 2100)
        )
          return true;

        return false;
      });

      detectedXKey =
        xCandidates[0] ||
        keys.find((key) => keyAnalysis[key].isNumeric) ||
        keys[0];
    }

    if (!detectedYKey) {
      // Look for common Y-axis patterns - prioritize value fields
      const yCandidates = keys.filter((key) => {
        if (key === detectedXKey) return false;
        const analysis = keyAnalysis[key];
        const lowerKey = key.toLowerCase();

        // Prioritize value patterns first
        if (
          [
            "value",
            "amount",
            "price",
            "close",
            "open",
            "high",
            "low",
            "revenue",
            "sales",
            "count",
            "y",
          ].some((pattern) => lowerKey.includes(pattern))
        )
          return true;

        // Large numeric values (likely monetary/count values)
        if (analysis.isNumeric && analysis.values.some((v) => v > 1000))
          return true;

        return false;
      });

      detectedYKey =
        yCandidates[0] ||
        keys.find(
          (key) => keyAnalysis[key].isNumeric && key !== detectedXKey
        ) ||
        keys[1] ||
        keys[0];
    }

    if (!detectedGroupKey) {
      // Look for grouping keys - prioritize name/category fields
      const groupCandidates = keys.filter((key) => {
        if (key === detectedXKey || key === detectedYKey) return false;
        const analysis = keyAnalysis[key];
        const lowerKey = key.toLowerCase();

        // Prioritize name patterns first
        if (
          [
            "name",
            "type",
            "category",
            "series",
            "group",
            "format",
            "symbol",
            "label",
          ].some((pattern) => lowerKey.includes(pattern))
        )
          return true;

        // String values with reasonable unique count for grouping
        if (
          analysis.type === "string" &&
          analysis.uniqueCount > 1 &&
          analysis.uniqueCount <= rawData.length * 0.8
        )
          return true;

        return false;
      });

      detectedGroupKey = groupCandidates[0];
    }

    // Process the data with better error handling
    const processedData: any[] = [];
    const isXDate = keyAnalysis[detectedXKey]?.isDate || dateFormat;

    rawData.forEach((item, index) => {
      if (typeof item !== "object" || item === null) {
        console.warn(`Skipping invalid item at index ${index}:`, item);
        return;
      }

      let xValue = item[detectedXKey];
      let yValue = item[detectedYKey];

      // Parse X value
      if (isXDate && xValue) {
        xValue = new Date(xValue);
        if (isNaN(xValue.getTime())) {
          console.warn(`Invalid date at index ${index}:`, item[detectedXKey]);
          return;
        }
      } else if (typeof xValue === "string") {
        const numX = Number(xValue);
        if (!isNaN(numX)) xValue = numX;
      }

      // Parse Y value
      if (typeof yValue === "string") {
        const numY = Number(yValue);
        if (!isNaN(numY)) yValue = numY;
      }

      // Skip invalid data with better validation
      if (xValue == null || yValue == null) {
        console.warn(`Missing values at index ${index}:`, {
          x: xValue,
          y: yValue,
        });
        return;
      }

      if (
        typeof yValue === "number" &&
        (!isFinite(yValue) || (useLogScale && yValue <= 0))
      ) {
        console.warn(`Invalid Y value at index ${index}:`, yValue);
        return;
      }

      if (typeof xValue === "number" && !isFinite(xValue)) {
        console.warn(`Invalid X value at index ${index}:`, xValue);
        return;
      }

      processedData.push({
        x: xValue,
        y: yValue,
        group: detectedGroupKey
          ? String(item[detectedGroupKey] || "Default")
          : "Default",
        originalData: item,
      });
    });

    // Auto-generate labels with better formatting
    const formatLabel = (key: string) => {
      if (!key) return "";
      return (
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
      );
    };

    const autoXLabel = xLabel || formatLabel(detectedXKey) || "X Axis";
    const autoYLabel = yLabel || formatLabel(detectedYKey) || "Y Axis";
    const autoTitle = title || `${autoYLabel} vs ${autoXLabel}`;

    return {
      processedData,
      metadata: {
        xKey: detectedXKey,
        yKey: detectedYKey,
        groupKey: detectedGroupKey,
        xLabel: autoXLabel,
        yLabel: autoYLabel,
        title: autoTitle,
        isXDate,
        keyAnalysis,
      },
    };
  }, [
    data,
    xKey,
    yKey,
    groupKey,
    xLabel,
    yLabel,
    title,
    useLogScale,
    dateFormat,
  ]);

  useEffect(() => {
    if (!isClient || !transformedData.processedData.length || !svgRef.current)
      return;

    const { processedData, metadata } = transformedData;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Calculate inner dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    // Group data
    const groupedData = Array.from(
      d3.group(processedData, (d) => d.group).entries()
    ).filter(([key, values]) => values.length > 0);

    // Create scales
    const xExtent = d3.extent(processedData, (d) => d.x) as [any, any];
    const yExtent = d3.extent(processedData, (d) => d.y) as [number, number];

    let xScale: any;
    if (metadata.isXDate) {
      xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);
    } else {
      xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth]);
    }

    let yScale: any;
    if (useLogScale && yExtent[0] > 0) {
      yScale = d3
        .scaleLog()
        .domain([Math.max(yExtent[0], 1), yExtent[1]])
        .nice()
        .range([innerHeight, 0]);
    } else {
      yScale = d3.scaleLinear().domain(yExtent).nice().range([innerHeight, 0]);
    }

    // Color scale
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(groupedData.map(([key]) => key))
      .range(colors);

    // Main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add grid
    if (showGrid) {
      // X grid
      g.selectAll(".grid-line-x")
        .data(xScale.ticks(10))
        .enter()
        .append("line")
        .attr("class", "grid-line-x")
        .attr("x1", (d) => xScale(d))
        .attr("x2", (d) => xScale(d))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.6);

      // Y grid
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
    }

    // Line generator
    const line = d3
      .line<any>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX)
      .defined((d) => d.y != null && isFinite(d.y));

    // Helper function to create safe CSS class names
    const createSafeClassName = (name: string) => {
      return name.replace(/[^a-zA-Z0-9-_]/g, "_").replace(/^[^a-zA-Z_]/, "_");
    };

    // Draw lines and points
    groupedData.forEach(([groupName, groupData], groupIndex) => {
      const sortedData = groupData.sort((a, b) => {
        if (metadata.isXDate) {
          return new Date(a.x).getTime() - new Date(b.x).getTime();
        }
        return a.x - b.x;
      });

      const color = colorScale(groupName);
      const safeClassName = createSafeClassName(groupName);

      // Draw line
      if (sortedData.length > 1) {
        const path = g
          .append("path")
          .datum(sortedData)
          .attr("class", `line-${safeClassName}`)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2.5)
          .attr("d", line)
          .style("opacity", 0.85);

        // Animate line
        if (animate) {
          const totalLength =
            (path.node() as SVGPathElement)?.getTotalLength() || 0;
          if (totalLength > 0) {
            path
              .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
              .attr("stroke-dashoffset", totalLength)
              .transition()
              .duration(2000)
              .ease(d3.easeLinear)
              .attr("stroke-dashoffset", 0);
          }
        }
      }

      // Add points
      if (showPoints) {
        const circles = g
          .selectAll(`.point-${safeClassName}-${groupIndex}`)
          .data(sortedData)
          .enter()
          .append("circle")
          .attr("class", `point point-${safeClassName}`)
          .attr("cx", (d) => xScale(d.x))
          .attr("cy", (d) => yScale(d.y))
          .attr("r", 3.5)
          .attr("fill", color)
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .style("opacity", animate ? 0 : 1);

        if (animate) {
          circles
            .transition()
            .delay((d, i) => i * 20 + 1200)
            .duration(400)
            .style("opacity", 1);
        }

        // Tooltip
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);

          circles
            .on("mouseover", function (event, d) {
              d3.select(this).transition().duration(200).attr("r", 5.5);

              const formatValue = (value: any) => {
                if (typeof value === "number") {
                  if (value >= 1000000000)
                    return `${(value / 1000000000).toFixed(2)}B`;
                  if (value >= 1000000)
                    return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toLocaleString();
                }
                if (metadata.isXDate && value instanceof Date) {
                  return value.toLocaleDateString();
                }
                return String(value);
              };

              tooltip
                .style("opacity", 1)
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 10 + "px").html(`
                  <div style="
                    background: rgba(15, 23, 42, 0.95); 
                    color: white; 
                    padding: 14px; 
                    border-radius: 10px; 
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    font-size: 13px;
                    line-height: 1.5;
                    max-width: 220px;
                    border: 1px solid rgba(255,255,255,0.1);
                  ">
                    <div style="font-weight: 700; color: #60A5FA; margin-bottom: 8px; font-size: 14px;">${groupName}</div>
                    <div><span style="color: #CBD5E1;">${
                      metadata.xLabel
                    }:</span> <span style="font-weight: 600; color: white;">${formatValue(d.x)}</span></div>
                    <div><span style="color: #CBD5E1;">${
                      metadata.yLabel
                    }:</span> <span style="font-weight: 600; color: #10B981;">${formatValue(d.y)}</span></div>
                  </div>
                `);
            })
            .on("mouseout", function () {
              d3.select(this).transition().duration(200).attr("r", 3.5);
              tooltip.style("opacity", 0);
            });
        }
      }
    });

    // Add axes
    const xAxisFormat = metadata.isXDate
      ? d3.timeFormat("%Y-%m-%d")
      : typeof xExtent[0] === "number" && xExtent[0] % 1 === 0
      ? d3.format("d")
      : d3.format(".2f");

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(xAxisFormat).ticks(10))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "500");

    const yAxisFormat = useLogScale
      ? (d: any) => {
          if (d >= 1000000000) return `${d / 1000000000}B`;
          if (d >= 1000000) return `${d / 1000000}M`;
          if (d >= 1000) return `${d / 1000}K`;
          return String(d);
        }
      : d3.format(".2s");

    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(yAxisFormat).ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("font-weight", "500");

    // Labels and title
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(metadata.xLabel);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -80)
      .attr("x", -innerHeight / 2)
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(metadata.yLabel);

    svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", 35)
      .style("font-size", "20px")
      .style("font-weight", "700")
      .style("fill", "#111827")
      .text(metadata.title);

    // Legend
    if (groupedData.length > 1) {
      const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr(
          "transform",
          `translate(${width - margin.right + 30}, ${margin.top + 20})`
        );

      const legendItems = legend
        .selectAll(".legend-item")
        .data(groupedData.slice(0, 12))
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 24})`)
        .style("cursor", "pointer");

      legendItems
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", (d) => colorScale(d[0]))
        .attr("stroke-width", 3);

      legendItems
        .append("circle")
        .attr("cx", 10)
        .attr("cy", 0)
        .attr("r", 3)
        .attr("fill", (d) => colorScale(d[0]))
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      legendItems
        .append("text")
        .attr("x", 28)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "#374151")
        .style("font-weight", "500")
        .text((d) => (d[0].length > 15 ? d[0].substring(0, 12) + "..." : d[0]));
    }
  }, [
    transformedData,
    width,
    height,
    margin,
    showPoints,
    showGrid,
    animate,
    colors,
    useLogScale,
    isClient,
  ]);

  if (!isClient) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  if (!transformedData.processedData.length) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">No Valid Data</div>
          <div className="text-sm">Please provide data with numeric values</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        <svg ref={svgRef} className="" />
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 transition-opacity duration-200"
          style={{ zIndex: 1000 }}
        />
      </div>

      {/* Data Info with debug information */}
      {/* <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <span className="font-medium">X-Axis:</span>{" "}
            {transformedData.metadata.xKey}
          </div>
          <div>
            <span className="font-medium">Y-Axis:</span>{" "}
            {transformedData.metadata.yKey}
          </div>
          <div>
            <span className="font-medium">Groups:</span>{" "}
            {transformedData.metadata.groupKey || "None"}
          </div>
          <div>
            <span className="font-medium">Data Points:</span>{" "}
            {transformedData.processedData.length}
          </div>
        </div>
        {transformedData.processedData.length === 0 && (
          <div className="mt-2 text-red-600 text-xs">
            Debug: Raw data length ={" "}
            {Array.isArray(data) ? data.length : "Not an array"}
          </div>
        )}
      </div> */}
    </div>
  );
};

export default UniversalLineChart;
