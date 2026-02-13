import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const StackedArea = ({ data, query, categories }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Stacked Area Chart');
  const [visibleCategories, setVisibleCategories] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Time', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('StackedArea.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData, formatForStackedArea }) => {
          const result = processChartData(data, query);
          
          // Format for stacked area chart - it needs data with multiple category columns
          const stackedFormat = formatForStackedArea(result.data);
          setChartData(stackedFormat.data || result.data);
          setChartTitle(result.title);
          setDataSource(result.source);
          setMetadata(result.metadata || { valueLabel: 'Value', xAxisLabel: 'Time', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
          setVisibleCategories(stackedFormat.categories || []);
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
            setError('No stacked area chart data available. Please process data first.');
          }
        } else {
          setError('No stacked area chart data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for stacked area chart:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  useEffect(() => {
    if (chartData && Array.isArray(chartData) && chartData.length > 0) {
      setVisibleCategories(categories && categories.length > 0 ? [...categories] : Object.keys(chartData[0]).filter(k => k !== 'name'));
    }
  }, [chartData, categories]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Use categories prop for stacking
      const timePoints = chartData.map(d => d.name);
      const stackCategories = (categories && categories.length > 0 ? categories : Object.keys(chartData[0] || {}).filter(k => k !== 'name')).filter(cat => visibleCategories.includes(cat));
      // Prepare stack data
      const stack = d3.stack().keys(stackCategories);
      const stackedData = stack(chartData);
      
      // Set up dimensions
      const width = 800;
      const height = 500;
      const margin = { top: 40, right: 100, bottom: 60, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Create scales
      const x = d3.scaleBand()
        .domain(timePoints)
        .range([0, innerWidth])
        .padding(0.1);
      
      // Calculate max value from all categories for proper scaling
      const maxValue = d3.max(chartData, d => {
        const categoryValues = stackCategories.map(cat => d[cat] || 0);
        return d3.sum(categoryValues);
      });
      
      const y = d3.scaleLinear()
        .domain([0, maxValue * 1.1]) // Add 10% padding
        .range([innerHeight, 0]);
      
      // Area generator
      const area = d3.area()
        .x(d => x(d.data.name) + x.bandwidth() / 2)
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveCardinal);
      
      // Color scale
      const color = d3.scaleOrdinal()
        .domain(stackCategories)
        .range(d3.schemeCategory10);
      
      // Draw areas
      svg.selectAll('.area')
        .data(stackedData)
        .join('path')
        .attr('class', 'area')
        .attr('d', area)
        .attr('fill', d => color(d.key))
        .attr('opacity', 0.8)
        .style('cursor', 'pointer');
      
      // Add axes
      const xAxis = d3.axisBottom(x)
        .tickFormat(d => d.length > 15 ? d.substring(0, 15) + '...' : d);
      
      svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
      
      const yAxis = d3.axisLeft(y);
      
      svg.append('g')
        .call(yAxis);
      
      // Add axis labels with metadata
      svg.append('text')
        .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(metadata.xAxisLabel || 'Time');
      
      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -innerHeight / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(metadata.yAxisLabel || 'Value');
      
      // Add legend
      const legend = svg.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);
      stackCategories.forEach((cat, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 24})`)
          .attr('tabindex', 0)
          .attr('role', 'button')
          .attr('aria-label', `Toggle ${cat}`)
          .style('cursor', 'pointer')
          .on('click keydown', (event) => {
            if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
              setVisibleCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
            }
          });
        legendRow.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', color(cat))
          .attr('opacity', visibleCategories.includes(cat) ? 1 : 0.3);
        legendRow.append('text')
          .attr('x', 20)
          .attr('y', 12)
          .text(cat)
          .style('font-size', '12px')
          .attr('fill', visibleCategories.includes(cat) ? '#222' : '#aaa');
      });
      
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
      svg.selectAll('.area')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('opacity', 1);
            
          tooltip
            .style('opacity', 1);
        })
        .on('mousemove', function(event, d) {
          // Find mouse position in data coordinates
          const [xPos] = d3.pointer(event);
          
          // Find closest data point
          const timeIndex = Math.floor(xPos / (innerWidth / timePoints.length));
          const time = timePoints[Math.min(timeIndex, timePoints.length - 1)];
          
          if (time) {
            const seriesName = d.key;
            const seriesData = stackedData.find(item => item.data.name === time);
            const value = seriesData ? seriesData[seriesName] : 0;
            
            const formattedValue = metadata.valueType === 'percentage' ? `${value.toFixed(2)}%` :
                                  metadata.valueType === 'currency' ? `${value.toFixed(2)} ${metadata.unit || 'USD'}` :
                                  value.toFixed(2);
            tooltip
              .html(`<strong>${seriesName}</strong><br>${time}: ${formattedValue}`)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 15) + 'px');
          }
        })
        .on('mouseleave', function() {
          d3.select(this)
            .attr('opacity', 0.8);
            
          tooltip.style('opacity', 0);
        });
    }
  }, [chartData, loading, error, categories, visibleCategories, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for stacked area chart...</div>;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="chart-title">{chartTitle}</h3>
        <button
          aria-label="Stacked area chart info"
          className="info-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}
          onClick={() => setShowHelp(true)}
        >
          <span role="img" aria-label="info">ℹ️</span>
        </button>
      </div>
      {showHelp && (
        <div className="info-modal" role="dialog" aria-modal="true">
          <div className="info-content">
            <h4>About Stacked Area Charts</h4>
            <p>A stacked area chart visualizes the evolution of multiple data series over time. Each colored area represents a category, and the height shows the cumulative value at each time point. You can toggle categories in the legend to focus on specific series.</p>
            <button onClick={() => setShowHelp(false)} className="close-btn">Close</button>
          </div>
        </div>
      )}
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <div className="d3-container" ref={d3Container} />
    </div>
  );
};

export default StackedArea;