// src/components/Charts/WordCloud.js - Improved Implementation with Better Layout
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const WordCloud = ({ data, query }) => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState({ valueLabel: 'Frequency', xAxisLabel: '', yAxisLabel: '', unit: '', valueType: 'count' });
  const svgRef = useRef(null);

  useEffect(() => {
    const parseData = () => {
      try {
        setLoading(true);
        setError('');
        
        // Try to load from localStorage first
        const storedData = localStorage.getItem('WordCloud.json');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.data && Array.isArray(parsedData.data)) {
            setWords(parsedData.data);
            setMetadata(parsedData.metadata || { valueLabel: 'Frequency', xAxisLabel: '', yAxisLabel: '', unit: '', valueType: 'count' });
            setLoading(false);
            return;
          }
        }
        
        // Handle different data formats
        let textContent = '';
        
        if (typeof data === 'string') {
          textContent = data;
        } else if (Array.isArray(data)) {
          // If it's an array of objects, extract text from name/value pairs
          textContent = data.map(item => {
            if (typeof item === 'object') {
              const name = item.name || item.text || '';
              const value = item.value || 0;
              // Repeat the name based on value for better frequency
              return Array(Math.max(1, Math.floor(value / 10))).fill(name).join(' ');
            }
            return String(item);
          }).join(' ');
        } else if (typeof data === 'object') {
          // Handle object data
          if (data.response) {
            textContent = data.response;
          } else if (data.text) {
            textContent = data.text;
          } else if (data.content) {
            textContent = data.content;
          } else {
            // Extract all string values from object
            textContent = Object.entries(data)
              .map(([key, value]) => `${key} ${value}`)
              .join(' ');
          }
        }
        
        // Process data using DataPU if available
        if (data && typeof data === 'object') {
          import('./DataPU').then(({ processChartData, formatForWordCloud }) => {
            const result = processChartData(data, query);
            const wordCloudData = formatForWordCloud(result.data);
            setWords(wordCloudData);
            setMetadata(result.metadata || { valueLabel: 'Frequency', xAxisLabel: '', yAxisLabel: '', unit: '', valueType: 'count' });
            setLoading(false);
          }).catch(() => {
            // Fallback to text processing
            processTextData(textContent);
          });
        } else {
          processTextData(textContent);
        }
      } catch (err) {
        console.error('Error processing word cloud data:', err);
        setError('Failed to process data for visualization');
        setLoading(false);
      }
    };
    
    const processTextData = (textContent) => {
      if (!textContent || textContent.trim().length === 0) {
        setError('No data provided for visualization');
        setLoading(false);
        return;
      }
      
      // Clean and process text
      const cleanText = textContent
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]"]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      // Split into words and count frequencies
      const wordCounts = {};
      const words = cleanText.split(/\s+/);
      
      words.forEach(word => {
        const cleaned = word.trim();
        if (cleaned.length > 2) {
          wordCounts[cleaned] = (wordCounts[cleaned] || 0) + 1;
        }
      });
      
      // Convert to array and sort by frequency
      const wordArray = Object.entries(wordCounts)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 100); // Take top 100 words
      
      if (wordArray.length > 0) {
        setWords(wordArray);
      } else {
        setError('No meaningful words found in the data');
      }
      setLoading(false);
    };
    
    if (data) {
      parseData();
    } else {
      setError('No data provided for visualization');
      setLoading(false);
    }
  }, [data, query]);

  useEffect(() => {
    if (!words.length || !svgRef.current) return;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 900;
    const height = 600;

    // Create a more vibrant color scale
    const colorScale = d3.scaleOrdinal([
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#e67e22', '#34495e', '#16a085', '#27ae60'
    ]);

    // Calculate font sizes with better range
    const maxValue = d3.max(words, d => d.value);
    const minValue = d3.min(words, d => d.value);
    const fontScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([28, 85]); // Larger and more varied sizes

    // Improved word cloud layout using a better algorithm
    const positions = [];
    const usedPositions = new Set();
    const minDistance = 25;
    
    // Sort by value descending
    const sortedWords = [...words].sort((a, b) => b.value - a.value);
    
    // Create a helper function to check collisions
    const checkCollision = (x, y, fontSize, text) => {
      const textWidth = text.length * fontSize * 0.6;
      const textHeight = fontSize;
      
      // Check bounds
      if (x - textWidth / 2 < 0 || x + textWidth / 2 > width ||
          y - textHeight / 2 < 0 || y + textHeight / 2 > height) {
        return true;
      }
      
      // Check against existing words
      for (const pos of positions) {
        const dx = Math.abs(x - pos.x);
        const dy = Math.abs(y - pos.y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = (fontSize + pos.size) / 2 + 10;
        if (distance < minDist) {
          return true;
        }
      }
      
      return false;
    };
    
    sortedWords.forEach((word, i) => {
      const fontSize = fontScale(word.value);
      let attempts = 0;
      let placed = false;
      
      // Try different placement strategies
      while (!placed && attempts < 200) {
        let x, y;
        
        if (i === 0) {
          // Center for first (largest) word
          x = width / 2;
          y = height / 2;
        } else if (i < 15) {
          // Place top words in expanding circles
          const angle = (i / 15) * 2 * Math.PI * 2; // Double spiral
          const radius = Math.min(width, height) * 0.15 * (1 + i / 15);
          x = width / 2 + radius * Math.cos(angle);
          y = height / 2 + radius * Math.sin(angle);
        } else {
          // Spiral layout for remaining words
          const spiralIndex = i - 15;
          const spiralRadius = Math.min(width, height) * 0.12 * Math.sqrt(spiralIndex);
          const spiralAngle = spiralIndex * 0.4;
          x = width / 2 + spiralRadius * Math.cos(spiralAngle);
          y = height / 2 + spiralRadius * Math.sin(spiralAngle);
          
          // Add some randomness
          x += (Math.random() - 0.5) * 50;
          y += (Math.random() - 0.5) * 50;
        }
        
        // Check collision
        if (!checkCollision(x, y, fontSize, word.text)) {
          positions.push({
            x,
            y,
            text: word.text,
            value: word.value,
            size: fontSize
          });
          placed = true;
        }
        
        attempts++;
      }
    });

    // Add words to SVG with better styling
    const wordElements = svg.selectAll("text")
      .data(positions)
      .join("text")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("font-size", d => `${d.size}px`)
      .attr("fill", (d, i) => colorScale(i % 10))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("cursor", "pointer")
      .style("font-weight", "bold")
      .style("font-family", "Arial, sans-serif")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.1)")
      .text(d => d.text)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("font-size", `${d.size * 1.2}px`)
          .attr("fill", d3.color(colorScale(d.value % 10)).brighter(1));
        
        // Show tooltip
        const tooltip = d3.select("body")
          .append("div")
          .attr("class", "wordcloud-tooltip")
          .style("position", "absolute")
          .style("background-color", "rgba(0, 0, 0, 0.85)")
          .style("color", "white")
          .style("padding", "10px 14px")
          .style("border-radius", "6px")
          .style("font-size", "13px")
          .style("font-weight", "bold")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("box-shadow", "0 4px 8px rgba(0,0,0,0.3)")
          .html(`<strong>${d.text}</strong><br/>${metadata.valueLabel || 'Frequency'}: ${d.value}`);
        
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", function(event) {
        d3.select(".wordcloud-tooltip")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("font-size", `${d.size}px`)
          .attr("fill", colorScale(d.value % 10));
        
        d3.select(".wordcloud-tooltip").remove();
      });

  }, [words, metadata]);

  if (loading) {
    return <div className="chart-loading">Loading word cloud data...</div>;
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
      <h3 className="chart-title">Word Cloud Visualization</h3>
      <div className="word-cloud-wrapper" style={{ width: '100%', height: '600px', backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {words.length > 0 ? (
          <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox="0 0 900 600" 
            preserveAspectRatio="xMidYMid meet"
          ></svg>
        ) : (
          <div className="chart-error">No meaningful words to display</div>
        )}
      </div>
    </div>
  );
};

export default WordCloud;
