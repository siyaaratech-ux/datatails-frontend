import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const TreeDiagram = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Tree Diagram');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('TreeDiagram.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData, formatForTreeDiagram }) => {
          const result = processChartData(data, query);
          
          // Format for tree diagram - ensure it has hierarchical structure
          const treeFormat = formatForTreeDiagram(result.data);
          setChartData(treeFormat);
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
            setError('No tree diagram data available. Please process data first.');
          }
        } else {
          setError('No tree diagram data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for tree diagram:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Use hierarchical data if available, ensure it has proper structure
      let treeData = chartData;
      
      if (!treeData || !treeData.children) {
        // If not hierarchical, create a simple tree from flat data
        if (Array.isArray(chartData)) {
          treeData = {
            name: chartTitle || "Root",
            children: chartData.map(item => ({
              name: item.name || 'Unnamed',
              value: item.value || 1
            }))
          };
        } else {
          setError('Invalid data format for tree diagram');
          return;
        }
      }

      // Set up dimensions
      const width = 1000;
      const height = 700;
      const marginTop = 20;
      const marginRight = 20;
      const marginBottom = 20;
      const marginLeft = 40;
      
      // Create a hierarchy from the data
      const root = d3.hierarchy(treeData)
        .sum(d => d.value || 1)
        .sort((a, b) => (b.value || 0) - (a.value || 0));
      
      // Calculate parameters for horizontal tree layout
      const dx = 20; // Node size (height)
      const dy = (width - marginRight - marginLeft) / (1 + root.height); // Distance between levels
      
      // Create tree layout and link shape generator
      const tree = d3.tree().nodeSize([dx, dy]);
      const diagonal = d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-marginLeft, -marginTop, width, height])
        .style('font', '12px sans-serif');

      // Compute tree layout
      tree(root);
      
      // Color scale
      const color = d3.scaleOrdinal(d3.schemeCategory10);
      
      // Create tooltip
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
      
      // Add links
      svg.append('g')
        .attr('fill', 'none')
        .attr('stroke', '#555')
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', 1.5)
        .selectAll('path')
        .data(root.links())
        .join('path')
        .attr('d', diagonal);
      
      // Add nodes
      const node = svg.append('g')
        .selectAll('g')
        .data(root.descendants())
        .join('g')
        .attr('transform', d => `translate(${d.y},${d.x})`);
      
      // Add circles for nodes
      node.append('circle')
        .attr('r', d => d.data.value ? Math.sqrt(d.data.value) * 2 + 4 : 4)
        .attr('fill', d => d.depth === 0 ? '#333' : color(d.data.name))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('r', d => (d.data.value ? Math.sqrt(d.data.value) * 2 + 4 : 4) * 1.3)
            .attr('stroke-width', 3);
          
          const formattedValue = d.data.value ? 
            (metadata.valueType === 'percentage' ? `${d.data.value}%` :
             metadata.valueType === 'currency' ? `${d.data.value} ${metadata.unit || 'USD'}` :
             metadata.unit ? `${d.data.value} ${metadata.unit}` :
             d.data.value) : 'N/A';
          
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.data.name}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}<br/>Depth: ${d.depth}`)
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
            .attr('r', d => d.data.value ? Math.sqrt(d.data.value) * 2 + 4 : 4)
            .attr('stroke-width', 2);
          tooltip.style('opacity', 0);
        });
      
      // Add labels
      node.append('text')
        .attr('dy', '0.32em')
        .attr('x', d => d.children ? -6 : 6)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .text(d => {
          const name = d.data.name || 'Unnamed';
          return name.length > 25 ? name.substring(0, 22) + '...' : name;
        })
        .style('font-size', '11px')
        .style('font-weight', d => d.depth === 0 ? 'bold' : 'normal')
        .style('fill', '#333')
        .clone(true)
        .lower()
        .attr('stroke', 'white')
        .attr('stroke-width', 3);
      
      // Add value labels for leaf nodes
      node.filter(d => !d.children && d.data.value)
        .append('text')
        .attr('dy', '1.5em')
        .attr('x', 6)
        .attr('text-anchor', 'start')
        .text(d => {
          const formattedValue = metadata.valueType === 'percentage' ? `${d.data.value}%` :
                                metadata.valueType === 'currency' ? `${d.data.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.data.value} ${metadata.unit}` :
                                d.data.value;
          return formattedValue;
        })
        .style('font-size', '10px')
        .style('fill', '#666');
    }
  }, [chartData, loading, error, chartTitle, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for tree diagram...</div>;
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

export default TreeDiagram;
