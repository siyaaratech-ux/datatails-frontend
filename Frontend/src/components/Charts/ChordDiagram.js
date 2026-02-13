import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const ChordDiagram = ({ data, query }) => {
  const d3Container = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Chord Diagram');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Try to load data from localStorage
      const storedData = localStorage.getItem('Chord.json');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setChartData(parsedData.data);
        setChartTitle(parsedData.title);
        setDataSource(parsedData.source);
        setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
        setLoading(false);
      } else if (data) {
        // Process data using processChartData from DataPU if directly provided
        import('./DataPU').then(({ processChartData, formatForChordDiagram }) => {
          const result = processChartData(data, query);
          
          // Format for chord diagram
          const chordFormat = formatForChordDiagram(result.data);
          setChartData(chordFormat);
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
            setError('No chord diagram data available. Please process data first.');
          }
        } else {
          setError('No chord diagram data available. Please process data first.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Error processing data for chord diagram:', err);
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
      const innerRadius = Math.min(width, height) * 0.3;
      const outerRadius = innerRadius * 1.1;

      // Create matrix data from chartData
      // For a chord diagram, we need a square matrix of relationships
      // This is a simple example that will create a matrix from list data
      // In a real application, you'd process the data more specifically
      const names = chartData.map(d => d.name);
      const matrix = [];
      
      // Create an empty matrix
      for (let i = 0; i < names.length; i++) {
        matrix[i] = Array(names.length).fill(0);
      }
      
      // Fill in the matrix with values
      // This is a simple approach - in reality you'd have actual relationship data
      for (let i = 0; i < names.length; i++) {
        for (let j = 0; j < names.length; j++) {
          if (i !== j) {
            // Create some relationship data based on the values
            matrix[i][j] = chartData[i].value * chartData[j].value / 
                          (Math.max(...chartData.map(d => d.value)) * 10);
          }
        }
      }

      // Create SVG
      const svg = d3.select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      // Create color scale
      const color = d3.scaleOrdinal()
        .domain(names)
        .range(d3.schemeCategory10);

      // Create the chord diagram
      const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

      const chords = chord(matrix);

      // Create the arcs for each group
      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      const g = svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");

      g.append("path")
        .attr("fill", d => color(names[d.index]))
        .attr("stroke", "white")
        .attr("d", arc);

      // Add labels
      g.append("text")
        .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("transform", d => `
          rotate(${(d.angle * 180 / Math.PI - 90)})
          translate(${outerRadius + 10})
          ${d.angle > Math.PI ? "rotate(180)" : ""}
        `)
        .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
        .text(d => names[d.index])
        .style("font-size", "10px");

      // Create the ribbons
      svg.append("g")
        .attr("fill-opacity", 0.67)
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("d", d3.ribbon().radius(innerRadius))
        .attr("fill", d => color(names[d.source.index]))
        .attr("stroke", d => d3.rgb(color(names[d.source.index])).darker());

      // Add a tooltip
      const tooltip = d3.select(d3Container.current)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px");

      // Tooltip events
      svg.selectAll("path")
        .on("mouseover", function(event, d) {
          tooltip.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
          let tooltipText = "";
          if (d.source && d.target) {
            const formattedValue = metadata.valueType === 'percentage' ? `${d.source.value.toFixed(2)}%` :
                                  metadata.valueType === 'currency' ? `${d.source.value.toFixed(2)} ${metadata.unit || 'USD'}` :
                                  metadata.unit ? `${d.source.value.toFixed(2)} ${metadata.unit}` :
                                  d.source.value.toFixed(2);
            tooltipText = `<strong>${names[d.source.index]} → ${names[d.target.index]}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}`;
          } else {
            const formattedValue = metadata.valueType === 'percentage' ? `${chartData[d.index].value}%` :
                                  metadata.valueType === 'currency' ? `${chartData[d.index].value} ${metadata.unit || 'USD'}` :
                                  metadata.unit ? `${chartData[d.index].value} ${metadata.unit}` :
                                  chartData[d.index].value;
            tooltipText = `<strong>${names[d.index]}</strong><br/>${metadata.valueLabel || 'Value'}: ${formattedValue}`;
          }
          
          tooltip
            .html(tooltipText)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("background-color", "rgba(255, 255, 255, 0.95)")
            .style("border", "2px solid #333")
            .style("border-radius", "8px")
            .style("padding", "12px")
            .style("box-shadow", "0 4px 8px rgba(0,0,0,0.2)");
        })
        .on("mouseleave", function(d) {
          tooltip.style("opacity", 0);
        });
    }
  }, [chartData, loading, error, metadata]);

  if (loading) {
    return <div className="chart-loading">Processing data for chord diagram...</div>;
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

export default ChordDiagram;