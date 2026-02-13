import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const SunBurst = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Sunburst Visualization');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('SunBurst.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData, formatForSunburst }) => {
          const result = processChartData(data, query);
          
          // Format for sunburst
          const sunburstFormat = formatForSunburst(result.data, query);
          setChartData(sunburstFormat);
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
            setError('No sunburst data available. Please process data first.');
          }
        } else {
          setError('No sunburst data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing sunburst data:', err);
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
      const width = 700;
      const height = 700;
      const radius = Math.min(width, height) / 2;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      // Create hierarchy
      const root = d3.hierarchy(chartData)
        .sum(d => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      // Create partition layout
      const partition = d3.partition()
        .size([2 * Math.PI, radius]);

      partition(root);

      // Color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);

      // Create arcs
      const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

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

      // Add arcs
      svg.selectAll('path')
        .data(root.descendants())
        .join('path')
        .attr('d', arc)
        .attr('fill', d => {
          while (d.depth > 1) d = d.parent;
          return color(d.data.name);
        })
        .attr('fill-opacity', d => Math.max(0.6, 1 - d.depth * 0.2))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('fill-opacity', 1)
            .attr('stroke-width', 2);
          
          const formattedValue = d.value ? 
            (metadata.valueType === 'percentage' ? `${d.value}%` :
             metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
             metadata.unit ? `${d.value} ${metadata.unit}` :
             d.value.toLocaleString()) : 'N/A';
          
          const proportionLabel = metadata.valueType === 'percentage' ? 'Share' : 
                                 metadata.valueType === 'currency' ? 'Portion' :
                                 'Proportion';
          const proportionValue = d.value && root.value ? ((d.value / root.value) * 100).toFixed(1) : '0';
          
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.data.name}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}<br/>${proportionLabel}: ${proportionValue}%<br/>Depth: ${d.depth}`)
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
            .attr('fill-opacity', d => Math.max(0.6, 1 - d.depth * 0.2))
            .attr('stroke-width', 1);
          tooltip.style('opacity', 0);
        });

      // Add labels for arcs large enough
      svg.selectAll('text')
        .data(root.descendants().filter(d => (d.x1 - d.x0) * (d.y1 - d.y0) > 0.01))
        .join('text')
        .attr('transform', d => {
          const x = ((d.x0 + d.x1) / 2) * 180 / Math.PI;
          const y = -(d.y0 + d.y1) / 2;
          return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', d => (d.x0 + d.x1) / 2 < Math.PI ? 'start' : 'end')
        .text(d => {
          const name = d.data.name || 'Unnamed';
          return name.length > 12 ? name.substring(0, 9) + '...' : name;
        })
        .style('font-size', d => `${Math.max(10, 14 - d.depth * 2)}px`)
        .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
        .style('fill', '#333')
        .append('title')
        .text(d => d.data.name);
    }
  }, [chartData, loading, error, chartTitle, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for sunburst visualization...</div>;
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
      <div className="d3-container" ref={d3Container} style={{ width: '100%', height: '700px', minHeight: 500 }} />
    </div>
  );
};

export default SunBurst;
