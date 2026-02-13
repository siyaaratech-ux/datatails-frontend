import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const CirclePacking = ({ data, query }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Circle Packing Visualization');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
  const d3Container = useRef(null);

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('CirclePacking.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData, formatForCirclePacking }) => {
          const result = processChartData(data, query);
          
          // Format for circle packing
          const circleFormat = formatForCirclePacking(result.data);
          setChartData(circleFormat.data || circleFormat);
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
            setError('No circle packing data available. Please process data first.');
          }
        } else {
          setError('No circle packing data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing circle packing data:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  useEffect(() => {
    if (!chartData || !d3Container.current) return;

    // Clear previous SVG content
    d3.select(d3Container.current).selectAll("*").remove();

    // Set dimensions and margins
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const width = d3Container.current.clientWidth || 700;
    const height = 600;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(d3Container.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(chartTitle);

    // Create hierarchy
    const root = d3.hierarchy(chartData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create pack layout
    d3.pack()
      .size([innerWidth, innerHeight])
      .padding(3)(root);

    // Color scale
    const color = d3.scaleSequential()
      .domain([0, root.height])
      .interpolator(d3.interpolateViridis);

    // Create tooltip
    const tooltip = d3.select(d3Container.current)
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'rgba(255, 255, 255, 0.95)')
      .style('border', '2px solid #333')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('box-shadow', '0 4px 8px rgba(0,0,0,0.2)')
      .style('z-index', '1000');

    // Add circles
    svg.selectAll('circle')
      .data(root.descendants())
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', d => color(d.depth))
      .attr('fill-opacity', d => d.children ? 0.6 : 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('fill-opacity', d => d.children ? 0.8 : 1);
        
        const formattedValue = d.value ? 
          (metadata.valueType === 'percentage' ? `${d.value}%` :
           metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
           metadata.unit ? `${d.value} ${metadata.unit}` :
           d.value.toLocaleString()) : 'N/A';
        
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.data.name || 'Unnamed'}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}<br/>Depth: ${d.depth}`)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('fill-opacity', d => d.children ? 0.6 : 0.8);
        tooltip.style('opacity', 0);
      });

    // Add labels for circles large enough
    svg.selectAll('text')
      .data(root.descendants().filter(d => d.r > 20))
      .join('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(d => {
        const name = d.data.name || 'Unnamed';
        return name.length > 15 ? name.substring(0, 12) + '...' : name;
      })
      .style('font-size', d => `${Math.max(10, Math.min(14, d.r / 5))}px`)
      .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
      .style('fill', '#333')
      .style('pointer-events', 'none')
      .append('title')
      .text(d => d.data.name);

  }, [chartData, chartTitle, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for circle packing visualization...</div>;
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
      <div ref={d3Container} style={{ width: '100%', height: '600px', minHeight: 400 }}></div>
    </div>
  );
};

export default CirclePacking;
