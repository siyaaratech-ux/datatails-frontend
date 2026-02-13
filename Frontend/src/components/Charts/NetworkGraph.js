import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const NetworkGraph = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Network Graph Visualization');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('NetworkGraph.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData, formatForNetworkGraph }) => {
          const result = processChartData(data, query);
          
          // Format for network graph
          const networkFormat = formatForNetworkGraph(result.data);
          setChartData(networkFormat);
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
            setError('No network graph data available. Please process data first.');
          }
        } else {
          setError('No network graph data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for network graph:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Ensure chartData has nodes and links structure
      let nodes, links;
      
      if (chartData.nodes && chartData.links) {
        // Already in network format
        nodes = chartData.nodes.map((node, i) => ({
          ...node,
          id: node.id || i,
          name: node.name || 'Unnamed',
          value: node.value || 1,
          radius: Math.sqrt(node.value || 1) * 3 + 8
        }));
        links = chartData.links;
      } else if (Array.isArray(chartData)) {
        // Convert array to network format
        nodes = chartData.map((item, i) => ({
          id: i,
          name: item.name || 'Unnamed',
          value: item.value || 1,
          radius: Math.sqrt(item.value || 1) * 3 + 8
        }));
        
        // Create links based on value similarity
        links = [];
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const valueDiff = Math.abs(nodes[i].value - nodes[j].value);
            const maxValue = Math.max(nodes[i].value, nodes[j].value);
            const similarity = 1 - (valueDiff / maxValue);
            
            if (similarity > 0.7) {
              links.push({
                source: i,
                target: j,
                strength: similarity
              });
            }
          }
        }
        
        // Ensure every node has at least one connection
        nodes.forEach((node, i) => {
          if (!links.some(link => link.source === i || link.target === i)) {
            let closestNode = null;
            let minDiff = Infinity;
            
            for (let j = 0; j < nodes.length; j++) {
              if (i !== j) {
                const diff = Math.abs(node.value - nodes[j].value);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestNode = j;
                }
              }
            }
            
            if (closestNode !== null) {
              links.push({
                source: i,
                target: closestNode,
                strength: 0.5
              });
            }
          }
        });
      } else {
        setError('Invalid data format for network graph');
        return;
      }

      // Set up dimensions
      const width = 800;
      const height = 600;
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      
      // Create force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 150 - (d.strength || 0.5) * 50))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 5));
      
      // Color scale based on value
      const maxValue = d3.max(nodes, d => d.value);
      const minValue = d3.min(nodes, d => d.value);
      const colorScale = d3.scaleSequential()
        .domain([minValue, maxValue])
        .interpolator(d3.interpolateBlues);
      
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
      
      // Create links
      const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', d => (d.strength || 0.5) * 0.6)
        .attr('stroke-width', d => Math.sqrt(d.strength || 0.5) * 2);
      
      // Create nodes
      const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));
      
      // Add circles for nodes
      node.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('stroke-width', 3)
            .attr('r', d.radius * 1.2);
          
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
        .on('mouseout', function(event, d) {
          d3.select(this)
            .attr('stroke-width', 2)
            .attr('r', d.radius);
          tooltip.style('opacity', 0);
        });
      
      // Add text labels with better positioning
      node.append('text')
        .attr('dy', d => d.radius + 15)
        .attr('text-anchor', 'middle')
        .text(d => {
          const name = d.name || 'Unnamed';
          return name.length > 20 ? name.substring(0, 17) + '...' : name;
        })
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .style('pointer-events', 'none')
        .append('title')
        .text(d => d.name);
      
      // Update positions during simulation
      simulation.on('tick', () => {
        link
          .attr('x1', d => {
            const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
            return source?.x || 0;
          })
          .attr('y1', d => {
            const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
            return source?.y || 0;
          })
          .attr('x2', d => {
            const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
            return target?.x || 0;
          })
          .attr('y2', d => {
            const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
            return target?.y || 0;
          });
        
        node
          .attr('transform', d => `translate(${d.x},${d.y})`);
      });
      
      // Drag functions
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }
  }, [chartData, loading, error, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for network graph visualization...</div>;
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

export default NetworkGraph;