import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

const ContourPlot = ({ data }) => {
  const svgRef = useRef(null);
  
  // Safely extract configuration and values
  const config = data?.chart_configuration || data;
  const values = config?.data?.values || data?.values || [];
  
  // Get dimensions from config or use defaults
  const dimensions = config?.dimensions || {
    width: 800,
    height: 600,
    margin: { top: 40, right: 120, bottom: 80, left: 80 }
  };
  
  const { width, height, margin } = dimensions;
  
  // Process data for contour plot
  const processedData = useMemo(() => {
    if (!values || values.length === 0) return null;
    
    // Get unique sources and targets
    const sources = [...new Set(values.map(d => d.source))];
    const targets = [...new Set(values.map(d => d.target))];
    
    // Create a lookup map for faster access
    const dataMap = new Map();
    values.forEach(d => {
      const key = `${d.source}-${d.target}`;
      dataMap.set(key, d.value || d.weight || 0);
    });
    
    // Create grid data for contours
    const gridData = [];
    sources.forEach((source, i) => {
      targets.forEach((target, j) => {
        const key = `${source}-${target}`;
        const value = dataMap.get(key) || 0;
        gridData.push({
          x: i,
          y: j,
          value: value,
          source: source,
          target: target
        });
      });
    });
    
    return {
      sources,
      targets,
      gridData,
      maxValue: Math.max(...gridData.map(d => d.value))
    };
  }, [values]);
  
  useEffect(() => {
    if (!svgRef.current || !processedData) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const { sources, targets, gridData, maxValue } = processedData;
    
    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, sources.length - 1])
      .range([0, chartWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([0, targets.length - 1])
      .range([chartHeight, 0]);
    
    // Color scale
    const colorScale = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateViridis);
    
    // Create contour generator
    const contourThresholds = config?.chartSpecific?.contourThresholds || 20;
    const thresholds = d3.range(0, maxValue, maxValue / contourThresholds);
    
    // Transform data into dense grid format for contours
    const gridWidth = sources.length;
    const gridHeight = targets.length;
    const denseGrid = new Array(gridWidth * gridHeight).fill(0);
    
    gridData.forEach(d => {
      const index = d.y * gridWidth + d.x;
      denseGrid[index] = d.value;
    });
    
    // Generate contours
    const contours = d3.contours()
      .size([gridWidth, gridHeight])
      .thresholds(thresholds);
    
    const contourData = contours(denseGrid);
    
    // Create scales for contour paths
    const xContourScale = d3.scaleLinear()
      .domain([0, gridWidth])
      .range([0, chartWidth]);
    
    const yContourScale = d3.scaleLinear()
      .domain([0, gridHeight])
      .range([chartHeight, 0]);
    
    // Draw contours
    g.selectAll('.contour')
      .data(contourData)
      .enter()
      .append('path')
      .attr('class', 'contour')
      .attr('d', d3.geoPath()
        .projection(d3.geoIdentity()
          .scale(1)
          .translate([0, 0])
          .reflectY(true)
          .fitExtent([[0, 0], [chartWidth, chartHeight]], {
            type: 'Polygon',
            coordinates: [[
              [0, 0],
              [gridWidth, 0],
              [gridWidth, gridHeight],
              [0, gridHeight],
              [0, 0]
            ]]
          })
        )
      )
      .attr('fill', d => colorScale(d.value))
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => colorScale(d.value))
      .attr('stroke-width', 0.5);
    
    // Draw heatmap cells as backup visualization
    const cellWidth = chartWidth / sources.length;
    const cellHeight = chartHeight / targets.length;
    
    g.selectAll('.cell')
      .data(gridData)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y) - cellHeight)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('fill', d => d.value > 0 ? colorScale(d.value) : 'transparent')
      .attr('opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5);
    
    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'contour-tooltip')
      .style('position', 'absolute')
      .style('padding', '8px 12px')
      .style('background', 'rgba(0, 0, 0, 0.85)')
      .style('color', 'white')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);
    
    // Add hover interactions
    g.selectAll('.cell')
      .on('mouseover', function(event, d) {
        if (d.value === 0) return;
        
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 2)
          .attr('stroke', '#000');
        
        tooltip.transition()
          .duration(200)
          .style('opacity', 1);
        
        tooltip.html(`
          <strong>Source:</strong> ${d.source}<br/>
          <strong>Target:</strong> ${d.target}<br/>
          <strong>Weight:</strong> ${d.value}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', 0.5)
          .attr('stroke', '#fff');
        
        tooltip.transition()
          .duration(200)
          .style('opacity', 0);
      });
    
    // X-axis with sampling if too many labels
    const maxLabels = 15;
    const xStep = Math.ceil(sources.length / maxLabels);
    const xAxisData = sources.filter((_, i) => i % xStep === 0);
    
    const xAxis = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`);
    
    xAxis.selectAll('.tick')
      .data(xAxisData)
      .enter()
      .append('g')
      .attr('class', 'tick')
      .attr('transform', (d, i) => `translate(${xScale(sources.indexOf(d))},0)`)
      .each(function(d) {
        const tick = d3.select(this);
        tick.append('line')
          .attr('y2', 6)
          .attr('stroke', '#333');
        tick.append('text')
          .attr('y', 9)
          .attr('dy', '0.71em')
          .attr('transform', 'rotate(-45)')
          .style('text-anchor', 'end')
          .style('font-size', '10px')
          .text(d);
      });
    
    // Y-axis with sampling
    const yStep = Math.ceil(targets.length / maxLabels);
    const yAxisData = targets.filter((_, i) => i % yStep === 0);
    
    const yAxis = g.append('g')
      .attr('class', 'y-axis');
    
    yAxis.selectAll('.tick')
      .data(yAxisData)
      .enter()
      .append('g')
      .attr('class', 'tick')
      .attr('transform', (d) => `translate(0,${yScale(targets.indexOf(d))})`)
      .each(function(d) {
        const tick = d3.select(this);
        tick.append('line')
          .attr('x2', -6)
          .attr('stroke', '#333');
        tick.append('text')
          .attr('x', -9)
          .attr('dy', '0.32em')
          .style('text-anchor', 'end')
          .style('font-size', '10px')
          .text(d);
      });
    
    // Axis labels
    g.append('text')
      .attr('class', 'x-axis-label')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(config?.axes?.x?.label || 'Source');
    
    g.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(config?.axes?.y?.label || 'Target');
    
    // Legend
    const legendWidth = 20;
    const legendHeight = chartHeight;
    
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - margin.right + 20},${margin.top})`);
    
    // Create gradient for legend
    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    
    const legendSteps = 10;
    d3.range(legendSteps + 1).forEach(i => {
      const value = (i / legendSteps) * maxValue;
      linearGradient.append('stop')
        .attr('offset', `${(i / legendSteps) * 100}%`)
        .attr('stop-color', colorScale(value));
    });
    
    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');
    
    // Legend axis
    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([legendHeight, 0]);
    
    const legendAxis = d3.axisRight(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.0f'));
    
    legend.append('g')
      .attr('transform', `translate(${legendWidth},0)`)
      .call(legendAxis)
      .style('font-size', '10px');
    
    legend.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -legendHeight / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(config?.legend?.title || 'Weight');
    
    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [processedData, width, height, margin, config]);
  
  if (!values || values.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-red-600">No data available</h2>
        <p className="text-gray-600">Please provide data in the correct format.</p>
      </div>
    );
  }
  
  if (!processedData) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-red-600">No valid data to display</h2>
        <p className="text-gray-600">Unable to create contour plot from the provided data.</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
     
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default ContourPlot;