import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const ConnectionMap = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Connection Map');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('ConnectionMap.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData, formatForConnectionMap }) => {
          const result = processChartData(data, query);
          
          // Format for connection map
          const connectionFormat = formatForConnectionMap(result.data);
          setChartData(connectionFormat);
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
            setError('No connection map data available. Please process data first.');
          }
        } else {
          setError('No connection map data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for connection map:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  // D3 rendering effect
  useEffect(() => {
    if (!loading && !error && chartData && chartData.nodes && chartData.links && d3Container.current) {
      // Clear previous visualization
      d3.select(d3Container.current).selectAll('*').remove();

      // Set up dimensions
      const width = 900;
      const height = 700;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      
      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Prepare nodes and links
      const nodes = chartData.nodes.map((node, i) => ({
        ...node,
        id: node.id || i,
        name: node.name || 'Unnamed',
        value: node.value || 1,
        x: node.x || width / 2,
        y: node.y || height / 2
      }));

      const links = chartData.links.map(link => ({
        ...link,
        source: typeof link.source === 'object' ? link.source.id : (link.source || 0),
        target: typeof link.target === 'object' ? link.target.id : (link.target || 0),
        value: link.value || 1
      }));

      // Create force simulation for better layout
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(d => 150 - (d.value || 1) * 10))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2 - margin.left, height / 2 - margin.top))
        .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.value) * 5 + 20));

      // Color scale based on value
      const maxValue = d3.max(nodes, d => d.value);
      const minValue = d3.min(nodes, d => d.value);
      const colorScale = d3.scaleSequential()
        .domain([minValue, maxValue])
        .interpolator(d3.interpolateBlues);

      // Create links
      const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', d => Math.min(0.6, d.value || 0.5))
        .attr('stroke-width', d => Math.sqrt(d.value || 1) * 2);

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

      // Create nodes
      const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(nodes)
        .join('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
        );

      // Add circles for nodes
      const nodeCircles = node.append('circle')
        .attr('r', d => Math.sqrt(d.value) * 6 + 12)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');

      // Add text labels with better positioning
      const nodeLabels = node.append('text')
        .attr('dy', d => Math.sqrt(d.value) * 6 + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .style('fill', '#333')
        .style('pointer-events', 'none')
        .text(d => {
          const name = d.name || 'Unnamed';
          return name.length > 20 ? name.substring(0, 17) + '...' : name;
        });

      // Add value labels below node name
      const valueLabels = node.append('text')
        .attr('dy', d => Math.sqrt(d.value) * 6 + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#666')
        .style('pointer-events', 'none')
        .text(d => {
          const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                                metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                                metadata.unit ? `${d.value} ${metadata.unit}` :
                                d.value;
          return formattedValue;
        });

      // Add hover interactions
      nodeCircles
        .on('mouseover', function(event, d) {
          d3.select(this)
            .attr('stroke-width', 4)
            .attr('r', Math.sqrt(d.value) * 6 + 15);
          
          // Highlight connected links
          link
            .attr('stroke', l => {
              const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
              const targetId = typeof l.target === 'object' ? l.target.id : l.target;
              return (sourceId === d.id || targetId === d.id) ? '#333' : '#999';
            })
            .attr('stroke-width', l => {
              const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
              const targetId = typeof l.target === 'object' ? l.target.id : l.target;
              return (sourceId === d.id || targetId === d.id) ? Math.sqrt(l.value || 1) * 4 : Math.sqrt(l.value || 1) * 2;
            });
          
          // Highlight connected nodes
          nodeCircles
            .attr('stroke-width', n => {
              const isConnected = links.some(l => {
                const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                return (sourceId === d.id && targetId === n.id) || (targetId === d.id && sourceId === n.id);
              });
              return (n.id === d.id || isConnected) ? 3 : 2;
            });

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
          // Reset link styles
          link
            .attr('stroke', '#999')
            .attr('stroke-width', l => Math.sqrt(l.value || 1) * 2);
          
          // Reset node styles
          nodeCircles
            .attr('stroke-width', 2)
            .attr('r', n => Math.sqrt(n.value) * 6 + 12);
          
          tooltip.style('opacity', 0);
        });
      
      // Update positions on each simulation tick
      function ticked() {
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
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      }
      
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

      simulation.on('tick', ticked);
    }
  }, [chartData, loading, error, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for connection map...</div>;
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

export default ConnectionMap;
