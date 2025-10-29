'use client';

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';

interface ChartData {
  chartType: string;
  dataMapping: {
    x: string;
    y: string;
    [key: string]: string;
  };
  dimensions?: {
    width?: number;
    height?: number;
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
  scales?: {
    x?: {
      type?: string;
      domain?: string | any[];
    };
    y?: {
      type?: string;
      domain?: string | any[];
      clamp?: boolean;
    };
  };
  axes?: {
    x?: {
      show?: boolean;
      label?: string;
    };
    y?: {
      show?: boolean;
      label?: string;
    };
  };
  legend?: {
    show?: boolean;
    maxItems?: number;
    scrollable?: boolean;
  };
  tooltip?: {
    enabled?: boolean;
    fields?: string[];
  };
  interactions?: {
    zoom?: boolean;
    pan?: boolean;
    hover?: boolean;
  };
  styling?: {
    colorScheme?: string;
  };
  chartSpecific?: any;
  metadata?: any;
  data: {
    values?: any[];
    nodes?: any[];
    links?: any[];
  };
  performance?: any;
  [key: string]: any;
}

interface DynamicD3ChartProps {
  chartData: ChartData;
  className?: string;
}

const defaultConfig = {
  dimensions: {
    width: 800,
    height: 600,
    margin: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    }
  },
  scales: {
    x: { type: 'band', domain: 'auto' },
    y: { type: 'linear', domain: 'auto' }
  },
  axes: {
    x: { show: true, label: 'X Axis' },
    y: { show: true, label: 'Y Axis' }
  },
  legend: { show: false, maxItems: 10, scrollable: true },
  tooltip: { enabled: true, fields: [] },
  interactions: { zoom: false, pan: false, hover: true },
  styling: { colorScheme: 'category10' }
};

const DynamicD3Chart: React.FC<DynamicD3ChartProps> = ({ chartData, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get appropriate data based on chart type
  const getChartData = useCallback(() => {
    const { chartType, data } = chartData;
    
    const type = chartType.toLowerCase();
    
    if (type.includes('force') || type.includes('network')) {
      return {
        type: 'network' as const,
        nodes: data.nodes || [],
        links: data.links || []
      };
    }
    
    return {
      type: 'standard' as const,
      values: data.values || []
    };
  }, [chartData]);

  // Enhanced configuration merging with deep defaults
  const config = useMemo(() => {
    const deepMerge = (target: any, source: any) => {
      const result = { ...target };
      
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key] !== undefined ? source[key] : target[key];
        }
      }
      
      return result;
    };

    return deepMerge(defaultConfig, chartData);
  }, [chartData]);

  const showError = useCallback((message: string) => {
    if (errorRef.current) {
      errorRef.current.innerHTML = `
        <div class="error-message p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Chart Error:</strong> ${message}
        </div>
      `;
      errorRef.current.style.display = 'block';
    }
    console.error('Chart Error:', message);
  }, []);

  const hideError = useCallback(() => {
    if (errorRef.current) {
      errorRef.current.style.display = 'none';
    }
  }, []);

  const showWarning = useCallback((message: string) => {
    console.warn('Chart Warning:', message);
  }, []);

  const getColorScale = useCallback(() => {
    const scheme = config.styling?.colorScheme || 'category10';
    switch (scheme) {
      case 'category10': return d3.scaleOrdinal(d3.schemeCategory10);
      case 'accent': return d3.scaleOrdinal(d3.schemeAccent);
      case 'dark2': return d3.scaleOrdinal(d3.schemeDark2);
      case 'paired': return d3.scaleOrdinal(d3.schemePaired);
      case 'set1': return d3.scaleOrdinal(d3.schemeSet1);
      case 'set2': return d3.scaleOrdinal(d3.schemeSet2);
      case 'set3': return d3.scaleOrdinal(d3.schemeSet3);
      case 'plasma': return d3.scaleSequential(d3.interpolatePlasma);
      case 'viridis': return d3.scaleSequential(d3.interpolateViridis);
      default: return d3.scaleOrdinal(d3.schemeCategory10);
    }
  }, [config.styling?.colorScheme]);

  const createTooltip = useCallback((d: any) => {
    if (!config.tooltip?.enabled || !tooltipRef.current) return '';

    const fields = config.tooltip.fields || [];
    return fields.map(field => {
      const value = d[field];
      return `<div class="flex justify-between"><span class="font-medium">${field}:</span> <span class="ml-2">${value ?? 'N/A'}</span></div>`;
    }).join('');
  }, [config.tooltip]);

  // Enhanced scale creation with better error handling
  const createScale = useCallback((scaleConfig: any, data: any[], accessor: (d: any) => any, range: [number, number], axisName: string) => {
    try {
      const { type = 'linear', domain = 'auto', clamp = false } = scaleConfig;
      
      const sampleValues = data.map(accessor).filter(d => d != null);
      if (sampleValues.length === 0) {
        throw new Error(`No valid data for ${axisName} axis`);
      }

      // Detect data type and auto-correct scale type if needed
      const isCategorical = sampleValues.some((d: any) => typeof d === 'string' || isNaN(Number(d)));
      const hasNegativeValues = sampleValues.some((d: any) => Number(d) <= 0);

      let scaleDomain;
      if (domain === 'auto') {
        if (isCategorical) {
          // Auto-correct to band scale for categorical data
          if (type !== 'band' && type !== 'point') {
            showWarning(`Auto-corrected ${axisName} scale from ${type} to band for categorical data`);
          }
          scaleDomain = Array.from(new Set(sampleValues));
          const scale = d3.scaleBand()
            .domain(scaleDomain)
            .range(range)
            .padding(0.1);
          return { scale, type: 'band' };
        } else {
          scaleDomain = d3.extent(sampleValues) as [number, number];
        }
      } else if (Array.isArray(domain)) {
        scaleDomain = domain;
      } else {
        scaleDomain = d3.extent(sampleValues) as [number, number];
      }

      // Handle empty or invalid domains
      if (!scaleDomain[0] && scaleDomain[0] !== 0) {
        scaleDomain = [0, 1];
      }

      switch (type) {
        case 'linear':
          const linearScale = d3.scaleLinear().domain(scaleDomain).range(range);
          if (clamp) linearScale.clamp(true);
          return { scale: linearScale, type: 'linear' };
        
        case 'log':
          if (hasNegativeValues || scaleDomain[0] <= 0) {
            showWarning(`Log scale requires positive values for ${axisName} axis. Using linear scale instead.`);
            const positiveDomain = [Math.max(0.1, scaleDomain[0] || 0.1), scaleDomain[1] || 1];
            const fallbackScale = d3.scaleLinear().domain(positiveDomain).range(range);
            return { scale: fallbackScale, type: 'linear' };
          }
          const logScale = d3.scaleLog().domain(scaleDomain).range(range);
          if (clamp) logScale.clamp(true);
          return { scale: logScale, type: 'log' };
        
        case 'band':
          const bandDomain = Array.from(new Set(sampleValues));
          const bandScale = d3.scaleBand()
            .domain(bandDomain)
            .range(range)
            .padding(0.1);
          return { scale: bandScale, type: 'band' };
        
        case 'point':
          const pointDomain = Array.from(new Set(sampleValues));
          const pointScale = d3.scalePoint()
            .domain(pointDomain)
            .range(range);
          return { scale: pointScale, type: 'point' };
        
        default:
          showWarning(`Unknown scale type "${type}" for ${axisName} axis. Using linear scale.`);
          const defaultScale = d3.scaleLinear().domain(scaleDomain).range(range);
          return { scale: defaultScale, type: 'linear' };
      }
    } catch (error) {
      showError(`Scale creation failed for ${axisName}: ${error}`);
      // Fallback to safe linear scale
      return { 
        scale: d3.scaleLinear().domain([0, 1]).range(range), 
        type: 'linear' 
      };
    }
  }, [showError, showWarning]);

  // Heatmap renderer
  const renderHeatmap = useCallback((svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any[]) => {
    try {
      hideError();
      setIsLoading(true);

      const { width, height, margin } = config.dimensions;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      if (!data || data.length === 0) {
        throw new Error('No data available for heatmap');
      }

      const xAccessor = (d: any) => d[config.dataMapping.x];
      const yAccessor = (d: any) => d[config.dataMapping.y];
      const valueAccessor = (d: any) => d.rate || d.value || d[config.dataMapping.value] || 0;

      // Create scales
      const xScaleResult = createScale(
        config.scales.x,
        data,
        xAccessor,
        [0, innerWidth],
        'x'
      );

      const yScaleResult = createScale(
        config.scales.y,
        data,
        yAccessor,
        [0, innerHeight],
        'y'
      );

      // Ensure band scales for heatmap
      const xScale = xScaleResult.type === 'band' ? xScaleResult.scale as d3.ScaleBand<string> 
        : d3.scaleBand().domain(Array.from(new Set(data.map(xAccessor)))).range([0, innerWidth]).padding(0.1);
      
      const yScale = yScaleResult.type === 'band' ? yScaleResult.scale as d3.ScaleBand<string>
        : d3.scaleBand().domain(Array.from(new Set(data.map(yAccessor)))).range([0, innerHeight]).padding(0.1);

      const colorScale = d3.scaleSequential(d3.interpolatePlasma)
        .domain(d3.extent(data, valueAccessor) as [number, number]);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Draw heatmap cells
      g.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', (d: any) => xScale(xAccessor(d))!)
        .attr('y', (d: any) => yScale(yAccessor(d))!)
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(valueAccessor(d)))
        .attr('rx', 2)
        .attr('ry', 2)
        .on('mouseover', function(event, d) {
          if (config.interactions?.hover && tooltipRef.current) {
            const tooltipContent = createTooltip(d);
            if (tooltipContent) {
              tooltipRef.current.innerHTML = `
                <div class="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700">
                  <div class="font-semibold mb-2">Heatmap Data</div>
                  ${tooltipContent}
                  <div class="mt-2 pt-2 border-t border-gray-600">
                    <strong>Value:</strong> ${valueAccessor(d).toFixed(2)}
                  </div>
                </div>
              `;
              tooltipRef.current.style.opacity = '1';
            }
          }
          d3.select(this)
            .attr('stroke', '#000')
            .attr('stroke-width', 2)
            .attr('filter', 'brightness(1.2)');
        })
        .on('mousemove', function(event) {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 10}px`;
          }
        })
        .on('mouseout', function() {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
          }
          d3.select(this)
            .attr('stroke', 'none')
            .attr('filter', 'none');
        });

      // Add axes
      if (config.axes?.x?.show) {
        const xAxis = d3.axisBottom(xScale);
        const xAxisGroup = g.append('g')
          .attr('transform', `translate(0,${innerHeight})`)
          .call(xAxis);

        if (config.axes.x.label) {
          xAxisGroup.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 35)
            .attr('fill', 'currentColor')
            .attr('text-anchor', 'middle')
            .attr('class', 'text-sm font-medium')
            .text(config.axes.x.label);
        }
      }

      if (config.axes?.y?.show) {
        const yAxis = d3.axisLeft(yScale);
        const yAxisGroup = g.append('g')
          .call(yAxis);

        if (config.axes.y.label) {
          yAxisGroup.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -innerHeight / 2)
            .attr('fill', 'currentColor')
            .attr('text-anchor', 'middle')
            .attr('class', 'text-sm font-medium')
            .text(config.axes.y.label);
        }
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      showError(`Heatmap rendering failed: ${error}`);
      throw error;
    }
  }, [config, createScale, createTooltip, hideError, showError]);

  // Scatter plot renderer
  const renderScatterPlot = useCallback((svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any[]) => {
    try {
      hideError();
      setIsLoading(true);

      const { width, height, margin } = config.dimensions;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      if (!data || data.length === 0) {
        throw new Error('No data available for scatter plot');
      }

      const xAccessor = (d: any) => d[config.dataMapping.x];
      const yAccessor = (d: any) => {
        const value = d[config.dataMapping.y];
        // Handle numeric conversion for mixed data types
        return typeof value === 'string' ? parseFloat(value) || 0 : +value;
      };

      const xScaleResult = createScale(
        config.scales.x,
        data,
        xAccessor,
        [0, innerWidth],
        'x'
      );

      const yScaleResult = createScale(
        config.scales.y,
        data,
        yAccessor,
        [innerHeight, 0], // Inverted for y-axis
        'y'
      );

      const colorScale = getColorScale();

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Draw scatter points
      g.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (d: any) => {
          const value = xAccessor(d);
          if (xScaleResult.type === 'band') {
            return (xScaleResult.scale as d3.ScaleBand<string>)(value)! + (xScaleResult.scale as d3.ScaleBand<string>).bandwidth() / 2;
          } else if (xScaleResult.type === 'point') {
            return (xScaleResult.scale as d3.ScalePoint<string>)(value)!;
          } else {
            return (xScaleResult.scale as d3.ScaleContinuousNumeric<number, number>)(value);
          }
        })
        .attr('cy', (d: any) => (yScaleResult.scale as d3.ScaleContinuousNumeric<number, number>)(yAccessor(d)))
        .attr('r', 6)
        .attr('fill', (d, i) => colorScale(i.toString()))
        .attr('opacity', 0.7)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .on('mouseover', function(event, d) {
          if (config.interactions?.hover && tooltipRef.current) {
            const tooltipContent = createTooltip(d);
            if (tooltipContent) {
              tooltipRef.current.innerHTML = `
                <div class="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700">
                  <div class="font-semibold mb-2">Data Point</div>
                  ${tooltipContent}
                </div>
              `;
              tooltipRef.current.style.opacity = '1';
            }
          }
          d3.select(this)
            .attr('r', 9)
            .attr('stroke-width', 2)
            .attr('filter', 'brightness(1.2)');
        })
        .on('mousemove', function(event) {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 10}px`;
          }
        })
        .on('mouseout', function() {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
          }
          d3.select(this)
            .attr('r', 6)
            .attr('stroke-width', 1.5)
            .attr('filter', 'none');
        });

      // Add axes
      if (config.axes?.x?.show) {
        const xAxis = d3.axisBottom(xScaleResult.scale as any);
        const xAxisGroup = g.append('g')
          .attr('transform', `translate(0,${innerHeight})`)
          .call(xAxis);

        if (config.axes.x.label) {
          xAxisGroup.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', 35)
            .attr('fill', 'currentColor')
            .attr('text-anchor', 'middle')
            .attr('class', 'text-sm font-medium')
            .text(config.axes.x.label);
        }
      }

      if (config.axes?.y?.show) {
        const yAxis = d3.axisLeft(yScaleResult.scale as any);
        const yAxisGroup = g.append('g')
          .call(yAxis);

        if (config.axes.y.label) {
          yAxisGroup.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -innerHeight / 2)
            .attr('fill', 'currentColor')
            .attr('text-anchor', 'middle')
            .attr('class', 'text-sm font-medium')
            .text(config.axes.y.label);
        }
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      showError(`Scatter plot rendering failed: ${error}`);
      throw error;
    }
  }, [config, createScale, createTooltip, getColorScale, hideError, showError]);

  // Force-directed graph renderer
  const renderForceDirectedGraph = useCallback((svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, nodes: any[], links: any[]) => {
    try {
      hideError();
      setIsLoading(true);

      const { width, height, margin } = config.dimensions;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      if (!nodes || nodes.length === 0) {
        throw new Error('No nodes available for force-directed graph');
      }

      // Filter out invalid links and prepare data
      const validLinks = (links || []).filter(link => {
        const sourceNode = nodes.find(n => n.id === link.source || n.id === link.source?.id);
        const targetNode = nodes.find(n => n.id === link.target || n.id === link.target?.id);
        return sourceNode && targetNode;
      });

      if (links.length > 0 && validLinks.length === 0) {
        showWarning('No valid links found between nodes');
      }

      const colorScale = getColorScale();

      // Create force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(validLinks).id((d: any) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
        .force('collision', d3.forceCollide().radius(25));

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Create links
      const link = g.append('g')
        .selectAll('line')
        .data(validLinks)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d: any) => Math.sqrt(d.value || d.weight || 1));

      // Create nodes
      const node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', 8)
        .attr('fill', (d: any) => colorScale(d.group?.toString() || d.id))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .call(d3.drag<SVGCircleElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }))
        .on('mouseover', function(event, d) {
          if (config.interactions?.hover && tooltipRef.current) {
            const tooltipContent = createTooltip(d);
            if (tooltipContent) {
              tooltipRef.current.innerHTML = `
                <div class="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700">
                  <div class="font-semibold mb-2">Node: ${d.id}</div>
                  ${tooltipContent}
                </div>
              `;
              tooltipRef.current.style.opacity = '1';
            }
          }
          d3.select(this)
            .attr('r', 12)
            .attr('stroke-width', 3)
            .attr('filter', 'brightness(1.3)');
        })
        .on('mousemove', function(event) {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 10}px`;
          }
        })
        .on('mouseout', function() {
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
          }
          d3.select(this)
            .attr('r', 8)
            .attr('stroke-width', 1.5)
            .attr('filter', 'none');
        });

      // Add node labels
      const label = g.append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text((d: any) => d.id)
        .attr('font-size', '10px')
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('class', 'pointer-events-none')
        .style('user-select', 'none');

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);

        label
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      });

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      showError(`Force-directed graph rendering failed: ${error}`);
      throw error;
    }
  }, [config, createTooltip, getColorScale, hideError, showError, showWarning]);

  // Main rendering effect
  useEffect(() => {
    if (!svgRef.current || !chartData) return;

    // Clear previous chart
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = config.dimensions;
    svg.attr('width', width).attr('height', height);

    const chartDataStructure = getChartData();

    try {
      const chartType = chartData.chartType?.toLowerCase();
      
      switch (chartType) {
        case 'heatmap':
          if (chartDataStructure.type === 'standard') {
            renderHeatmap(svg, chartDataStructure.values);
          }
          break;
        
        case 'scatter':
        case 'scatter_plot':
          if (chartDataStructure.type === 'standard') {
            renderScatterPlot(svg, chartDataStructure.values);
          }
          break;
        
        case 'force_directed_graph':
        case 'force_directed':
        case 'force_graph':
        case 'force_network':
          if (chartDataStructure.type === 'network') {
            renderForceDirectedGraph(svg, chartDataStructure.nodes, chartDataStructure.links);
          }
          break;
        
        default:
          showError(`Unsupported chart type: ${chartData.chartType}`);
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'text-gray-500')
            .text(`Unsupported chart type: ${chartData.chartType}`);
      }
    } catch (error) {
      showError(`Chart rendering failed: ${error}`);
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-red-500')
        .text('Error rendering chart - check console for details');
    }
  }, [
    chartData, 
    config, 
    getChartData, 
    renderHeatmap, 
    renderScatterPlot, 
    renderForceDirectedGraph, 
    showError
  ]);

  return (
    <div className={`relative ${className}`}>
      {/* Error Display */}
      <div ref={errorRef} className="error-container mb-2" style={{ display: 'none' }} />
      
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Rendering chart...</p>
          </div>
        </div>
      )}
      
      {/* Chart SVG */}
      <svg
        ref={svgRef}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none opacity-0 transition-opacity duration-200 z-20"
        style={{
          fontSize: '12px',
          maxWidth: '280px'
        }}
      />
    </div>
  );
};

export default DynamicD3Chart;