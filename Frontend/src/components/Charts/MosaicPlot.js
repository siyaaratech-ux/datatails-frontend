import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const MosaicPlot = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Mosaic Plot');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('MosaicPlot.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData, formatForMosaicPlot }) => {
          const result = processChartData(data, query);
          
          // Format for mosaic plot
          const mosaicFormat = formatForMosaicPlot(result.data);
          setChartData(mosaicFormat);
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
            setError('No mosaic plot data available. Please process data first.');
          }
        } else {
          setError('No mosaic plot data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for mosaic plot:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // For a mosaic plot, we'll create a grid of rectangles sized by their values
      
      // Normalize the data - convert to values that sum to 1
      const total = d3.sum(chartData, d => d.value);
      const normalizedData = chartData.map(d => ({
        ...d,
        normalizedValue: d.value / total
      }));
      
      // Sort data by value (largest first)
      normalizedData.sort((a, b) => b.normalizedValue - a.normalizedValue);
      
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
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      
      // Create a treemap layout
      const treemap = d3.treemap()
        .size([innerWidth, innerHeight])
        .padding(2);
      
      // Create hierarchy data for treemap
      const root = d3.hierarchy({
        name: 'root',
        children: normalizedData
      })
      .sum(d => d.normalizedValue);
      
      // Compute the treemap layout
      treemap(root);
      
      // Color scale
      const color = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(normalizedData, d => d.value / d3.max(chartData, c => c.value))]);
      
      // Create cells
      const cell = svg.selectAll('g')
        .data(root.leaves())
        .join('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);
      
      // Add rectangles
      cell.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => color(d.data.value / d3.max(chartData, c => c.value)))
        .attr('stroke', '#fff')
        .style('cursor', 'pointer');
      
      // Add text labels (only for cells that are large enough)
      cell.filter(d => (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 20)
        .append('text')
        .attr('x', 5)
        .attr('y', 15)
        .text(d => d.data.name)
        .attr('fill', d => d3.rgb(color(d.data.value / d3.max(chartData, c => c.value))).darker(4))
        .attr('font-size', d => Math.min(14, (d.x1 - d.x0) / 10 + 5))
        .style('font-weight', 'bold');
      
      // Add value labels (only for cells that are large enough)
      cell.filter(d => (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 40)
        .append('text')
        .attr('x', 5)
        .attr('y', 30)
        .text(d => {
          const formattedValue = metadata.valueType === 'percentage' ? `${d.data.value}%` :
                                metadata.valueType === 'currency' ? `${d.data.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.data.value} ${metadata.unit}` :
                                d.data.value;
          return formattedValue;
        })
        .attr('fill', d => d3.rgb(color(d.data.value / d3.max(chartData, c => c.value))).darker(3))
        .attr('font-size', d => Math.min(12, (d.x1 - d.x0) / 10 + 3));
      
      // Add a legend for the color scale
      const legendWidth = 300;
      const legendHeight = 20;
      const legendPosition = { x: innerWidth - legendWidth - 10, y: innerHeight + 20 };
      
      // Create a gradient for the legend
      const defs = svg.append('defs');
      const linearGradient = defs.append('linearGradient')
        .attr('id', 'mosaic-color-gradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
      
      // Add color stops
      linearGradient.selectAll('stop')
        .data(d3.range(0, 1.1, 0.1))
        .join('stop')
        .attr('offset', d => `${d * 100}%`)
        .attr('stop-color', d => color(d));
      
      // Create the legend rectangle
      svg.append('rect')
        .attr('x', legendPosition.x)
        .attr('y', legendPosition.y)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#mosaic-color-gradient)');
      
      // Add legend axis
      const legendScale = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value)])
        .range([0, legendWidth]);
      
      const legendAxis = d3.axisBottom(legendScale).ticks(5);
      
      svg.append('g')
        .attr('transform', `translate(${legendPosition.x}, ${legendPosition.y + legendHeight})`)
        .call(legendAxis);
      
      // Add legend title
      svg.append('text')
        .attr('x', legendPosition.x)
        .attr('y', legendPosition.y - 5)
        .text(metadata.valueLabel || 'Value')
        .style('font-size', '12px');
      
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
      
      // Add hover interactions
      cell
        .on('mouseover', function(event, d) {
          d3.select(this).select('rect')
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
          
          const formattedValue = metadata.valueType === 'percentage' ? `${d.data.value}%` :
                                metadata.valueType === 'currency' ? `${d.data.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.data.value} ${metadata.unit}` :
                                d.data.value;
          
          const proportionLabel = metadata.valueType === 'percentage' ? 'Share' : 
                                 metadata.valueType === 'currency' ? 'Portion' :
                                 'Proportion';
          const proportionValue = (d.data.normalizedValue * 100).toFixed(1);
          
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.data.name}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}<br/>${proportionLabel}: ${proportionValue}%`)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseleave', function() {
          d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
          
          tooltip.style('opacity', 0);
        });
    }
  }, [chartData, loading, error, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for mosaic plot...</div>;
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

export default MosaicPlot;