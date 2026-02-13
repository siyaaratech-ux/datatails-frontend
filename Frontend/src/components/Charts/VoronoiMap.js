import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const VoronoiMap = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Voronoi Map');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('VoronoiMap.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData, formatForVoronoiMap }) => {
          const result = processChartData(data, query);
          
          // Format for voronoi map
          const voronoiFormat = formatForVoronoiMap(result.data);
          setChartData(voronoiFormat);
          setChartTitle(result.title);
          setDataSource(result.source);
          setMetadata(result.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
          setLoading(false);
        });
      } else {
        // Check status
        const statusData = localStorage.getItem('chartData_status');
        if (statusData) {
          const status = JSON.parse(statusData);
          if (!status.isValid) {
            setError(status.message || 'Invalid response - charts cannot be generated');
          } else {
            setError('No voronoi map data available. Please process data first.');
          }
        } else {
          setError('No voronoi map data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for voronoi map:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Set up dimensions
      const width = 800;
      const height = 600;
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      
      // Prepare data points with random positions (in a real application, points might have real coordinates)
      const points = chartData.map((d, i) => {
        // Create a deterministic pseudo-random position based on the name
        const hash = d.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        return {
          ...d,
          x: margin.left + (hash % 100) / 100 * innerWidth,
          y: margin.top + ((hash * 7) % 100) / 100 * innerHeight
        };
      });
      
      // Create Voronoi diagram
      const delaunay = d3.Delaunay.from(
        points,
        d => d.x,
        d => d.y
      );
      
      const voronoi = delaunay.voronoi([margin.left, margin.top, width - margin.right, height - margin.bottom]);
      
      // Create color scale based on values
      const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, d3.max(points, d => d.value)]);
      
      // Create group for Voronoi cells
      const cells = svg.append('g')
        .selectAll('path')
        .data(points)
        .join('path')
        .attr('d', (d, i) => voronoi.renderCell(i))
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#fff')
        .style('opacity', 0.8)
        .style('cursor', 'pointer');
      
      // Add points
      const circles = svg.append('g')
        .selectAll('circle')
        .data(points)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 4)
        .attr('fill', '#fff')
        .attr('stroke', '#333')
        .style('cursor', 'pointer');
      
      // Add labels for points with larger values
      const labels = svg.append('g')
        .selectAll('text')
        .data(points.filter(d => d.value > d3.quantile(points.map(p => p.value), 0.7))) // Only show labels for larger values
        .join('text')
        .attr('x', d => d.x)
        .attr('y', d => d.y - 10)
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#333')
        .style('pointer-events', 'none');
      
      // Add tooltips
      const tooltip = d3.select(d3Container.current)
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'rgba(255, 255, 255, 0.95)')
        .style('border', '2px solid #333')
        .style('border-radius', '8px')
        .style('padding', '12px')
        .style('pointer-events', 'none')
        .style('font-size', '12px')
        .style('box-shadow', '0 4px 8px rgba(0,0,0,0.2)')
        .style('z-index', '1000');
      
      // Add hover interactions for cells
      cells
        .on('mouseover', function(event, d) {
          // Highlight cell
          d3.select(this)
            .style('opacity', 1)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
          
          // Highlight point
          circles.filter(p => p === d)
            .attr('r', 6)
            .attr('fill', '#ffcc00');
          
          // Highlight label if exists
          labels.filter(p => p === d)
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            .style('fill', '#000');
          
          const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                                metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.value} ${metadata.unit}` :
                                d.value;
          
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.name}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}`)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseleave', function(event, d) {
          // Reset cell style
          d3.select(this)
            .style('opacity', 0.8)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
          
          // Reset point style
          circles.filter(p => p === d)
            .attr('r', 4)
            .attr('fill', '#fff');
          
          // Reset label style
          labels.filter(p => p === d)
            .style('font-weight', 'normal')
            .style('font-size', '10px')
            .style('fill', '#333');
          
          tooltip.style('opacity', 0);
        });
      
      // Add hover interactions for points (same as cells)
      circles
        .on('mouseover', function(event, d) {
          // Highlight cell
          cells.filter(p => p === d)
            .style('opacity', 1)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
          
          // Highlight point
          d3.select(this)
            .attr('r', 6)
            .attr('fill', '#ffcc00');
          
          // Highlight label if exists
          labels.filter(p => p === d)
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            .style('fill', '#000');
          
          const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                                metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.value} ${metadata.unit}` :
                                d.value;
          
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.name}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}`)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseleave', function(event, d) {
          // Reset cell style
          cells.filter(p => p === d)
            .style('opacity', 0.8)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
          
          // Reset point style
          d3.select(this)
            .attr('r', 4)
            .attr('fill', '#fff');
          
          // Reset label style
          labels.filter(p => p === d)
            .style('font-weight', 'normal')
            .style('font-size', '10px')
            .style('fill', '#333');
          
          tooltip.style('opacity', 0);
        });
      
      // Add a color legend
      const legendWidth = 300;
      const legendHeight = 20;
      const legendPosition = { x: innerWidth - legendWidth + margin.left, y: height - margin.bottom + 10 };
      
      // Create a gradient for the legend
      const defs = svg.append('defs');
      const linearGradient = defs.append('linearGradient')
        .attr('id', 'voronoi-color-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
      
      // Add color stops to gradient
      const colorStops = d3.range(0, 1.01, 0.1);
      
      linearGradient.selectAll('stop')
        .data(colorStops)
        .join('stop')
        .attr('offset', d => `${d * 100}%`)
        .attr('stop-color', d => colorScale(d * d3.max(points, p => p.value)));
      
      // Create the legend rectangle
      svg.append('rect')
        .attr('x', legendPosition.x)
        .attr('y', legendPosition.y)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#voronoi-color-gradient)');
      
      // Create a scale for the legend
      const legendScale = d3.scaleLinear()
        .domain([0, d3.max(points, d => d.value)])
        .range([0, legendWidth]);
      
      // Add legend axis
      const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d => d);
      
      svg.append('g')
        .attr('transform', `translate(${legendPosition.x}, ${legendPosition.y + legendHeight})`)
        .call(legendAxis);
      
      // Add legend title
      svg.append('text')
        .attr('x', legendPosition.x)
        .attr('y', legendPosition.y - 5)
        .text(metadata.valueLabel || 'Value')
        .style('font-size', '12px');
      
      // Add title
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .text(chartTitle);
    }
  }, [chartData, loading, error, chartTitle, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for voronoi map...</div>;
  }

  if (error) {
    return (
      <div className="chart-error">
        <div className="error-message">{error}</div>
        <div className="debug-info">
          <h4>Debug data:</h4>
          <pre>{typeof data === 'object' ? JSON.stringify(data, null, 2).substring(0, 300) : 'No data'}</pre>
          <h4>Query text (sample):</h4>
          <pre>
            {typeof query === 'string' ? query.substring(0, 300) : 
             typeof query === 'object' && query.response ? query.response.substring(0, 300) : 
             'No query text'}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <div className="d3-container" ref={d3Container} />
    </div>
  );
};

export default VoronoiMap;