import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const PolarArea = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Polar Area Chart');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('PolarArea.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData }) => {
          const result = processChartData(data, query);
          
          // Format for polar area chart if needed
          setChartData(result.data);
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
            setError('No polar area chart data available. Please process data first.');
          }
        } else {
          setError('No polar area chart data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for polar area chart:', err);
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
      const width = 600;
      const height = 600;
      const margin = { top: 50, right: 50, bottom: 50, left: 50 };
      const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);
      
      // Scales
      const x = d3.scaleBand()
        .domain(chartData.map(d => d.name))
        .range([0, 2 * Math.PI]);
      
      const y = d3.scaleRadial()
        .domain([0, d3.max(chartData, d => d.value)])
        .range([0, radius]);
      
      // Color scale
      const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.name))
        .range(d3.schemeCategory10);
      
      // Draw arcs
      svg.selectAll('path')
        .data(chartData)
        .join('path')
        .attr('fill', d => color(d.name))
        .attr('d', d3.arc()
          .innerRadius(0)
          .outerRadius(d => y(d.value))
          .startAngle(d => x(d.name))
          .endAngle(d => x(d.name) + x.bandwidth())
          .padAngle(0.01)
          .padRadius(radius / 2)
        )
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('opacity', 0.8)
        .style('cursor', 'pointer');
      
      // Add circular grid lines
      const yTicks = y.ticks(5);
      
      // Add radial grid lines
      svg.selectAll('.grid-circle')
        .data(yTicks)
        .join('circle')
        .attr('class', 'grid-circle')
        .attr('r', d => y(d))
        .attr('fill', 'none')
        .attr('stroke', '#ddd')
        .attr('stroke-dasharray', '2,2');
      
      // Add grid line labels
      svg.selectAll('.grid-label')
        .data(yTicks)
        .join('text')
        .attr('class', 'grid-label')
        .attr('y', d => -y(d))
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .text(d => d)
        .style('font-size', '8px')
        .style('fill', '#666');
      
      // Add axis lines
      svg.selectAll('.axis-line')
        .data(chartData)
        .join('line')
        .attr('class', 'axis-line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', (d, i) => {
          const angle = x(d.name) + x.bandwidth() / 2;
          return Math.sin(angle) * (radius + 10);
        })
        .attr('y2', (d, i) => {
          const angle = x(d.name) + x.bandwidth() / 2;
          return -Math.cos(angle) * (radius + 10);
        })
        .attr('stroke', '#ddd')
        .attr('stroke-width', 1);
      
      // Add labels
      svg.selectAll('.label')
        .data(chartData)
        .join('text')
        .attr('class', 'label')
        .attr('transform', d => {
          const angle = x(d.name) + x.bandwidth() / 2;
          const labelRadius = radius + 20;
          return `translate(${Math.sin(angle) * labelRadius}, ${-Math.cos(angle) * labelRadius})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', d => {
          const angle = x(d.name) + x.bandwidth() / 2;
          return angle < Math.PI / 2 || angle > Math.PI * 3 / 2 ? 'start' : 'end';
        })
        .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
        .style('font-size', `${Math.max(10, 16 - Math.floor(chartData.length / 10))}px`)
        .style('fill', '#333')
        .append('title')
        .text(d => d.name);
      
      // Add tooltips
      const tooltip = d3.select(d3Container.current)
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '1px')
        .style('border-radius', '5px')
        .style('padding', '10px');
      
      // Add hover interactions
      svg.selectAll('path')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .style('opacity', 1)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
            
          const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                                metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.value} ${metadata.unit}` :
                                d.isPercentage ? `${d.value}%` : d.value;
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.name}</strong><br>${metadata.valueLabel || 'Value'}: ${formattedValue}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseleave', function() {
          d3.select(this)
            .style('opacity', 0.8)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
            
          tooltip.style('opacity', 0);
        });
      
      // Add legend
      const legendWidth = 200;
      const legendHeight = chartData.length * 20;
      
      const legend = svg.append('g')
        .attr('transform', `translate(${-legendWidth / 2 + 20}, ${-legendHeight / 2 + 20})`);
      
      // Add legend items
      chartData.forEach((d, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);
          
        legendRow.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', color(d.name));
          
        legendRow.append('text')
          .attr('x', 20)
          .attr('y', 12)
          .text(d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
          .style('font-size', '10px');
      });
    }
  }, [chartData, loading, error, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for polar area chart...</div>;
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

export default PolarArea;