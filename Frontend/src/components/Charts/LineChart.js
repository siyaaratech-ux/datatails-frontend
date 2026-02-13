import React, { useState, useEffect } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getColorScheme } from './DataPU';
import '../../styles/App.css';

const LineChart = ({ data, query }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Line Chart Visualization');
  const [showHelp, setShowHelp] = useState(false);
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
          
          setChartData(result.data);
          setChartTitle(result.title);
          setDataSource(result.source);
          setMetadata(result.metadata || { valueLabel: 'Value', xAxisLabel: 'Category', yAxisLabel: 'Value', unit: '', valueType: 'numeric' });
          setLoading(false);
        });
      } else {
        // Try to load data from localStorage (Line.json)
        const storedData = localStorage.getItem('Line.json');
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
      console.error('Error processing data for line chart:', err);
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

  // Sort data by index if available (for time series)
  const sortedData = [...chartData].sort((a, b) => (a.index || 0) - (b.index || 0));

  // Get appropriate color based on data source
  const colors = getColorScheme(dataSource);
  const primaryColor = colors[0];

  // Format tooltip values based on metadata and data content
  const formatTooltip = (value, name, entry) => {
    const valueLabel = metadata.valueLabel || 'Value';
    let formattedValue = value;
    
    if (metadata.valueType === 'percentage' || entry.payload.isPercentage) {
      formattedValue = `${value}%`;
    } else if (metadata.valueType === 'currency' || entry.payload.currency) {
      const unit = metadata.unit || entry.payload.currency || 'USD';
      formattedValue = `${value} ${unit}`;
    } else if (metadata.unit) {
      formattedValue = `${value} ${metadata.unit}`;
    }
    
    return [formattedValue, valueLabel];
  };

  return (
    <div className="chart-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="chart-title">Line Chart</h3>
        <button
          aria-label="Line chart info"
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
            <h4>About Line Charts</h4>
            <p>A line chart shows trends over time. Each point is connected by a line, making it easy to see changes. Hover over the line to see details for each point.</p>
            <button onClick={() => setShowHelp(false)} className="close-btn">Close</button>
          </div>
        </div>
      )}
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <RechartsLineChart
          data={sortedData}
          margin={{
            top: 20, right: 30, left: 20, bottom: 60
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
            angle={-45}
            textAnchor="end"
            label={{ value: metadata.xAxisLabel || 'Category', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: metadata.yAxisLabel || 'Value', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={primaryColor} 
            activeDot={{ r: 8 }} 
            name={metadata.valueLabel || 'Value'} 
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;