import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getColorScheme } from './DataPU';
import '../../styles/App.css';

const DonutChart = ({ data, query }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [chartTitle, setChartTitle] = useState('Donut Chart Visualization');
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
        // Try to load data from localStorage (Donut.json)
        const storedData = localStorage.getItem('Donut.json');
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
      console.error('Error processing data for donut chart:', err);
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

  // Get appropriate colors based on data source
  const colors = getColorScheme(dataSource);

  // Format label values based on metadata and data content
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
    
    const percentage = entry.payload.percentage ? ` (${entry.payload.percentage}% of total)` : '';
    return [`${formattedValue}${percentage}`, valueLabel];
  };

  // Custom label to show outside the arc, truncate, and add tooltip
  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const label = name.length > 16 ? name.substring(0, 13) + '...' : name;
    return (
      <g>
        <text
          x={x}
          y={y}
          fill="#333"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={Math.max(10, 16 - Math.floor(chartData.length / 10))}
        >
          {label}
        </text>
        <title>{name}</title>
      </g>
    );
  };

  // Custom label line
  const renderLabelLine = ({ cx, cy, midAngle, outerRadius }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 10;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return <line x1={cx} y1={cy} x2={x} y2={y} stroke="#888" strokeWidth={1} />;
  };

  // Limit the number of visible labels if too many slices
  const maxLabels = 15;
  const visibleData = chartData.slice(0, maxLabels);
  const hiddenData = chartData.length > maxLabels ? chartData.slice(maxLabels) : [];

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      {dataSource && dataSource !== 'sample' && (
        <div className="chart-source">Data source: {dataSource}</div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={visibleData}
            cx="50%"
            cy="50%"
            labelLine={renderLabelLine}
            label={renderCustomizedLabel}
            outerRadius={150}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            isAnimationActive={false}
          >
            {visibleData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltip} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {hiddenData.length > 0 && (
        <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          +{hiddenData.length} more categories not shown. See legend for details.
        </div>
      )}
    </div>
  );
};

export default DonutChart;