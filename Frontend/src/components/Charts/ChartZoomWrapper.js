import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const ChartZoomWrapper = ({ children, chartType = 'default' }) => {
  const wrapperRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const container = wrapperRef.current;
    const content = container.querySelector('.chart-zoom-content');
    if (!content) return;

    // Set up zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        const { transform } = event;
        setZoomLevel(transform.k);
        setPanX(transform.x);
        setPanY(transform.y);
        
        content.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
        content.style.transformOrigin = 'top left';
      });

    // Apply zoom to container
    d3.select(container).call(zoom);

    // Reset zoom on double click
    d3.select(container).on('dblclick.zoom', () => {
      d3.select(container)
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      d3.select(container).on('.zoom', null);
      d3.select(container).on('dblclick.zoom', null);
    };
  }, []);

  const handleZoomIn = () => {
    if (wrapperRef.current) {
      const container = wrapperRef.current;
      const zoom = d3.zoom().scaleExtent([0.5, 5]);
      d3.select(container)
        .transition()
        .duration(200)
        .call(zoom.scaleBy.bind(zoom), 1.2);
    }
  };

  const handleZoomOut = () => {
    if (wrapperRef.current) {
      const container = wrapperRef.current;
      const zoom = d3.zoom().scaleExtent([0.5, 5]);
      d3.select(container)
        .transition()
        .duration(200)
        .call(zoom.scaleBy.bind(zoom), 1 / 1.2);
    }
  };

  const handleReset = () => {
    if (wrapperRef.current) {
      const container = wrapperRef.current;
      const zoom = d3.zoom();
      d3.select(container)
        .transition()
        .duration(300)
        .call(zoom.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="chart-zoom-wrapper" ref={wrapperRef}>
      <div className="chart-zoom-controls">
        <button 
          className="zoom-btn" 
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <span>+</span>
        </button>
        <button 
          className="zoom-btn" 
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <span>−</span>
        </button>
        <button 
          className="zoom-btn" 
          onClick={handleReset}
          title="Reset Zoom"
          aria-label="Reset Zoom"
        >
          <span>⌂</span>
        </button>
        <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
      </div>
      <div className="chart-zoom-content">
        {children}
      </div>
    </div>
  );
};

export default ChartZoomWrapper;

