import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import '../../styles/App.css';

const HeatmapChart = ({ data, query }) => {
  const [chartData, setChartData] = useState({ items: [], min: 0, max: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Heatmap Visualization');
  const [metadata, setMetadata] = useState({ valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });

  useEffect(() => {
    try {
      setLoading(true);
      setError('');

      // Check if there's data passed directly as props
      if (data) {
        // Process data using processChartData from DataPU
        import('./DataPU').then(({ processChartData }) => {
          const result = processChartData(data, query);
          
          // Format for heatmap
          const values = result.data.map(item => item.value || 0);
          const min = Math.min(...values);
          const max = Math.max(...values);
          
          const heatmapData = {
            items: result.data.map((item, index) => ({
              name: item.name || `Item ${index + 1}`,
              value: item.value || 0,
              intensity: (item.value - min) / (max - min || 1),
              ...(item.isPercentage && { isPercentage: true }),
              ...(item.currency && { currency: item.currency })
            })),
            min,
            max
          };
          
          setChartData(heatmapData);
          setChartTitle(result.title);
          setDataSource(result.source);
          setMetadata(result.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
          setLoading(false);
        });
      } else {
        // Try to load data from localStorage (Heatmap.json)
        const storedData = localStorage.getItem('Heatmap.json');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setChartData(parsedData.data);
          setChartTitle(parsedData.title);
          setDataSource(parsedData.source);
          setMetadata(parsedData.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
          setLoading(false);
        } else {
          // Check status to see if data processing failed
          const statusData = localStorage.getItem('chartData_status');
          if (statusData) {
            const status = JSON.parse(statusData);
            if (!status.isValid) {
              setError(status.message || 'Invalid response - charts cannot be generated');
              setLoading(false);
            } else {
              setError('No chart data available. Please process data first.');
              setLoading(false);
            }
          } else {
            setError('No chart data available. Please process data first.');
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Error processing data for heatmap chart:', err);
      setError(`Processing error: ${err.message}`);
      setLoading(false);
    }
  }, [data, query]);

  if (loading) {
    return <div className="chart-loading">Processing data for visualization...</div>;
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

  // Create a proper heatmap color scale (yellow -> orange -> red)
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([chartData.min, chartData.max]);

  // Format value for display
  const formatValue = (item) => {
    if (metadata.valueType === 'percentage' || item.isPercentage) {
      return `${item.value}%`;
    } else if (metadata.valueType === 'currency' || item.currency) {
      const unit = metadata.unit || item.currency || 'USD';
      return `${item.value} ${unit}`;
    } else if (metadata.unit) {
      return `${item.value} ${metadata.unit}`;
    }
    return item.value;
  };

  // Calculate grid dimensions for better layout
  const itemCount = chartData.items.length;
  const cols = Math.ceil(Math.sqrt(itemCount * 1.5)); // Slightly wider than tall
  const rows = Math.ceil(itemCount / cols);

  return (
    <div className="chart-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="chart-title">{chartTitle}</h3>
      </div>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      
      <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        {/* Color scale legend */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: '20px',
          gap: '10px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Low</span>
          <div style={{
            width: '200px',
            height: '20px',
            background: `linear-gradient(to right, ${colorScale(chartData.min)}, ${colorScale(chartData.max)})`,
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}></div>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>High</span>
          <div style={{ marginLeft: '20px', fontSize: '12px', color: '#666' }}>
            <span style={{ fontWeight: 'bold' }}>{metadata.valueLabel || 'Value'} Range: </span>
            {formatValue({ value: chartData.min, ...chartData.items[0] })} to {formatValue({ value: chartData.max, ...chartData.items[chartData.items.length - 1] })}
          </div>
        </div>

        {/* Heatmap grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '2px',
          backgroundColor: '#fff',
          padding: '2px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          {chartData.items.map((item, index) => {
            const bgColor = colorScale(item.value);
            // Determine text color based on background brightness
            const rgb = d3.rgb(bgColor);
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            const textColor = brightness > 128 ? '#000' : '#fff';
            
            return (
              <div
                key={index}
                style={{
                  backgroundColor: bgColor,
                  padding: '12px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '80px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                  e.currentTarget.style.zIndex = '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.zIndex = '1';
                }}
                title={`${item.name}: ${formatValue(item)}`}
              >
                <div style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: textColor,
                  textAlign: 'center',
                  marginBottom: '4px',
                  wordBreak: 'break-word',
                  lineHeight: '1.2'
                }}>
                  {item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: textColor,
                  textAlign: 'center'
                }}>
                  {formatValue(item)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;
