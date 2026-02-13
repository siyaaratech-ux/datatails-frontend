// src/components/ChatInterface/VisualizationPanel.js
import React, { useState, lazy, Suspense } from 'react';
import '../../styles/App.css';
import { processChartData } from '../Charts/DataPU';
import { downloadSvgChartAsPng } from '../../utils/downloadChartAsPng';
import Button from '../Common/Button';
import ChartZoomWrapper from '../Charts/ChartZoomWrapper';

// Lazy load chart components for better performance
const AreaChart = lazy(() => import('../Charts/AreaChart'));
const BarChart = lazy(() => import('../Charts/BarChart'));
const LineChart = lazy(() => import('../Charts/LineChart'));
const ChordDiagram = lazy(() => import('../Charts/ChordDiagram'));
const Heatmap = lazy(() => import('../Charts/Heatmap'));
const WordCloud = lazy(() => import('../Charts/WordCloud'));
const StackedArea = lazy(() => import('../Charts/StackedArea'));
const DonutChart = lazy(() => import('../Charts/DonutChart'));
const CMap = lazy(() => import('../Charts/ConnectionMap'));
const DAG = lazy(() => import('../Charts/DAG'));
const NGraph = lazy(() => import('../Charts/NetworkGraph'));
const PolarArea = lazy(() => import('../Charts/PolarArea'));
const SmallM = lazy(() => import('../Charts/SmallMultiples'));
const TreeD = lazy(() => import('../Charts/TreeDiagram'));
const VoronoiMap = lazy(() => import('../Charts/VoronoiMap'));
// Use static import for TreeMap to avoid lazy loading resolution issues in some bundlers
import TreeMap from '../Charts/TreeMap';
const CirclePacking = lazy(() => import('../Charts/CirclePacking'));
const MosaicPlot = lazy(() => import('../Charts/MosaicPlot'));
const SunBurst = lazy(() => import('../Charts/SunBurst'));

// Chart descriptions (add more as needed)
const CHART_DESCRIPTIONS = {
  area_chart: 'Area chart: Visualizes quantitative data over time or categories.',
  bar_chart: 'Bar chart: Compares values across categories.',
  line_chart: 'Line chart: Shows trends over time.',
  donut_chart: 'Donut chart: Shows proportions of a whole.',
  stacked_area_chart: 'Stacked area: Cumulative totals over time.',
  chord_diagram: 'Chord diagram: Visualizes relationships between entities.',
  heatmap_chart: 'Heatmap: Shows data density or intensity.',
  treemap_chart: 'Treemap: Hierarchical data as nested rectangles.',
  circle_packing: 'Circle packing: Hierarchical data as nested circles.',
  sunburst_chart: 'Sunburst: Hierarchical data as concentric rings.',
  connection_map: 'Connection map: Shows connections between points.',
  DAG: 'Directed Acyclic Graph: Shows dependencies.',
  mosaic_plot: 'Mosaic plot: Categorical data proportions.',
  network_graph: 'Network graph: Visualizes relationships.',
  polar_area: 'Polar area: Categorical data in polar coordinates.',
  small_multiples: 'Small multiples: Series of similar charts.',
  tree_diagram: 'Tree diagram: Hierarchical relationships.',
  voronoi_map: 'Voronoi map: Partitioning of space.',
  word_cloud: 'Word cloud: Visualizes word frequency.'
};

const VisualizationPanel = ({
  visualizationData,
  visualizationOptions,
  selectedChart,
  onChartSelect,
  isPremium
}) => {
  const { query, response } = visualizationData || {};
  
  // Define which visualizations are premium
  const premiumVisualizations = [
    'chord_diagram',
    'circle_packing',
    'connection_map',
    'DAG',
    'heatmap_chart',
    'mosaic_plot',
    'network_graph',
    'polar_area',
    'small_multiples',
    'sunburst_chart',
    'tree_diagram',
    'treemap_chart',
    'voronoi_map'
  ];
  
  // Use simpleVisualizations to determine which charts are available to non-premium users
  const simpleVisualizations = ['area_chart', 'bar_chart', 'line_chart', 'stacked_area_chart', 'donut_chart', 'word_cloud'];

  // Define which charts expect hierarchical data structure
  const hierarchicalCharts = [
    'treemap_chart',
    'circle_packing',
    'sunburst_chart',
    'tree_diagram',
    'DAG'
  ];
  
  const [isLoading, setIsLoading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  
  // Function to safely process and format chart data
  const getChartData = (data, query, chartType) => {
    try {
      // Process the data/query using the existing function
      const result = processChartData(data, query);
      
      // Check if this chart expects hierarchical data
      const expectsHierarchical = hierarchicalCharts.includes(chartType);
      
      // Check what format we got from the processing
      const isHierarchical = result.isHierarchical && result.data && result.data.children;
      const isArray = Array.isArray(result.data);
      
      // If the format matches what the chart expects, use it directly
      if ((expectsHierarchical && isHierarchical) || (!expectsHierarchical && isArray)) {
        return result.data;
      }
      
      // If we need to convert from hierarchical to array
      if (!expectsHierarchical && isHierarchical) {
        return flattenHierarchicalData(result.data);
      }
      
      // If we need to convert from array to hierarchical
      if (expectsHierarchical && isArray) {
        return convertArrayToHierarchical(result.data);
      }
      
      // If the data is in an unexpected format, return safe defaults
      return expectsHierarchical ? createDefaultHierarchicalData() : createDefaultArrayData();
    } catch (error) {
      console.error(`Error processing data for ${chartType}:`, error);
      return hierarchicalCharts.includes(chartType) ? 
        createDefaultHierarchicalData() : 
        createDefaultArrayData();
    }
  };
  
  // Helper functions for data conversion
  
  // Convert hierarchical data to array format
  const flattenHierarchicalData = (hierarchicalData) => {
    const result = [];
    
    function traverse(node) {
      if (!node) return;
      
      // If this is a leaf node with a value, add it to results
      if (node.value !== undefined && node.name) {
        result.push({
          name: node.name,
          value: node.value
        });
      }
      
      // Process children if they exist
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverse(child));
      }
    }
    
    traverse(hierarchicalData);
    
    // If we couldn't extract any items, create some defaults
    if (result.length === 0) {
      return createDefaultArrayData();
    }
    
    return result;
  };
  
  // Convert array data to hierarchical format
  const convertArrayToHierarchical = (arrayData) => {
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      return createDefaultHierarchicalData();
    }
    
    return {
      name: "Root",
      children: arrayData.map(item => ({
        name: item.name || "Unnamed",
        value: item.value || 0
      }))
    };
  };
  
  // Create default array data
  const createDefaultArrayData = () => {
    return [
      { name: "Sample A", value: 40 },
      { name: "Sample B", value: 30 },
      { name: "Sample C", value: 20 },
      { name: "Sample D", value: 10 }
    ];
  };
  
  // Create default hierarchical data
  const createDefaultHierarchicalData = () => {
    return {
      name: "Root",
      children: [
        {
          name: "Group A",
          children: [
            { name: "Item A1", value: 40 },
            { name: "Item A2", value: 30 }
          ]
        },
        {
          name: "Group B",
          children: [
            { name: "Item B1", value: 20 },
            { name: "Item B2", value: 10 }
          ]
        }
      ]
    };
  };
  
  // Render the selected visualization with properly formatted data
  const renderVisualization = () => {
    console.log('Selected chart:', selectedChart);
    if (!selectedChart) {
      return (
        <div className="visualization-placeholder">
          <span role="img" aria-label="chart">📊</span>
          <p>Select a chart type from the list on the right to visualize the data.</p>
        </div>
      );
    }
    if (isLoading) {
      return <div className="visualization-loading"><div className="spinner" /> Loading chart...</div>;
    }
    // Process the data for this chart type
    const chartData = getChartData(response, query, selectedChart);
    try {
      const chartComponent = (() => {
      switch (selectedChart) {
        case 'area_chart':
            return <AreaChart data={chartData} query={query} />;
        case 'bar_chart':
            return <BarChart data={chartData} query={query} />;
        case 'line_chart':
            return <LineChart data={chartData} query={query} />;
        case 'donut_chart':
            return <DonutChart data={chartData} query={query} />;
        case 'stacked_area_chart':
            const result = processChartData(response, query);
            return <StackedArea data={result.data} categories={result.categories} query={query} />;
        case 'chord_diagram':
            return <ChordDiagram data={chartData} query={query} />;
        case 'heatmap_chart':
            return <Heatmap data={chartData} query={query} />;
        case 'treemap_chart':
            return <TreeMap data={chartData} query={query} />;
        case 'circle_packing':
            return <CirclePacking data={chartData} query={query} />;
        case 'sunburst_chart':
            return <SunBurst data={chartData} query={query} />;
        case 'connection_map':
            return <CMap data={chartData} query={query} />;
        case 'DAG':
            return <DAG data={chartData} query={query} />;
        case 'mosaic_plot':
            return <MosaicPlot data={chartData} query={query} />;
        case 'network_graph':
            return <NGraph data={chartData} query={query} />;
        case 'polar_area':
            return <PolarArea data={chartData} query={query} />;
        case 'small_multiples':
            return <SmallM data={chartData} query={query} />;
        case 'tree_diagram':
            return <TreeD data={chartData} query={query} />;
        case 'voronoi_map':
            return <VoronoiMap data={chartData} query={query} />;
        case 'word_cloud':
            return <WordCloud data={chartData} query={query} />;
        default:
          return (
            <div className="visualization-placeholder">
              <p>This visualization type is not implemented yet.</p>
            </div>
          );
      }
      })();
      
      return (
        <Suspense fallback={<div className="visualization-loading"><div className="spinner" /> Loading chart...</div>}>
          <ChartZoomWrapper chartType={selectedChart}>
            {chartComponent}
          </ChartZoomWrapper>
        </Suspense>
      );
    } catch (error) {
      console.error(`Error rendering ${selectedChart}:`, error);
      return (
        <div className="visualization-error">
          <p>Error displaying chart: {error.message}</p>
        </div>
      );
    }
  };

  // Get chart title and description
  const chartTitle = selectedChart ? selectedChart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
  const chartDescription = selectedChart ? CHART_DESCRIPTIONS[selectedChart] || '' : '';

  const handleDownloadChart = () => {
    setDownloadMsg("");
    // Try to find the first SVG in the visualization panel
    const panel = document.querySelector('.visualization-display, .scrollable-chart-area');
    let svg = null;
    if (panel) {
      svg = panel.querySelector('svg');
    }
    if (!svg) {
      setDownloadMsg('No chart found to download. Please view a chart first.');
      return;
    }
    downloadSvgChartAsPng(svg, 'chart.png');
    setDownloadMsg('Chart download started!');
  };

  return (
    <div className="visualization-panel flex-panel">
      <div className="visualization-header">
        <h3>Recommended Visualizations</h3>
      </div>
      <div className="visualization-content flex-content">
        <div className="visualization-display scrollable-chart-area">
          {selectedChart && (
            <div className="chart-meta">
              <h4 className="chart-title-main">{chartTitle}</h4>
              <div className="chart-description">{chartDescription}</div>
            </div>
          )}
          {/* Data Preview Section */}
          {response && Array.isArray(response) && response.length > 0 && (
            <div className="data-preview">
              <b>Data Preview:</b>
              <pre style={{ maxHeight: 80, overflow: 'auto', background: '#f8f8f8', borderRadius: 4, padding: 8, fontSize: '0.9em' }}>{JSON.stringify(response.slice(0, 3), null, 2)}</pre>
            </div>
          )}
          {renderVisualization()}
        </div>
        <div className="visualization-options">
          <h4>Chart Types</h4>
          <div className="chart-type-list">
            {visualizationOptions.map(([chart, score]) => {
              const isPremiumChart = premiumVisualizations.includes(chart);
              const isSimpleChart = simpleVisualizations.includes(chart);
              const isDisabled = isPremiumChart && !isSimpleChart && !isPremium;
              // Emoji icon map (placeholder, can be replaced with SVGs)
              const chartIcons = {
                area_chart: '📈',
                bar_chart: '📊',
                line_chart: '📉',
                donut_chart: '🍩',
                stacked_area_chart: '🌈',
                chord_diagram: '🕸️',
                heatmap_chart: '🔥',
                treemap_chart: '🗺️',
                circle_packing: '⚪',
                sunburst_chart: '🌞',
                connection_map: '🧭',
                DAG: '🔗',
                mosaic_plot: '🧩',
                network_graph: '🌐',
                polar_area: '🧊',
                small_multiples: '🖼️',
                tree_diagram: '🌳',
                voronoi_map: '🗺️',
                word_cloud: '☁️'
              };
              return (
                <div
                  key={chart}
                  className={`chart-type-option ${selectedChart === chart ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && onChartSelect(chart)}
                  tabIndex={isDisabled ? -1 : 0}
                  aria-label={chart.replace(/_/g, ' ') + (isDisabled ? ' (Premium)' : '')}
                  title={CHART_DESCRIPTIONS[chart] || chart.replace(/_/g, ' ')}
                  onKeyDown={e => {
                    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) onChartSelect(chart);
                  }}
                  style={{
                    border: selectedChart === chart ? '2px solid var(--primary)' : '1px solid #ccc',
                    background: selectedChart === chart ? '#e6f7ff' : '#fff',
                    fontWeight: selectedChart === chart ? 'bold' : 'normal',
                    display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 6, marginBottom: 6
                  }}
                >
                  <span className="chart-icon" style={{ fontSize: 22 }}>{chartIcons[chart] || '📊'}</span>
                  <span className="chart-name">{chart.replace(/_/g, ' ')}{isPremiumChart && <span className="premium-icon">✨</span>}</span>
                  <span className="info-tooltip custom-tooltip" style={{ marginLeft: 4, color: '#888', cursor: 'help', position: 'relative' }}>
                    ℹ️
                    <span className="custom-tooltip-text">{CHART_DESCRIPTIONS[chart] || chart.replace(/_/g, ' ')}</span>
                  </span>
                  {isDisabled && (
                    <div className="premium-overlay">
                      <span>Premium</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!isPremium && (
            <div className="premium-note">
              <p>
                <span className="premium-icon">✨</span> Premium charts available with Premium subscription.
              </p>
            </div>
          )}
          <div style={{ marginTop: 24, marginBottom: 8, textAlign: 'center' }}>
            <Button
              buttonStyle="btn--primary"
              buttonSize="btn--large"
              onClick={handleDownloadChart}
            >
              Download Chart as PNG
            </Button>
            {downloadMsg && (
              <div style={{ marginTop: 8, color: 'var(--primary)', fontSize: '0.97rem' }}>{downloadMsg}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationPanel;