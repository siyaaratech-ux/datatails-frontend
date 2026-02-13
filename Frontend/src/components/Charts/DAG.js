import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const DAG = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Directed Acyclic Graph');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('DAG.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData, formatForDAG }) => {
          const result = processChartData(data, query);
          
          // Format for DAG
          const dagFormat = formatForDAG(result.data);
          setChartData(dagFormat);
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
            setError('No DAG data available. Please process data first.');
          }
        } else {
          setError('No DAG data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing DAG data:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  useEffect(() => {
    if (!chartData || !chartData.nodes || !chartData.links || !d3Container.current) return;

    // Clear previous SVG content
    d3.select(d3Container.current).selectAll("*").remove();

    // Set dimensions and margins
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const width = d3Container.current.clientWidth || 800;
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

    // Ensure nodes have proper IDs
    const nodes = chartData.nodes.map((node, i) => ({
      ...node,
      id: node.id || i,
      name: node.name || 'Unnamed',
      value: node.value || 1
    }));

    // Ensure links reference node IDs correctly
    const links = chartData.links.map(link => ({
      ...link,
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target
    }));

    // Create simulation with better forces
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force("collision", d3.forceCollide().radius(d => (d.radius || Math.sqrt(d.value) * 3 + 15)));

    // Create color scale based on depth/level
    const maxLevel = d3.max(nodes, d => d.level || 0);
    const color = d3.scaleSequential()
      .domain([0, maxLevel])
      .interpolator(d3.interpolateViridis);

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.value || 1) * 2);

    // Create tooltip
    const tooltip = d3.select(d3Container.current)
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'rgba(255, 255, 255, 0.95)')
      .style('border', '2px solid #333')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('box-shadow', '0 4px 8px rgba(0,0,0,0.2)');

    // Create nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add circles to nodes
    node.append("circle")
      .attr("r", d => d.radius || Math.sqrt(d.value) * 4 + 10)
      .attr("fill", d => color(d.level || 0))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 3)
          .attr("r", (d.radius || Math.sqrt(d.value) * 4 + 10) * 1.2);
        
        const formattedValue = metadata.valueType === 'percentage' ? `${d.value}%` :
                              metadata.valueType === 'currency' ? `${d.value} ${metadata.unit || 'USD'}` :
                              metadata.unit ? `${d.value} ${metadata.unit}` :
                              d.value;
        
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${d.name}</strong><br/>
            ${metadata.valueLabel || 'Value'}: ${formattedValue}
            ${d.level !== undefined ? `<br/>Level: ${d.level}` : ''}
          `)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      })
      .on("mousemove", function(event) {
        tooltip
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("r", d.radius || Math.sqrt(d.value) * 4 + 10);
        tooltip.style('opacity', 0);
      });

    // Add labels to nodes with better positioning
    node.append("text")
      .attr("dy", d => (d.radius || Math.sqrt(d.value) * 4 + 10) + 15)
      .attr("text-anchor", "middle")
      .text(d => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name)
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("pointer-events", "none")
      .append("title")
      .text(d => d.name);

    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => {
          const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
          return source?.x || 0;
        })
        .attr("y1", d => {
          const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
          return source?.y || 0;
        })
        .attr("x2", d => {
          const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
          return target?.x || 0;
        })
        .attr("y2", d => {
          const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
          return target?.y || 0;
        });

      node.attr("transform", d => `translate(${d.x},${d.y})`);
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

  }, [chartData, chartTitle, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for DAG visualization...</div>;
  }

  if (error) {
    return (
      <div className="chart-error">
        <p>{error}</p>
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

export default DAG;
