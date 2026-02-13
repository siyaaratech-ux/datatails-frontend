import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const SmallMultiples = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Small Multiples');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('SmallMultiples.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData }) => {
          const result = processChartData(data, query);
          
          // Format for small multiples if needed
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
            setError('No small multiples data available. Please process data first.');
          }
        } else {
          setError('No small multiples data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for small multiples:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Improved grouping strategy - group by natural categories or value ranges
      const minValue = d3.min(chartData, d => d.value);
      const maxValue = d3.max(chartData, d => d.value);
      
      // Use a smarter grouping: try to find natural breaks or use value-based grouping
      const numCategories = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(chartData.length))));
      const range = maxValue - minValue;
      const rangeSize = range / numCategories;
      
      // Assign categories with better naming
      const categorizedData = chartData.map(d => {
        const categoryIndex = Math.min(numCategories - 1, Math.floor((d.value - minValue) / rangeSize));
        return {
          ...d,
          category: `Range ${categoryIndex + 1} (${(minValue + categoryIndex * rangeSize).toFixed(0)}-${(minValue + (categoryIndex + 1) * rangeSize).toFixed(0)})`
        };
      });
      
      // Group by category
      const groupedData = d3.group(categorizedData, d => d.category);
      
      // Set up dimensions - larger for better visibility
      const containerWidth = d3Container.current.clientWidth || 900;
      const containerHeight = 700;
      const margin = { top: 50, right: 30, bottom: 50, left: 60 };
      
      // Calculate grid layout
      const columns = 3;
      const rows = Math.ceil(groupedData.size / columns);
      
      const totalWidth = containerWidth;
      const totalHeight = containerHeight;
      const smallWidth = (totalWidth - margin.left - margin.right) / columns;
      const smallHeight = (totalHeight - margin.top - margin.bottom) / rows;
      const innerWidth = smallWidth - 10;
      const innerHeight = smallHeight - 30;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight)
        .style('background', '#fafafa');
      
      // Add main title
      svg.append('text')
        .attr('x', totalWidth / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .text(chartTitle);
      
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
      
      // Create groups for each small multiple
      const groups = svg.selectAll('.small-multiple')
        .data(Array.from(groupedData))
        .join('g')
        .attr('class', 'small-multiple')
        .attr('transform', (d, i) => {
          const col = i % columns;
          const row = Math.floor(i / columns);
          return `translate(${col * smallWidth + margin.left}, ${row * smallHeight + margin.top + 30})`;
        });
      
      // Add a title to each small multiple with better styling
      groups.append('rect')
        .attr('x', -5)
        .attr('y', -25)
        .attr('width', innerWidth + 10)
        .attr('height', 25)
        .attr('fill', '#e8f4f8')
        .attr('stroke', '#b3d9e6')
        .attr('rx', 4);
      
      groups.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#2c3e50')
        .text(d => {
          const name = d[0];
          return name.length > 35 ? name.substring(0, 32) + '...' : name;
        });
      
      // Set up scales
      const x = d3.scaleBand()
        .domain(d3.range(0, Math.min(10, d3.max(Array.from(groupedData), d => d[1].length))))
        .range([0, innerWidth])
        .padding(0.15);
      
      const y = d3.scaleLinear()
        .domain([0, maxValue * 1.1])
        .nice()
        .range([innerHeight, 0]);
      
      // Create bars for each small multiple
      groups.each(function(d, groupIndex) {
        const group = d3.select(this);
        const categoryData = d[1].slice(0, 10); // Limit to 10 items per multiple
        const localMaxValue = d3.max(categoryData, d => d.value);
        
        // Create x-axis with better styling
        group.append('g')
          .attr('transform', `translate(0, ${innerHeight})`)
          .call(d3.axisBottom(x).tickValues([]))
          .style('font-size', '10px');
        
        // Create y-axis with label
        const yAxis = group.append('g')
          .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth))
          .style('font-size', '10px');
        
        // Add Y-axis label (only for first column to avoid clutter)
        if (groupIndex % columns === 0) {
          yAxis.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -45)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text(metadata.yAxisLabel || 'Value');
        }
        
        // Add grid lines
        group.append('g')
          .attr('class', 'grid')
          .attr('transform', `translate(0, ${innerHeight})`)
          .call(d3.axisBottom(x).tickSize(-innerHeight).tickValues([]))
          .style('stroke-dasharray', '3,3')
          .style('opacity', 0.3)
          .style('stroke', '#999');
        
        // Add bars with better styling
        const bars = group.selectAll('.bar')
          .data(categoryData)
          .join('rect')
          .attr('class', 'bar')
          .attr('x', (d, i) => x(i))
          .attr('y', d => y(d.value))
          .attr('width', x.bandwidth())
          .attr('height', d => innerHeight - y(d.value))
          .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.5)
          .attr('rx', 3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                                  metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                                  metadata.unit ? `${d.value} ${metadata.unit}` :
                                  d.value;
            
            tooltip
              .style('opacity', 1)
              .html(`<strong>${d.name}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}`)
              .style('left', (event.pageX + 15) + 'px')
              .style('top', (event.pageY - 15) + 'px');
            
            d3.select(this)
              .attr('stroke', '#333')
              .attr('stroke-width', 3)
              .attr('opacity', 0.9);
          })
          .on('mousemove', function(event) {
            tooltip
              .style('left', (event.pageX + 15) + 'px')
              .style('top', (event.pageY - 15) + 'px');
          })
          .on('mouseleave', function() {
            tooltip.style('opacity', 0);
            
            d3.select(this)
              .attr('stroke', '#fff')
              .attr('stroke-width', 1.5)
              .attr('opacity', 1);
          });
        
        // Add value labels on bars (only for larger bars)
        group.selectAll('.bar-label')
          .data(categoryData.filter(d => (innerHeight - y(d.value)) > 20))
          .join('text')
          .attr('class', 'bar-label')
          .attr('x', (d, i) => x(i) + x.bandwidth() / 2)
          .attr('y', d => y(d.value) - 5)
          .attr('text-anchor', 'middle')
          .style('font-size', '9px')
          .style('font-weight', 'bold')
          .style('fill', '#333')
          .text(d => {
            const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                                  metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                                  metadata.unit ? `${d.value} ${metadata.unit}` :
                                  d.value;
            return formattedValue;
          });
      });
    }
  }, [chartData, loading, error, chartTitle, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for small multiples visualization...</div>;
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

export default SmallMultiples;
