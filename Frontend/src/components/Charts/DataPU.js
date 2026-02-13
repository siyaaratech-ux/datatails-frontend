/**
 * Extract semantic metadata from text (query/response) to determine what values represent
 */
function extractSemanticMetadata(text, queryText = '') {
  const fullText = (text + ' ' + queryText);
  const combinedText = fullText.toLowerCase();
  const metadata = {
    valueLabel: 'Value',
    xAxisLabel: 'Category',
    yAxisLabel: 'Value',
    unit: '',
    valueType: 'numeric'
  };
  
  // Try to extract what the value represents from the query/response
  const valuePatterns = [
    { pattern: /(?:of|for|in|about)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:score|rating|points)/i, extract: (match) => match[1] + ' Score' },
    { pattern: /([a-z]+(?:\s+[a-z]+)?)\s+(?:score|rating|points)/i, extract: (match) => match[1] + ' Score' },
    { pattern: /(?:score|rating|points)\s+(?:of|for|in)\s+([a-z]+(?:\s+[a-z]+)?)/i, extract: (match) => match[1] + ' Score' },
  ];
  
  let extractedValueLabel = null;
  for (const { pattern, extract } of valuePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      extractedValueLabel = extract(match);
      break;
    }
  }

  // Detect value type and units
  if (combinedText.includes('percentage') || combinedText.includes('%') || combinedText.includes('percent')) {
    metadata.valueLabel = 'Percentage';
    metadata.yAxisLabel = 'Percentage (%)';
    metadata.unit = '%';
    metadata.valueType = 'percentage';
  } else if (combinedText.includes('currency') || combinedText.includes('dollar') || combinedText.includes('usd') || 
             combinedText.includes('eur') || combinedText.includes('€') || combinedText.includes('$') || 
             combinedText.includes('£') || combinedText.includes('¥')) {
    metadata.valueLabel = 'Amount';
    metadata.yAxisLabel = 'Amount';
    metadata.valueType = 'currency';
    if (combinedText.includes('usd') || combinedText.includes('dollar')) metadata.unit = 'USD';
    else if (combinedText.includes('eur') || combinedText.includes('€')) metadata.unit = 'EUR';
    else if (combinedText.includes('£')) metadata.unit = 'GBP';
    else if (combinedText.includes('¥')) metadata.unit = 'JPY';
  } else if (combinedText.includes('count') || combinedText.includes('number') || combinedText.includes('quantity')) {
    metadata.valueLabel = 'Count';
    metadata.yAxisLabel = 'Count';
    metadata.valueType = 'count';
  } else if (combinedText.includes('score') || combinedText.includes('rating') || combinedText.includes('points')) {
    // Use extracted label if available, otherwise try context extraction
    if (extractedValueLabel) {
      metadata.valueLabel = extractedValueLabel;
    } else {
      const scoreContext = extractContextBefore(combinedText, ['score', 'rating', 'points']);
      metadata.valueLabel = scoreContext ? `${scoreContext} ${scoreContext.includes('score') ? '' : 'Score'}` : 'Score';
    }
    metadata.yAxisLabel = metadata.valueLabel;
    metadata.valueType = 'score';
  } else if (combinedText.includes('revenue') || combinedText.includes('sales') || combinedText.includes('income')) {
    metadata.valueLabel = 'Revenue';
    metadata.yAxisLabel = 'Revenue';
    metadata.valueType = 'currency';
    metadata.unit = 'USD';
  } else if (combinedText.includes('growth') || combinedText.includes('rate')) {
    metadata.valueLabel = 'Growth Rate';
    metadata.yAxisLabel = 'Growth Rate (%)';
    metadata.unit = '%';
    metadata.valueType = 'percentage';
  } else if (combinedText.includes('temperature') || combinedText.includes('temp')) {
    metadata.valueLabel = 'Temperature';
    metadata.yAxisLabel = 'Temperature (°C)';
    metadata.unit = '°C';
  } else if (combinedText.includes('population') || combinedText.includes('people')) {
    metadata.valueLabel = 'Population';
    metadata.yAxisLabel = 'Population';
    metadata.valueType = 'count';
  }

  // Detect X-axis label
  if (combinedText.includes('time') || combinedText.includes('date') || combinedText.includes('month') || 
      combinedText.includes('year') || combinedText.includes('quarter') || combinedText.includes('week')) {
    metadata.xAxisLabel = 'Time';
  } else if (combinedText.includes('category') || combinedText.includes('type') || combinedText.includes('group')) {
    metadata.xAxisLabel = 'Category';
  } else if (combinedText.includes('name') || combinedText.includes('item') || combinedText.includes('title')) {
    metadata.xAxisLabel = 'Item';
  } else if (combinedText.includes('location') || combinedText.includes('place') || combinedText.includes('region')) {
    metadata.xAxisLabel = 'Location';
  }

  return metadata;
}

/**
 * Extract context before a keyword (e.g., "performance score" -> "performance")
 */
function extractContextBefore(text, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`(\\w+)\\s+${keyword}`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const context = match[1];
      // Capitalize first letter
      return context.charAt(0).toUpperCase() + context.slice(1);
    }
  }
  return null;
}

/**
 * Main function to process input data into chartable format
 * @param {any} data - The input data in any format
 * @param {any} query - Additional query information that might contain the response
 * @returns {Object} - Processed data and metadata
 */

export const processChartData = (data, query) => {
  console.log("DATA:", data);
  console.log("QUERY:", query);
  try {
    // Extract query text for semantic analysis
    const queryText = typeof query === 'string' ? query : 
                     (query && typeof query === 'object' && query.response ? query.response : '');
    
    // Check if data is a saved chat format
    if (typeof data === 'string' && data.trim().startsWith('Saving chat:')) {
      const result = processSavedChatData(data);
      result.metadata = extractSemanticMetadata(result.title || '', queryText);
      return result;
    }

    // Handle markdown data
    if (typeof data === 'string' && (data.includes('**') || data.includes('#') || data.includes('- '))) {
      // The key fix: Check for hierarchical data first
      if (containsHierarchicalData(data)) {
        const result = enhancedExtractHierarchicalData(data);
        result.metadata = extractSemanticMetadata(data, queryText);
        console.log("Hierarchical data detected, processed result:", result);
        return result;
      }
      const result = processMarkdownData(data);
      result.metadata = extractSemanticMetadata(data, queryText);
      return result;
    }
    
    // First priority: Check for response property in data
    if (data && typeof data === 'object' && data.response) {
      // Check for hierarchical data in response
      if (typeof data.response === 'string' && containsHierarchicalData(data.response)) {
        const result = enhancedExtractHierarchicalData(data.response);
        result.metadata = extractSemanticMetadata(data.response, queryText);
        return result;
      }
      const result = processResponseData(data);
      result.metadata = extractSemanticMetadata(data.response || '', queryText);
      return result;
    }
    
    // Second priority: Check for response in query
    if (query && typeof query === 'object' && query.response) {
      // Check for hierarchical data in query response
      if (typeof query.response === 'string' && containsHierarchicalData(query.response)) {
        const result = enhancedExtractHierarchicalData(query.response);
        result.metadata = extractSemanticMetadata(query.response, queryText);
        return result;
      }
      const result = processResponseData(query);
      result.metadata = extractSemanticMetadata(query.response || '', queryText);
      return result;
    }
    
    // Third priority: Process the data directly
    if (typeof data === 'string') {
      if (containsHierarchicalData(data)) {
        const result = enhancedExtractHierarchicalData(data);
        result.metadata = extractSemanticMetadata(data, queryText);
        return result;
      }
      const result = processTextData(data);
      result.metadata = extractSemanticMetadata(data, queryText);
      return result;
    } else if (Array.isArray(data)) {
      const result = processArrayData(data);
      result.metadata = extractSemanticMetadata(JSON.stringify(data), queryText);
      return result;
    } else if (data && typeof data === 'object') {
      const result = processObjectData(data);
      result.metadata = extractSemanticMetadata(JSON.stringify(data), queryText);
      return result;
    }
    
    // Fallback to sample data
    const result = generateSampleData('Could not extract usable data');
    result.metadata = extractSemanticMetadata('', queryText);
    return result;
  } catch (error) {
    console.error('Error processing chart data:', error);
    const result = generateSampleData('Error processing data: ' + error.message);
    result.metadata = extractSemanticMetadata('', typeof query === 'string' ? query : '');
    return result;
  }
};

export const processAndSaveChartData = (data, query) => {
  try {
    // Process the data
    const result = processChartData(data, query);
    
    // If processing result indicates invalid response, return early
    if (result.isInvalid) {
      localStorage.setItem('chartData_status', JSON.stringify({
        isValid: false,
        message: result.message || 'Invalid response - charts cannot be generated'
      }));
      return result;
    }
    
    // Force hierarchical flag if data has children property
    if (result.data && result.data.children && Array.isArray(result.data.children)) {
      console.log("Data has children property, forcing hierarchical flag");
      result.isHierarchical = true;
    }
    
    // Check if we have hierarchical data
    if (result.isHierarchical) {
      console.log("SAVING HIERARCHICAL DATA TO CHARTS");
      
      // For TreeMap, SunBurst and CirclePacking, store the hierarchical data directly
      localStorage.setItem('TreeMap.json', JSON.stringify({
        data: formatForTreeMap(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('TreeDiagram.json', JSON.stringify({
        data: formatForTreeDiagram(result.data),
        title: result.title,
        source: result.source
      }));

      localStorage.setItem('SunBurst.json', JSON.stringify({
        data: formatForSunburst(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('CirclePacking.json', JSON.stringify({
        data: formatForCirclePacking(result.data),
        title: result.title,
        source: result.source
      }));
      
      // For network-based charts, use the formatted data
      localStorage.setItem('DAG.json', JSON.stringify({
        data: formatForDAG(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('NetworkGraph.json', JSON.stringify({
        data: formatForNetworkGraph(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('ChordDiagram.json', JSON.stringify({
        data: formatForChordDiagram(result.data),
        title: result.title,
        source: result.source
      }));
      
      // For other hierarchical visualizations
      localStorage.setItem('ConnectionMap.json', JSON.stringify({
        data: formatForConnectionMap(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('MosaicPlot.json', JSON.stringify({
        data: formatForMosaicPlot(result.data),
        title: result.title,
        source: result.source
      }));
      
      // For other charts, use flattened data
      const flatData = flattenHierarchy(result.data);
      
      const barData = formatForBarChart(flatData);
      const lineData = formatForLineChart(flatData);
      const areaData = formatForAreaChart(flatData);
      const donutData = formatForDonutChart(flatData);
      const heatmapData = formatForHeatmapChart(flatData);
      const wordCloudData = formatForWordCloud(flatData);
      
      localStorage.setItem('Bar.json', JSON.stringify({
        data: barData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Line.json', JSON.stringify({
        data: lineData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Area.json', JSON.stringify({
        data: areaData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Donut.json', JSON.stringify({
        data: donutData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Heatmap.json', JSON.stringify({
        data: heatmapData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('WordCloud.json', JSON.stringify({
        data: wordCloudData,
        title: result.title,
        source: result.source
      }));
      
      // Additional charts
      localStorage.setItem('SmallMultiples.json', JSON.stringify({
        data: formatForSmallMultiples(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('StackedArea.json', JSON.stringify({
        data: formatForStackedArea(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('VoronoiMap.json', JSON.stringify({
        data: formatForVoronoiMap(result.data),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('PolarArea.json', JSON.stringify({
        data: formatForPolarArea(result.data),
        title: result.title,
        source: result.source
      }));
    } else {
      // Processing for non-hierarchical data (unchanged)
      const barData = formatForBarChart(result.data);
      const lineData = formatForLineChart(result.data);
      const areaData = formatForAreaChart(result.data);
      const donutData = formatForDonutChart(result.data);
      const heatmapData = formatForHeatmapChart(result.data);
      const wordCloudData = formatForWordCloud(result.data);
      
      // For hierarchical charts from non-hierarchical data, create simple structure
      const simpleHierarchy = {
        name: result.title || "Data Hierarchy",
        children: result.data.map(item => ({
          name: item.name || "Unnamed",
          value: item.value || 0
        }))
      };
      
      // Store all the data for each chart type
      localStorage.setItem('Bar.json', JSON.stringify({
        data: barData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Line.json', JSON.stringify({
        data: lineData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Area.json', JSON.stringify({
        data: areaData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Donut.json', JSON.stringify({
        data: donutData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('Heatmap.json', JSON.stringify({
        data: heatmapData,
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('WordCloud.json', JSON.stringify({
        data: wordCloudData,
        title: result.title,
        source: result.source
      }));
      
      // Store hierarchical data
      localStorage.setItem('TreeMap.json', JSON.stringify({
        data: formatForTreeMap(simpleHierarchy),
        title: result.title,
        source: result.source
      }));

      localStorage.setItem('TreeDiagram.json', JSON.stringify({
        data: formatForTreeDiagram(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('SunBurst.json', JSON.stringify({
        data: formatForSunburst(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('CirclePacking.json', JSON.stringify({
        data: formatForCirclePacking(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      // Also set the network-based charts
      localStorage.setItem('DAG.json', JSON.stringify({
        data: formatForDAG(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('NetworkGraph.json', JSON.stringify({
        data: formatForNetworkGraph(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('ConnectionMap.json', JSON.stringify({
        data: formatForConnectionMap(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('ChordDiagram.json', JSON.stringify({
        data: formatForChordDiagram(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('MosaicPlot.json', JSON.stringify({
        data: formatForMosaicPlot(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      // Additional charts
      localStorage.setItem('SmallMultiples.json', JSON.stringify({
        data: formatForSmallMultiples(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('StackedArea.json', JSON.stringify({
        data: formatForStackedArea(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('VoronoiMap.json', JSON.stringify({
        data: formatForVoronoiMap(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
      
      localStorage.setItem('PolarArea.json', JSON.stringify({
        data: formatForPolarArea(simpleHierarchy),
        title: result.title,
        source: result.source
      }));
    }
    
    // Set status to valid
    localStorage.setItem('chartData_status', JSON.stringify({
      isValid: true,
      title: result.title,
      source: result.source
    }));
    
    return result;
  } catch (error) {
    console.error('Error saving chart data:', error);
    localStorage.setItem('chartData_status', JSON.stringify({
      isValid: false,
      message: 'Error processing data: ' + error.message
    }));
    return generateSampleData('Error processing data: ' + error.message);
  }
};

/**
 * Format data specifically for bar charts
 */
function formatForBarChart(data) {
  // Bar charts can use the data as is, just ensure it has name/value properties
  return data.map(item => ({
    name: item.name || 'Unnamed',
    value: item.value || 0,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for line charts
 */
function formatForLineChart(data) {
  // Line charts often need a time dimension or sequence
  // Add an index property if not already present
  return data.map((item, index) => ({
    name: item.name || `Point ${index + 1}`,
    value: item.value || 0,
    index: item.order || index,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for area charts
 */
function formatForAreaChart(data) {
  // Similar to line charts but might need additional properties
  return data.map((item, index) => ({
    name: item.name || `Point ${index + 1}`,
    value: item.value || 0,
    index: item.order || index,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for donut charts
 */
function formatForDonutChart(data) {
  // Donut charts often show percentages of a whole
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  return data.map(item => ({
    name: item.name || 'Unnamed',
    value: item.value || 0,
    percentage: total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : 0,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

function formatForPolarArea(data) {
  // Polar Area is similar to a pie/donut chart but with varying radius
  return data.map(item => ({
    name: item.name || 'Unnamed',
    value: item.value || 0,
    ...(item.isPercentage && { isPercentage: true }),
    ...(item.currency && { currency: item.currency })
  }));
}

/**
 * Format data specifically for heatmap charts
 */
function formatForHeatmapChart(data) {
  // For heatmaps, we need to determine the min and max values for color scaling
  const values = data.map(item => item.value || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    items: data.map((item, index) => ({
      name: item.name || `Item ${index + 1}`,
      value: item.value || 0,
      intensity: (item.value - min) / (max - min || 1), // Normalized intensity between 0 and 1
      ...(item.isPercentage && { isPercentage: true }),
      ...(item.currency && { currency: item.currency })
    })),
    min,
    max
  };
}

/**
 * Format data specifically for word cloud
 */
function formatForWordCloud(data) {
  // If data is hierarchical, flatten it first
  const flatData = data.children ? flattenHierarchy(data) : data;
  
  if (Array.isArray(flatData)) {
    // Calculate total value for percentage calculation
    const totalValue = flatData.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Format data for word cloud
    return flatData.map(item => ({
      text: item.name || 'Unnamed',
      value: item.value || 1,
      percentage: totalValue > 0 ? ((item.value || 0) / totalValue * 100).toFixed(1) : 0,
      // Add color based on value
      color: `hsl(${(item.value || 0) * 10 % 360}, 70%, 50%)`
    }));
  }
  
  // Fallback to sample data
  return [
    { text: "Sample", value: 100, percentage: 25, color: "hsl(0, 70%, 50%)" },
    { text: "Data", value: 80, percentage: 20, color: "hsl(120, 70%, 50%)" },
    { text: "Visualization", value: 60, percentage: 15, color: "hsl(240, 70%, 50%)" },
    { text: "Chart", value: 40, percentage: 10, color: "hsl(60, 70%, 50%)" },
    { text: "Example", value: 20, percentage: 5, color: "hsl(300, 70%, 50%)" }
  ];
}

function formatForChordDiagram(data) {
  // If data is hierarchical, flatten it first
  const flatData = data.children ? flattenHierarchy(data) : data;
  
  // We need at least 2 items for a chord diagram
  if (!Array.isArray(flatData) || flatData.length < 2) {
    return {
      names: ['A', 'B', 'C', 'D'],
      matrix: [
        [0, 10, 5, 15],
        [10, 0, 20, 5],
        [5, 20, 0, 10],
        [15, 5, 10, 0]
      ]
    };
  }
  
  // Get top items by value for better visualization
  const topItems = [...flatData]
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.min(10, flatData.length));
  
  // Extract names
  const names = topItems.map(item => item.name);
  
  // Create a matrix of relationships
  const matrix = [];
  const totalValue = topItems.reduce((sum, item) => sum + (item.value || 0), 0);
  
  for (let i = 0; i < names.length; i++) {
    const row = [];
    for (let j = 0; j < names.length; j++) {
      if (i === j) {
        // No relationship with self
        row.push(0);
      } else {
        // Calculate relationship value based on the two items
        const sourceValue = topItems[i].value || 0;
        const targetValue = topItems[j].value || 0;
        
        // Generate a value using a combination of the two item values
        // Ensure some variability for visual interest
        const strength = Math.max(5, Math.min(30, 
          Math.sqrt(sourceValue * targetValue) / (totalValue / names.length) * (0.5 + Math.random())
        ));
        
        row.push(Math.round(strength));
      }
    }
    matrix.push(row);
  }
  
  return { 
    names, 
    matrix,
    // Add metadata for better visualization
    metadata: {
      totalValue,
      maxValue: Math.max(...matrix.flat()),
      minValue: Math.min(...matrix.flat().filter(v => v > 0))
    }
  };
}

function formatForConnectionMap(data) {
  // Connection Maps are similar to Network Graphs but with geographic positions
  // For simplicity, we'll use the same basic structure with added positions
  const networkData = formatForNetworkGraph(data);
  
  // Add geographic coordinates
  const nodesWithPositions = networkData.nodes.map((node, index) => {
    // Generate positions in a circular layout for demonstration
    const angle = (index / networkData.nodes.length) * 2 * Math.PI;
    const radius = 200 + (node.value / 10);
    
    return {
      ...node,
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle)
    };
  });
  
  return {
    nodes: nodesWithPositions,
    links: networkData.links
  };
}

function formatForTreeDiagram(data) {
  // If data already has the correct hierarchical structure, use it directly
  if (data && typeof data === 'object' && data.name && Array.isArray(data.children)) {
    // Ensure all nodes have proper values
    ensureTreeDiagramValues(data);
    return data;
  }
  
  // If data is an array, create a root node with the array as children
  if (Array.isArray(data)) {
    return {
      name: "Root",
      children: data.map(item => ({
        name: item.name || "Unnamed",
        value: item.value || 1,
        ...(item.children && { children: item.children })
      }))
    };
  }
  
  // If data is an object but not in the right format, transform it
  if (data && typeof data === 'object') {
    const children = [];
    
    // Extract properties as children
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'name' && key !== 'children') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively transform nested objects
          children.push(formatForTreeDiagram({
            name: key,
            ...value
          }));
        } else {
          children.push({
            name: key,
            value: typeof value === 'number' ? value : 1
          });
        }
      }
    }
    
    return {
      name: data.name || "Root",
      children: children.length > 0 ? children : [{ name: "No Data", value: 1 }]
    };
  }
  
  // Fallback for empty or invalid data
  return {
    name: "Tree Diagram",
    children: [
      { name: "Sample A", value: 400 },
      { name: "Sample B", value: 300, 
        children: [
          { name: "B1", value: 150 },
          { name: "B2", value: 150 }
        ]
      },
      { name: "Sample C", value: 200 },
      { name: "Sample D", value: 100 }
    ]
  };
}

/**
 * Ensure all nodes in the hierarchy have proper value properties
 * @param {Object} node - The node to process
 */
function ensureTreeDiagramValues(node) {
  if (!node) return;
  
  // Assign default value if not present
  if (node.value === undefined || node.value === null) {
    // Root nodes typically don't need values for tree diagrams
    if (!node.children || node.children.length === 0) {
      node.value = 1;
    }
  }
  
  // Process children
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => ensureTreeDiagramValues(child));
  }
}

function formatForCirclePacking(data) {
  // If data is already hierarchical, ensure it has proper values
  if (data.children) {
    // Ensure all nodes have proper values
    ensureNodeValues(data);
    
    // Add metadata for better visualization
    const metadata = {
      totalValue: calculateTotalValue(data),
      maxDepth: calculateMaxDepth(data),
      nodeCount: countNodes(data)
    };
    
    return {
      data: data,
      metadata
    };
  }
  
  // For non-hierarchical data, create a simple hierarchy
  if (Array.isArray(data)) {
    // Sort data by value
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    // Create a simple hierarchy with one level
    const hierarchy = {
      name: "Data",
      children: sortedData.map(item => ({
        name: item.name || "Unnamed",
        value: item.value || 1
      }))
    };
    
    return {
      data: hierarchy,
      metadata: {
        totalValue: sortedData.reduce((sum, item) => sum + (item.value || 0), 0),
        maxDepth: 1,
        nodeCount: sortedData.length
      }
    };
  }
  
  // Fallback to sample data
  return {
    data: {
      name: "Sample Data",
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
    },
    metadata: {
      totalValue: 100,
      maxDepth: 2,
      nodeCount: 6
    }
  };
}

function formatForTreeMap(data) {
  // If data is already hierarchical, ensure it has proper values
  if (data.children) {
    // Ensure all nodes have proper values
    ensureNodeValues(data);
    
    // Add metadata for better visualization
    const metadata = {
      totalValue: calculateTotalValue(data),
      maxDepth: calculateMaxDepth(data),
      nodeCount: countNodes(data)
    };
    
    return {
      data: data,
      metadata
    };
  }
  
  // For non-hierarchical data, create a simple hierarchy
  if (Array.isArray(data)) {
    // Sort data by value
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    // Create a simple hierarchy with one level
    const hierarchy = {
      name: "Data",
      children: sortedData.map(item => ({
        name: item.name || "Unnamed",
        value: item.value || 1
      }))
    };
    
    return {
      data: hierarchy,
      metadata: {
        totalValue: sortedData.reduce((sum, item) => sum + (item.value || 0), 0),
        maxDepth: 1,
        nodeCount: sortedData.length
      }
    };
  }
  
  // Fallback to sample data
  return {
    data: {
      name: "Sample Data",
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
    },
    metadata: {
      totalValue: 100,
      maxDepth: 2,
      nodeCount: 6
    }
  };
}

// Helper functions for hierarchical data processing
function calculateTotalValue(node) {
  if (!node) return 0;
  let total = node.value || 0;
  if (node.children) {
    total += node.children.reduce((sum, child) => sum + calculateTotalValue(child), 0);
  }
  return total;
}

function calculateMaxDepth(node, currentDepth = 0) {
  if (!node) return currentDepth;
  if (!node.children || node.children.length === 0) return currentDepth;
  return Math.max(...node.children.map(child => calculateMaxDepth(child, currentDepth + 1)));
}

function countNodes(node) {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  return count;
}

function formatForSunburst(data, query, fallbackJson) {
  const normalizedQuery = (typeof query === 'string' ? query : query?.response || '').toLowerCase();

  // Use fallback data based on query
  if (!data || Object.keys(data).length === 0) {
    if (fallbackJson && fallbackJson.fallbacks) {
      if (normalizedQuery.includes('dramatic structure') || normalizedQuery.includes('acts') || normalizedQuery.includes('beats')) {
        const structureFallback = fallbackJson.fallbacks.find(f => f.id === 'structure');
        if (structureFallback) {
          ensureNodeValues(structureFallback.data);
          return structureFallback.data;
        }
      } else if (normalizedQuery.includes('directors') && normalizedQuery.includes('award-winning')) {
        const rolesFallback = fallbackJson.fallbacks.find(f => f.id === 'roles');
        if (rolesFallback) {
          ensureNodeValues(rolesFallback.data);
          return rolesFallback.data;
        }
      }
    }

    // Default fallback if nothing matches
    return {
      name: "No Matching Fallback",
      children: [{ name: "Try a different query", value: 1 }]
    };
  }

  // Use directly if structured correctly
  if (data && typeof data === 'object' && data.name && Array.isArray(data.children)) {
    ensureNodeValues(data);
    return data;
  }

  // Wrap array in root
  if (Array.isArray(data)) {
    return {
      name: "Root",
      children: data.map(item => ({
        name: item.name || "Unnamed",
        value: item.value || 1,
        ...(item.children && { children: item.children })
      }))
    };
  }

  // Convert object to hierarchy
  if (data && typeof data === 'object') {
    const children = [];

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'name' && key !== 'children') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          children.push(formatForSunburst({
            name: key,
            ...value
          }, '', fallbackJson));
        } else {
          children.push({
            name: key,
            value: typeof value === 'number' ? value : 1
          });
        }
      }
    }

    return {
      name: data.name || "Root",
      children: children.length > 0 ? children : [{ name: "No Data", value: 1 }]
    };
  }

  // Ultimate fallback
  return {
    name: "Sunburst Data",
    children: [{ name: "Unknown Format", value: 1 }]
  };
}

/**
 * Ensure all nodes in the hierarchy have proper value properties
 * @param {Object} node - The node to process
 * @param {number} depth - Current depth in the hierarchy
 */
function ensureNodeValues(node, depth = 0) {
  if (!node) return;
  
  // Leaf nodes must have a value
  if (!node.children || node.children.length === 0) {
    node.value = node.value || 100 - (depth * 20) || 1;
  }
  
  // Process children
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => ensureNodeValues(child, depth + 1));
    
    // If this node doesn't have an explicit value but has children,
    // let the d3.hierarchy sum() function calculate it
  }
}

function formatForDAG(data) {
  // If data is already hierarchical, convert it to DAG format
  if (data.children) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map(); // Track nodes by ID
    
    function traverseHierarchy(node, parentId = null, level = 0) {
      if (!node || !node.name) return;
      
      // Create clean ID from name
      const id = node.name.replace(/[^\w\s]/gi, '').trim().toLowerCase().replace(/\s+/g, '_');
      if (!id) return; // Skip nodes with empty IDs
      
      // Add node if it doesn't exist
      if (!nodeMap.has(id)) {
        const newNode = {
          id: id,
          name: node.name,
          value: node.value || Math.max(5, 20 - (level * 5)), // Value decreases with depth
          level: level
        };
        nodes.push(newNode);
        nodeMap.set(id, newNode);
      }
      
      // Add link from parent
      if (parentId) {
        const linkId = `${parentId}-${id}`;
        if (!links.some(l => l.id === linkId)) {
          links.push({
            id: linkId,
            source: parentId,
            target: id,
            value: 1
          });
        }
      }
      
      // Process children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverseHierarchy(child, id, level + 1));
      }
    }
    
    traverseHierarchy(data);
    
    // Ensure all nodes have at least one connection
    if (nodes.length > 0 && links.length === 0) {
      // Create a simple chain if no links were created
      for (let i = 0; i < nodes.length - 1; i++) {
        links.push({
          id: `${nodes[i].id}-${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
          value: 1
        });
      }
    }
    
    return { nodes, links };
  }
  
  // For non-hierarchical data, create a simple DAG
  if (Array.isArray(data)) {
    const nodes = data.map((item, index) => ({
      id: `node_${index}`,
      name: item.name || `Item ${index + 1}`,
      value: item.value || 10,
      level: 0
    }));
    
    const links = [];
    // Create a simple chain
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        id: `link_${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        value: 1
      });
    }
    
    return { nodes, links };
  }
  
  // Fallback to sample data
  return {
    nodes: [
      { id: 'root', name: 'Root', value: 20, level: 0 },
      { id: 'a', name: 'Node A', value: 15, level: 1 },
      { id: 'b', name: 'Node B', value: 15, level: 1 },
      { id: 'c', name: 'Node C', value: 10, level: 2 },
      { id: 'd', name: 'Node D', value: 10, level: 2 }
    ],
    links: [
      { id: 'root-a', source: 'root', target: 'a', value: 1 },
      { id: 'root-b', source: 'root', target: 'b', value: 1 },
      { id: 'a-c', source: 'a', target: 'c', value: 1 },
      { id: 'b-d', source: 'b', target: 'd', value: 1 }
    ]
  };
}


function formatForNetworkGraph(data) {
  // For hierarchical data, create a network based on parent-child relationships
  if (data.children) {
    const nodes = [];
    const links = [];
    
    function traverseHierarchy(node, parentId = null, level = 0) {
      if (!node || !node.name) return;
      
      // Create clean ID from name
      const id = node.name.replace(/[^\w\s]/gi, '').trim();
      if (!id) return; // Skip nodes with empty IDs
      
      // Check if node already exists
      if (!nodes.some(n => n.id === id)) {
        nodes.push({
          id: id,
          name: node.name,
          value: node.value || Math.max(5, 20 - (level * 5)), // Value decreases with depth
          group: level + 1 // Group by hierarchy level
        });
      }
      
      // Add link from parent
      if (parentId) {
        links.push({
          source: parentId,
          target: id,
          value: 1
        });
      }
      
      // Process children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverseHierarchy(child, id, level + 1));
      }
    }
    
    traverseHierarchy(data);
    
    return { nodes, links };
  }
  
  // For flat data, create a network based on value relationships
  if (Array.isArray(data)) {
    const nodes = data.map((item, index) => ({
      id: item.name ? item.name.replace(/[^\w\s]/gi, '').trim() : `node_${index}`,
      name: item.name || `Item ${index}`,
      value: item.value || 1,
      group: Math.floor(index / 3) + 1 // Simple grouping
    }));
    
    const links = [];
    
    // Create some connections between nodes
    for (let i = 0; i < nodes.length; i++) {
      // Connect to next node
      if (i < nodes.length - 1) {
        links.push({
          source: nodes[i].id,
          target: nodes[i + 1].id,
          value: 1
        });
      }
      
      // Add some extra connections for more interesting network
      if (i % 3 === 0 && i + 2 < nodes.length) {
        links.push({
          source: nodes[i].id,
          target: nodes[i + 2].id,
          value: 0.5
        });
      }
    }
    
    return { nodes, links };
  }
  
  // Fallback to sample data
  return {
    nodes: [
      { id: "A", name: "Node A", value: 10, group: 1 },
      { id: "B", name: "Node B", value: 8, group: 1 },
      { id: "C", name: "Node C", value: 6, group: 2 },
      { id: "D", name: "Node D", value: 4, group: 2 },
      { id: "E", name: "Node E", value: 2, group: 3 }
    ],
    links: [
      { source: "A", target: "B", value: 1 },
      { source: "A", target: "C", value: 1 },
      { source: "B", target: "D", value: 1 },
      { source: "C", target: "D", value: 1 },
      { source: "D", target: "E", value: 1 }
    ]
  };
}

function formatForMosaicPlot(data) {
  // Mosaic plots need categorical data with at least two dimensions
  
  // If hierarchical, use the first two levels
  if (data.children) {
    const result = {
      data: [],
      categories: [],
      subcategories: []
    };
    
    // Extract unique categories (first level)
    data.children.forEach(child => {
      if (child.name) {
        if (!result.categories.includes(child.name)) {
          result.categories.push(child.name);
        }
        
        // Extract subcategories (second level)
        if (child.children && Array.isArray(child.children)) {
          child.children.forEach(subchild => {
            if (subchild.name) {
              if (!result.subcategories.includes(subchild.name)) {
                result.subcategories.push(subchild.name);
              }
              
              // Add data point
              result.data.push({
                category: child.name,
                subcategory: subchild.name,
                value: subchild.value || 1
              });
            }
          });
        }
      }
    });
    
    return result;
  }
  
  // For flat data, create categories based on value ranges
  if (Array.isArray(data)) {
    // Determine value ranges for categories
    const values = data.map(item => item.value || 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    
    // Create category boundaries
    const lowThreshold = minValue + range / 3;
    const mediumThreshold = minValue + 2 * range / 3;
    
    // Create result
    const result = {
      data: [],
      categories: ["Low", "Medium", "High"],
      subcategories: []
    };
    
    // Extract subcategories from the first letters of names
    const uniqueFirstLetters = [...new Set(
      data.map(item => item.name.charAt(0).toUpperCase())
    )].sort();
    
    result.subcategories = uniqueFirstLetters;
    
    // Create data points
    data.forEach(item => {
      let category;
      if (item.value <= lowThreshold) {
        category = "Low";
      } else if (item.value <= mediumThreshold) {
        category = "Medium";
      } else {
        category = "High";
      }
      
      const subcategory = item.name.charAt(0).toUpperCase();
      
      result.data.push({
        category,
        subcategory,
        value: item.value || 1,
        name: item.name
      });
    });
    
    return result;
  }
  
  // Fallback to sample data
  return {
    data: [
      { category: "A", subcategory: "X", value: 15 },
      { category: "A", subcategory: "Y", value: 10 },
      { category: "B", subcategory: "X", value: 12 },
      { category: "B", subcategory: "Y", value: 5 },
      { category: "C", subcategory: "X", value: 8 },
      { category: "C", subcategory: "Y", value: 20 }
    ],
    categories: ["A", "B", "C"],
    subcategories: ["X", "Y"]
  };
}

function formatForSmallMultiples(data) {
  // Small multiples typically show the same chart type with different data subsets
  
  // If hierarchical, use first level as categories
  if (data.children) {
    return data.children.map(child => ({
      category: child.name,
      data: child.children ? 
        child.children.map(grandchild => ({
          name: grandchild.name,
          value: grandchild.value || 1
        })) : 
        [{ name: child.name, value: child.value || 1 }]
    }));
  }
  
  // For flat data, group by first letter of name
  if (Array.isArray(data)) {
    // Group data by first letter of name
    const groupedData = {};
    
    data.forEach(item => {
      const firstLetter = item.name.charAt(0).toUpperCase();
      if (!groupedData[firstLetter]) {
        groupedData[firstLetter] = [];
      }
      groupedData[firstLetter].push({
        name: item.name,
        value: item.value || 1
      });
    });
    
    // Convert grouped data to array
    return Object.entries(groupedData).map(([letter, items]) => ({
      category: `Group ${letter}`,
      data: items
    }));
  }
  
  // Fallback to sample data
  return [
    {
      category: "Group A",
      data: [
        { name: "A1", value: 10 },
        { name: "A2", value: 15 },
        { name: "A3", value: 8 }
      ]
    },
    {
      category: "Group B",
      data: [
        { name: "B1", value: 12 },
        { name: "B2", value: 5 },
        { name: "B3", value: 9 }
      ]
    },
    {
      category: "Group C",
      data: [
        { name: "C1", value: 7 },
        { name: "C2", value: 14 },
        { name: "C3", value: 11 }
      ]
    }
  ];
}

// Export all format functions
export { formatForBarChart, formatForLineChart, formatForAreaChart, formatForDonutChart, formatForPolarArea, formatForHeatmapChart, formatForWordCloud, formatForChordDiagram, formatForConnectionMap, formatForTreeDiagram, formatForCirclePacking, formatForTreeMap, formatForSunburst, formatForDAG, formatForNetworkGraph, formatForMosaicPlot, formatForSmallMultiples, formatForVoronoiMap };

export function formatForStackedArea(data) {
  // Stacked area charts need time series data with multiple categories
  const timePoints = 5; // Number of time points to generate
  
  // If hierarchical, use first level children as categories
  if (data.children) {
    const categories = data.children.map(child => child.name).slice(0, 5);
    const result = [];
    
    // Generate time points
    for (let t = 0; t < timePoints; t++) {
      const timePoint = {
        name: `T${t + 1}`
      };
      
      // Add values for each category
      categories.forEach((category, i) => {
        const baseValue = data.children[i].value || 50;
        // Generate a trending value (increasing or decreasing over time)
        const trendFactor = 1 + (t * (Math.random() > 0.5 ? 0.1 : -0.05));
        timePoint[category] = Math.round(baseValue * trendFactor);
      });
      
      result.push(timePoint);
    }
    
    return {
      data: result,
      categories
    };
  }
  
  // For flat data, use top items as categories
  if (Array.isArray(data)) {
    // Get top categories by value
    const topCategories = [...data]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(item => item.name);
    
    const result = [];
    
    // Generate time points
    for (let t = 0; t < timePoints; t++) {
      const timePoint = {
        name: `T${t + 1}`
      };
      
      // Add values for each category
      topCategories.forEach((category, i) => {
        const baseValue = data.find(item => item.name === category).value || 50;
        // Generate a trending value
        const trendFactor = 1 + (t * (Math.random() > 0.5 ? 0.1 : -0.05));
        timePoint[category] = Math.round(baseValue * trendFactor);
      });
      
      result.push(timePoint);
    }
    
    return {
      data: result,
      categories: topCategories
    };
  }
  
  // Fallback to sample data
  return {
    data: [
      { name: "T1", "Category A": 20, "Category B": 30, "Category C": 10 },
      { name: "T2", "Category A": 25, "Category B": 25, "Category C": 15 },
      { name: "T3", "Category A": 30, "Category B": 20, "Category C": 20 },
      { name: "T4", "Category A": 35, "Category B": 15, "Category C": 25 },
      { name: "T5", "Category A": 40, "Category B": 10, "Category C": 30 }
    ],
    categories: ["Category A", "Category B", "Category C"]
  };
}

function formatForVoronoiMap(data) {
  // Voronoi maps need points with coordinates
  
  // If hierarchical, flatten it first
  const flatData = data.children ? flattenHierarchy(data) : data;
  
  if (Array.isArray(flatData)) {
    // Create points with coordinates
    return flatData.map((item, index) => {
      // Generate positions using a deterministic approach
      // This ensures consistent positions based on index and value
      const angle = (index / flatData.length) * 2 * Math.PI;
      // Value affects distance from center
      const radius = 200 + (Math.sqrt(item.value || 1) * 10);
      
      return {
        name: item.name,
        value: item.value || 1,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle)
      };
    });
  }
  
  // Fallback to sample data
  return [
    { name: "Point A", value: 30, x: 200, y: 200 },
    { name: "Point B", value: 25, x: 300, y: 400 },
    { name: "Point C", value: 20, x: 400, y: 150 },
    { name: "Point D", value: 15, x: 500, y: 350 },
    { name: "Point E", value: 10, x: 600, y: 250 }
  ];
}

/**
 * Process saved chat data in the format provided
 */
function processSavedChatData(chatString) {
  try {
    // Extract the JSON array from the string
    const jsonStart = chatString.indexOf('[');
    const jsonEnd = chatString.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Invalid chat format');
    }
    
    const chatJson = chatString.substring(jsonStart, jsonEnd);
    const chatData = JSON.parse(chatJson);
    
    // Find the bot response
    const botMessage = chatData.find(msg => msg.sender === 'bot');
    
    if (!botMessage) {
      return generateSampleData('No bot response found in chat');
    }
    
    // Check if the response is valid for chart generation
    if (typeof botMessage.text === 'object' && botMessage.text.response) {
      const responseText = botMessage.text.response;
      
      // Check if it's a rejection or non-chartable response
      if (responseText.includes('cannot provide') || 
          responseText.includes('I\'m sorry') ||
          responseText.includes('I apologize')) {
        return {
          data: [],
          title: 'Invalid Response',
          source: 'invalid',
          isInvalid: true,
          message: 'Invalid response - charts cannot be generated'
        };
      }
      
      // Process the response text
      return processTextData(responseText);
    } else if (typeof botMessage.text === 'string') {
      return processTextData(botMessage.text);
    }
    
    return generateSampleData('Could not extract usable data from chat');
  } catch (error) {
    console.error('Error processing chat data:', error);
    return generateSampleData('Error processing chat data: ' + error.message);
  }
}

/**
 * Helper function to detect hierarchical data structures in text
 */
function containsHierarchicalData(text) {
  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Hierarchy keywords
  const hierarchy_keywords = [
    "structure", "hierarchy", "nested", "parent", "child", "tree", "branch", "root", 
    "descendant", "ancestor", "organization", "breakdown", "composition", "contains",
    "hierarchical", "level", "tier", "layer", "subordinate", "superordinate", "category",
    "subcategory", "classification", "taxonomy", "class", "subclass", "group", "subgroup",
    "department", "division", "section", "subsection", "part", "subpart", "component",
    "subcomponent", "element", "subelement", "unit", "subunit", "module", "submodule"
  ];
  
  // Check if text contains any of the hierarchy keywords
  const hasHierarchyKeyword = hierarchy_keywords.some(keyword => lowerText.includes(keyword));
  
  // Check for common hierarchical patterns
  const hasHierarchicalPatterns = (
    // Look for nested structures with asterisks
    (text.includes('**') && text.includes(':')) || 
    // Look for bullet points with hierarchy indicators (*, +, -, etc.)
    /^\s*[\*\+\-]\s+/m.test(text) ||
    // Look for numbered lists
    /^\s*\d+\.\s+/m.test(text) ||
    // Look for indentation patterns
    /^\s{2,}[^\s]/m.test(text) ||
    // Look for common hierarchical separators
    /[:\-]\s*\n\s*[\*\+\-]/m.test(text) ||
    // Look for parent-child relationships
    /(?:parent|child|children|sub|subsidiary|division|department)/i.test(text)
  );
  
  // Check for data that looks like a hierarchy
  const hasHierarchicalStructure = (
    // Check for repeated patterns that suggest hierarchy
    /(?:^|\n)(?:\s*[\*\+\-]|\s*\d+\.|\s*[A-Z]\.|\s*[a-z]\.|\s*[IVX]+\.|\s*[ivx]+\.)/m.test(text) ||
    // Check for nested bullet points
    /^\s*[\*\+\-]\s+.*\n\s{2,}[\*\+\-]/m.test(text) ||
    // Check for numbered sub-items
    /^\s*\d+\.\s+.*\n\s{2,}\d+\./m.test(text)
  );
  
  return hasHierarchyKeyword || hasHierarchicalPatterns || hasHierarchicalStructure;
}

function extractEnhancedHierarchicalData(text) {
  const result = {
    name: detectTitleFromText(text) || "Hierarchical Data",
    children: []
  };
  
  // Split text by lines for processing
  const lines = text.split('\n');
  
  // State tracking
  let currentSections = []; // Track section hierarchy
  let currentSection = null;
  let previousLevel = -1;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Detect hierarchical elements and their levels
    
    // Major section headers (often bold with **)
    if (line.match(/^\*\*([^*:]+)(?:\*\*|:)/)) {
      const sectionMatch = line.match(/^\*\*([^*:]+)(?:\*\*|:)/);
      const sectionName = sectionMatch[1].trim();
      
      const newSection = {
        name: sectionName,
        value: 100,
        children: []
      };
      
      // Reset to top level
      currentSections = [newSection];
      currentSection = newSection;
      previousLevel = 0;
      
      // Add to root
      result.children.push(newSection);
      continue;
    }
    
    // Numbered items (1., 2., etc)
    if (line.match(/^\*?\s*\d+\.\s*\*?\*([^*:]+)(?:\*\*|:)/)) {
      const itemMatch = line.match(/^\*?\s*\d+\.\s*\*?\*([^*:]+)(?:\*\*|:)/);
      const itemName = itemMatch[1].trim();
      
      // This is typically a second level item
      const newItem = {
        name: itemName,
        value: 70,
        children: []
      };
      
      // Check if we need to adjust the section hierarchy
      if (previousLevel < 1) {
        // Add to current top-level section
        if (currentSections.length > 0) {
          currentSections[0].children.push(newItem);
        } else {
          // No parent section yet, create one
          const parentSection = {
            name: "Main Category",
            value: 100,
            children: [newItem]
          };
          result.children.push(parentSection);
          currentSections = [parentSection];
        }
      } else if (previousLevel === 1) {
        // Same level, add to same parent
        currentSections[0].children.push(newItem);
      } else {
        // Moving up a level, adjust hierarchy
        while (currentSections.length > 1) {
          currentSections.pop();
        }
        currentSections[0].children.push(newItem);
      }
      
      // Update current section
      currentSections[1] = newItem;
      currentSection = newItem;
      previousLevel = 1;
      continue;
    }
    
    // Bullet points (*, -, +) that contain examples or further details
    if (line.match(/^\s*[\*\-\+]\s+(.+)/)) {
      const bulletMatch = line.match(/^\s*[\*\-\+]\s+(.+)/);
      let itemText = bulletMatch[1].trim();
      
      // Extract example names if present
      const examples = [];
      
      // Match example patterns like "Examples: Name1, Name2"
      if (itemText.includes("Examples:")) {
        const exampleMatch = itemText.match(/Examples:\s*(.*)/);
        if (exampleMatch) {
          const exampleList = exampleMatch[1].split(',').map(ex => ex.trim());
          itemText = itemText.replace(/Examples:\s*.*/, "Examples:");
          
          exampleList.forEach(ex => {
            // Extract name and film if available (e.g., "Director Name (Film, Year)")
            const nameMatch = ex.match(/(.*?)\s*(?:\((.*?)\))?$/);
            if (nameMatch) {
              examples.push({
                name: nameMatch[1].trim(),
                value: 30,
                ...(nameMatch[2] && { info: nameMatch[2].trim() })
              });
            }
          });
        }
      }
      
      // This is a child of the current section
      const newItem = {
        name: itemText,
        value: 50,
        ...(examples.length > 0 && { children: examples })
      };
      
      // Add to current section
      if (currentSection) {
        if (!currentSection.children) {
          currentSection.children = [];
        }
        currentSection.children.push(newItem);
      } else {
        // No parent section yet, add to root
        result.children.push(newItem);
      }
      
      previousLevel = 2;
      continue;
    }
    
    // Sequences with plus signs (+)
    if (line.match(/^\s*\+\s+(.+)/)) {
      const plusMatch = line.match(/^\s*\+\s+(.+)/);
      const itemName = plusMatch[1].trim();
      
      // This is typically a detail item
      const newItem = {
        name: itemName,
        value: 30
      };
      
      // Add to current section
      if (currentSection) {
        if (!currentSection.children) {
          currentSection.children = [];
        }
        currentSection.children.push(newItem);
      } else {
        // No parent section yet, add to root
        result.children.push(newItem);
      }
      
      previousLevel = 3;
    }
  }
  
  // Special processing for film studios structure
  if (text.toLowerCase().includes("studios") && text.toLowerCase().includes("subsidiaries")) {
    return processStudioStructure(text);
  }
  
  // Special processing for dramatic structure
  if (text.toLowerCase().includes("dramatic structure") || text.toLowerCase().includes("act 1")) {
    return processDramaticStructure(text);
  }
  
  return result;
}

/**
 * Process film studio organizational structure
 * @param {string} text - The text response about film studios
 * @returns {Object} The structured hierarchy of film studios
 */
function processStudioStructure(text) {
  const result = {
    name: "Hollywood Studios",
    children: []
  };
  
  // Split by lines for processing
  const lines = text.split('\n');
  
  let currentStudio = null;
  let currentCategory = null;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Match main studio category (Big Six, Independent majors, etc.)
    if (line.match(/\*\*([^*]+):\*\*/)) {
      const categoryMatch = line.match(/\*\*([^*]+):\*\*/);
      currentCategory = {
        name: categoryMatch[1].trim(),
        value: 100,
        children: []
      };
      result.children.push(currentCategory);
      continue;
    }
    
    // Match numbered studio entries (1. Studio Name)
    if (line.match(/^\d+\.\s+\*\*([^*]+)\*\*/)) {
      const studioMatch = line.match(/^\d+\.\s+\*\*([^*]+)\*\*/);
      let studioName = studioMatch[1].trim();
      
      // Extract ownership info if present
      let ownerInfo = "";
      if (line.includes("(owned by")) {
        const ownerMatch = line.match(/\(owned by([^)]+)\)/);
        if (ownerMatch) {
          ownerInfo = ownerMatch[1].trim();
          studioName = `${studioName} (${ownerInfo})`;
        }
      }
      
      currentStudio = {
        name: studioName,
        value: 80,
        children: []
      };
      
      if (currentCategory) {
        currentCategory.children.push(currentStudio);
      } else {
        result.children.push(currentStudio);
      }
      continue;
    }
    
    // Match subsidiary entries (* Subsidiary Name)
    if (line.match(/^\s*\*\s+([^*]+)/)) {
      const subsidiaryMatch = line.match(/^\s*\*\s+([^*]+)/);
      const subsidiaryName = subsidiaryMatch[1].trim();
      
      const subsidiary = {
        name: subsidiaryName,
        value: 50
      };
      
      if (currentStudio) {
        currentStudio.children.push(subsidiary);
      } else if (currentCategory) {
        currentCategory.children.push(subsidiary);
      } else {
        result.children.push(subsidiary);
      }
    }
  }
  
  return result;
}

/**
 * Process dramatic structure hierarchy
 * @param {string} text - The text response about dramatic structure
 * @returns {Object} The structured hierarchy of dramatic elements
 */
function processDramaticStructure(text) {
  const result = {
    name: "Dramatic Structure",
    children: []
  };
  
  // Split by lines for processing
  const lines = text.split('\n');
  
  let currentAct = null;
  let currentSequence = null;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Match act entries (Act 1: Setup)
    if (line.match(/^Act\s+\d+:\s+(.+)/i)) {
      const actMatch = line.match(/^Act\s+\d+:\s+(.+)/i);
      const actName = `Act ${line.match(/\d+/)[0]}: ${actMatch[1].trim()}`;
      
      currentAct = {
        name: actName,
        value: 100,
        children: []
      };
      
      result.children.push(currentAct);
      currentSequence = null;
      continue;
    }
    
    // Match sequence entries (Sequence 1: Introduction)
    if (line.match(/^Sequence\s+\d+:/i)) {
      const sequenceMatch = line.match(/^Sequence\s+\d+:\s+([^(]+)/i);
      let sequenceName = `Sequence ${line.match(/\d+/)[0]}`;
      
      if (sequenceMatch) {
        sequenceName += `: ${sequenceMatch[1].trim()}`;
      }
      
      // Extract scene info if present
      let sceneInfo = "";
      if (line.includes("(Scene")) {
        const sceneMatch = line.match(/\(Scene([^)]+)\)/);
        if (sceneMatch) {
          sceneInfo = sceneMatch[1].trim();
          sequenceName += ` (${sceneInfo})`;
        }
      }
      
      currentSequence = {
        name: sequenceName,
        value: 70,
        children: []
      };
      
      if (currentAct) {
        currentAct.children.push(currentSequence);
      } else {
        result.children.push(currentSequence);
      }
      continue;
    }
    
    // Match elements with plus signs (+)
    if (line.match(/^\+\s+(.+)/)) {
      const elementMatch = line.match(/^\+\s+(.+)/);
      const elementName = elementMatch[1].trim();
      
      const element = {
        name: elementName,
        value: 40
      };
      
      if (currentSequence) {
        currentSequence.children.push(element);
      } else if (currentAct) {
        currentAct.children.push(element);
      } else {
        result.children.push(element);
      }
      continue;
    }
    
    // Match other structural elements like "Character Arc"
    if (line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/)) {
      // Only match if it looks like a title (first letters capitalized)
      const newSection = {
        name: line,
        value: 60,
        children: []
      };
      
      result.children.push(newSection);
      
      // The next few items might be children of this section
      let j = i + 1;
      while (j < lines.length && lines[j].trim().match(/^[A-Z]/)) {
        const childLine = lines[j].trim();
        newSection.children.push({
          name: childLine,
          value: 30
        });
        j++;
      }
      
      i = j - 1; // Skip the lines we've already processed
    }
  }
  
  return result;
}

/**
 * Helper function to detect title from text
 * @param {string} text - The text to detect a title from
 * @returns {string} The detected title
 */
function detectTitleFromText(text) {
  // Look for common domain identifiers
  if (text.toLowerCase().includes("film") || text.toLowerCase().includes("cinema") || 
      text.toLowerCase().includes("movie")) {
    return "Film Industry Hierarchy";
  } else if (text.toLowerCase().includes("studio") || text.toLowerCase().includes("organizational structure")) {
    return "Hollywood Studio Structure";
  } else if (text.toLowerCase().includes("dramatic structure") || text.toLowerCase().includes("storytelling")) {
    return "Dramatic Structure Hierarchy";
  }
  
  // Default title
  return "Hierarchical Data";
}

/**
 * Improved extraction of hierarchical data from text
 * @param {string} text - The text to extract hierarchical data from
 * @returns {Object} Object containing extracted data and metadata
 */
function enhancedExtractHierarchicalData(text) {
  const hierarchy = extractEnhancedHierarchicalData(text);
  
  return {
    data: hierarchy,
    title: hierarchy.name,
    source: 'hierarchy',
    isHierarchical: true
  };
}

function flattenHierarchy(node, result = [], level = 0, parentPath = '') {
  if (!node) return result;
  
  // Create current path
  const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
  
  if (node.name) {
    // Add current node to result
    result.push({
      name: level === 0 ? node.name : currentPath,
      value: node.value || (100 - (level * 20)),
      level: level
    });
  }
  
  // Process children
  if (node.children && node.children.length) {
    node.children.forEach(child => {
      flattenHierarchy(child, result, level + 1, currentPath);
    });
  }
  
  return result;
}

/**
 * Process markdown data
 */
function processMarkdownData(markdown) {
  try {
    // Basic markdown parsing (simplified without using external library)
    if (containsHierarchicalData(markdown)) {
      return enhancedExtractHierarchicalData(markdown);
    }
    // Remove bold markers
    let plainText = markdown.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove italic markers
    plainText = plainText.replace(/\*(.*?)\*/g, '$1');
    // Remove headings
    plainText = plainText.replace(/#+\s+(.*?)(?:\n|$)/g, '$1\n');
    // Replace bullet points with plain text
    plainText = plainText.replace(/^\s*[-*+]\s+/gm, '');
    
    // Process the plain text
    return processTextData(plainText);
  } catch (error) {
    console.error('Error processing markdown:', error);
    return processTextData(markdown); // Fallback to processing as regular text
  }
}
  
  /**
   * Process data with a response property
   */
  function processResponseData(data) {
    const responseText = data.response;
    
    // Check for various data formats in the response text
    if (containsHierarchicalData(responseText)) {
      return enhancedExtractHierarchicalData(responseText);
    } else if (containsCurrencyData(responseText)) {
      return extractCurrencyData(responseText);
    } else if (containsTimeData(responseText)) {
      return extractTimeData(responseText);
    } else if (containsPercentageData(responseText)) {
      return extractPercentageData(responseText);
    } else if (containsBulletPoints(responseText)) {
      return extractBulletPointData(responseText);
    } else {
      return extractGeneralTextData(responseText);
    }
  }
  
  /**
   * Process direct text input
   */
  function processTextData(text) {
    if (containsHierarchicalData(text)) {
      return enhancedExtractHierarchicalData(text);
    } else if (containsCurrencyData(text)) {
      return extractCurrencyData(text);
    } else if (containsTimeData(text)) {
      return extractTimeData(text);
    } else if (containsPercentageData(text)) {
      return extractPercentageData(text);
    } else if (containsBulletPoints(text)) {
      return extractBulletPointData(text);
    } else {
      return extractGeneralTextData(text);
    }
  }
  
  /**
   * Process array data
   */
  function processArrayData(array) {
    if (array.length === 0) {
      return generateSampleData('Empty array provided');
    }
    
    // If array already has the right format (name/value pairs)
    if (typeof array[0] === 'object' && 'name' in array[0] && 'value' in array[0]) {
      return {
        data: array,
        title: 'Array Data',
        source: 'structured array'
      };
    }
    
    // Convert array items to correct format
    const processed = array.map((item, index) => {
      if (typeof item === 'object') {
        // Find appropriate keys for name and value
        const keys = Object.keys(item);
        const nameKey = keys.find(k => 
          k.toLowerCase().includes('name') || 
          k.toLowerCase().includes('label') || 
          k.toLowerCase().includes('category') || 
          typeof item[k] === 'string'
        ) || keys[0];
        
        const valueKey = keys.find(k =>
          k.toLowerCase().includes('value') ||
          k.toLowerCase().includes('count') ||
          k.toLowerCase().includes('amount') ||
          typeof item[k] === 'number'
        ) || keys.find(k => k !== nameKey) || keys[1] || keys[0];
        
        return {
          name: String(item[nameKey] || `Item ${index}`),
          value: typeof item[valueKey] === 'number' ? 
            item[valueKey] : 
            parseFloat(item[valueKey]) || 0
        };
      } else if (typeof item === 'number') {
        return { name: `Item ${index}`, value: item };
      } else {
        return { name: String(item), value: 0 };
      }
    });
    
    return {
      data: processed,
      title: 'Array Data',
      source: 'array'
    };
  }
  
  /**
   * Process object data (key-value pairs)
   */
  function processObjectData(obj) {
    // Filter out non-data properties
    const filtered = {};
    let hasValues = false;
    
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'response' && !key.startsWith('_') && key !== 'query') {
        if (typeof value === 'number' || 
            (typeof value === 'string' && !isNaN(parseFloat(value)))) {
          filtered[key] = typeof value === 'number' ? value : parseFloat(value);
          hasValues = true;
        }
      }
    }
    
    if (hasValues) {
      const data = Object.entries(filtered).map(([key, value]) => ({
        name: key,
        value: value
      }));
      
      return {
        data,
        title: 'Object Data',
        source: 'object'
      };
    }
    
    // If no numeric values found, try processing as text
    if (obj.toString && typeof obj.toString === 'function') {
      return processTextData(obj.toString());
    }
    
    return generateSampleData('No usable data in object');
  }
  
  /**
   * Check if the text contains currency data
   */
  function containsCurrencyData(text) {
    const currencyPatterns = [
      /USD|EUR|GBP|JPY|CAD/i,
      /\$\s*\d+/,
      /\d+\s*\$/,
      /€\s*\d+/,
      /\d+\s*€/,
      /£\s*\d+/,
      /\d+\s*£/,
      /¥\s*\d+/,
      /\d+\s*¥/,
      /exchange rate/i,
      /currency/i
    ];
    
    return currencyPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Extract currency data from text
   */
  function extractCurrencyData(text) {
    const results = [];
    let title = 'Currency Data';
    
    // Look for exchange rate patterns
    const exchangeRatePattern1 = /(\w+)\s*(\d{4}):\s*(\d+)\s*(\w{3})\s*=\s*([0-9.]+)\s*(\w{3})/g;
    const exchangeRatePattern2 = /(\d+)\s*(\w{3})\s*=\s*([0-9.]+)\s*(\w{3})/g;
    
    let match;
    
    // Extract month-based exchange rates (January 2023: 1 USD = 0.95 EUR)
    while ((match = exchangeRatePattern1.exec(text)) !== null) {
      const [, month, year, amount1, currency1, amount2, currency2] = match;
      results.push({
        name: `${month} ${currency1}-${currency2}`,
        value: parseFloat(amount2),
        month,
        year,
        fromCurrency: currency1,
        toCurrency: currency2,
        originalAmount: parseFloat(amount1)
      });
      
      // Update title if we found month-based data
      title = `${month} ${year} Exchange Rates`;
    }
    
    // Reset the regex state
    exchangeRatePattern1.lastIndex = 0;
    
    // If we didn't find month-based rates, try generic exchange rates (1 USD = 0.95 EUR)
    if (results.length === 0) {
      while ((match = exchangeRatePattern2.exec(text)) !== null) {
        const [, amount1, currency1, amount2, currency2] = match;
        results.push({
          name: `${currency1} to ${currency2}`,
          value: parseFloat(amount2),
          fromCurrency: currency1,
          toCurrency: currency2,
          originalAmount: parseFloat(amount1)
        });
        
        title = 'Currency Exchange Rates';
      }
    }
    
    // If still no results, look for currency values
    if (results.length === 0) {
      const currencyValuePattern = /([\w\s]+):\s*([€$£¥])\s*([0-9.]+)|([€$£¥])\s*([0-9.]+)\s*([\w\s]+)/g;
      
      while ((match = currencyValuePattern.exec(text)) !== null) {
        if (match[1]) { // First pattern match
          results.push({
            name: match[1].trim(),
            value: parseFloat(match[3]),
            currency: match[2]
          });
        } else { // Second pattern match
          results.push({
            name: match[6].trim(),
            value: parseFloat(match[5]),
            currency: match[4]
          });
        }
      }
    }
    
    // Special case for the format in the screenshot
    if (results.length === 0 && text.includes('USD') && 
        (text.includes('January') || text.includes('July')) && 
        (text.includes('EUR') || text.includes('CAD') || text.includes('JPY'))) {
      
      // Try to match patterns like "January 2023: 1 USD = 0.95 EUR, 1.12 CAD, 120 JPY"
      const months = ['January', 'July'];
      const currencies = ['EUR', 'CAD', 'JPY'];
      
      months.forEach(month => {
        currencies.forEach(currency => {
          const pattern = new RegExp(`${month}[^:]*?:.*?USD\\s*=\\s*([0-9.]+)\\s*${currency}`, 'i');
          const match = text.match(pattern);
          
          if (match) {
            results.push({
              name: `${month} USD-${currency}`,
              value: parseFloat(match[1]),
              month,
              currency
            });
          }
        });
      });
      
      if (results.length > 0) {
        title = 'USD Exchange Rates';
      }
    }
    
    return {
      data: results.length > 0 ? results : generateSampleData('No currency data found').data,
      title,
      source: 'currency data'
    };
  }
  
  /**
   * Check if the text contains time-based data
   */
  function containsTimeData(text) {
    const timePatterns = [
      /January|February|March|April|May|June|July|August|September|October|November|December/i,
      /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i,
      /\b20\d\d\b/,  // Years like 2023
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,  // Dates like 01/31/2023
      /\b\d{4}-\d{2}-\d{2}\b/,  // ISO dates like 2023-01-31
      /\bQ[1-4]\b/i,  // Quarters like Q1, Q2
      /\bquarter \d\b/i  // "Quarter 1"
    ];
    
    return timePatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Extract time-based data from text
   */
  function extractTimeData(text) {
    const results = [];
    let title = 'Time Series Data';
    
    // Map for month ordering
    const monthOrder = {
      'january': 1, 'jan': 1,
      'february': 2, 'feb': 2,
      'march': 3, 'mar': 3, 
      'april': 4, 'apr': 4,
      'may': 5,
      'june': 6, 'jun': 6,
      'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sep': 9,
      'october': 10, 'oct': 10,
      'november': 11, 'nov': 11,
      'december': 12, 'dec': 12
    };
    
    // Extract month-based data
    const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^:]*?:\s*([0-9.]+)/gi;
    
    let match;
    while ((match = monthPattern.exec(text)) !== null) {
      const month = match[1];
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        // Get the standardized month name and order
        const monthLower = month.toLowerCase();
        let monthName = month;
        let order = 0;
        
        for (const [key, val] of Object.entries(monthOrder)) {
          if (monthLower.startsWith(key)) {
            order = val;
            // Convert abbreviations to full month names if needed
            if (month.length <= 3) {
              monthName = key.charAt(0).toUpperCase() + key.slice(1);
            }
            break;
          }
        }
        
        results.push({
          name: monthName,
          value,
          order  // Used for sorting
        });
      }
    }
    
    // If we found month data, sort by month order and set appropriate title
    if (results.length > 0) {
      results.sort((a, b) => a.order - b.order);
      title = 'Monthly Data';
      
      // Try to determine what kind of monthly data this is
      if (text.toLowerCase().includes('temperature') || text.toLowerCase().includes('weather')) {
        title = 'Monthly Temperature Data';
      } else if (text.toLowerCase().includes('sales') || text.toLowerCase().includes('revenue')) {
        title = 'Monthly Sales Data';
      } else if (text.toLowerCase().includes('growth') || text.toLowerCase().includes('gdp')) {
        title = 'Monthly Growth Data';
      }
      
      return {
        data: results,
        title,
        source: 'time series data'
      };
    }
    
    // If no month data, try quarters
    const quarterPattern = /Q([1-4])[^:]*?:\s*([0-9.]+)|Quarter\s*([1-4])[^:]*?:\s*([0-9.]+)/gi;
    
    const quarterResults = [];
    while ((match = quarterPattern.exec(text)) !== null) {
      const quarter = match[1] || match[3];
      const value = parseFloat(match[2] || match[4]);
      
      if (!isNaN(value)) {
        quarterResults.push({
          name: `Q${quarter}`,
          value,
          order: parseInt(quarter)
        });
      }
    }
    
    if (quarterResults.length > 0) {
      quarterResults.sort((a, b) => a.order - b.order);
      return {
        data: quarterResults,
        title: 'Quarterly Data',
        source: 'time series data'
      };
    }
    
    // If no quarter data, try years
    const yearPattern = /(20\d\d)[^:]*?:\s*([0-9.]+)/g;
    
    const yearResults = [];
    while ((match = yearPattern.exec(text)) !== null) {
      const year = match[1];
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        yearResults.push({
          name: year,
          value,
          order: parseInt(year)
        });
      }
    }
    
    if (yearResults.length > 0) {
      yearResults.sort((a, b) => a.order - b.order);
      return {
        data: yearResults,
        title: 'Yearly Data',
        source: 'time series data'
      };
    }
    
    // If we couldn't find any time data, return sample data
    return generateSampleData('No time series data found');
  }
  
  /**
   * Check if the text contains percentage data
   */
  function containsPercentageData(text) {
    return text.includes('%') || /\d+(\.\d+)?\s*percent/i.test(text);
  }
  
  /**
   * Extract percentage data from text
   */
  function extractPercentageData(text) {
    const results = [];
    
    // Pattern for "Term: X%" or "Term (X%)"
    const percentPattern1 = /([\w\s]+?):\s*(\d+(?:\.\d+)?)\s*%/g;
    const percentPattern2 = /([\w\s]+?)\s*\((\d+(?:\.\d+)?)\s*%\)/g;
    
    let match;
    while ((match = percentPattern1.exec(text)) !== null) {
      const term = match[1].trim();
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        results.push({
          name: term,
          value,
          isPercentage: true
        });
      }
    }
    
    // Reset regex state
    percentPattern1.lastIndex = 0;
    
    while ((match = percentPattern2.exec(text)) !== null) {
      const term = match[1].trim();
      const value = parseFloat(match[2]);
      
      if (!isNaN(value)) {
        results.push({
          name: term,
          value,
          isPercentage: true
        });
      }
    }
    
    // Determine an appropriate title
    let title = 'Percentage Data';
    if (text.toLowerCase().includes('market') && text.toLowerCase().includes('share')) {
      title = 'Market Share';
    } else if (text.toLowerCase().includes('growth')) {
      title = 'Growth Percentages';
    } else if (text.toLowerCase().includes('distribution')) {
      title = 'Distribution Percentages';
    }
    
    return {
      data: results.length > 0 ? results : generateSampleData('No percentage data found').data,
      title,
      source: 'percentage data'
    };
  }
  
  /**
   * Check if the text contains bullet points
   */
  function containsBulletPoints(text) {
    return /^[ \t]*[-•*+][ \t]/m.test(text) || /^[ \t]*\d+\.[ \t]/m.test(text);
  }
  
  /**
   * Extract data from bullet points
   */
  function extractBulletPointData(text) {
    const results = [];
    
    // Split text into lines
    const lines = text.split('\n');
    
    // Patterns for different types of bullet points
    const bulletPatterns = [
      /^[ \t]*[-•*+][ \t]+(.*?):\s*(\d+(?:\.\d+)?)/,  // - Term: 123
      /^[ \t]*\d+\.[ \t]+(.*?):\s*(\d+(?:\.\d+)?)/    // 1. Term: 123
    ];
    
    for (const line of lines) {
      for (const pattern of bulletPatterns) {
        const match = line.match(pattern);
        if (match) {
          const term = match[1].trim();
          const value = parseFloat(match[2]);
          
          if (!isNaN(value)) {
            results.push({
              name: term,
              value
            });
          }
          
          break; // Move to next line after finding a match
        }
      }
    }
    
    return {
      data: results.length > 0 ? results : generateSampleData('No bullet point data found').data,
      title: 'Bullet Point Data',
      source: 'bullet points'
    };
  }
  
  /**
   * Extract data from general text
   */
  function extractGeneralTextData(text) {
    const results = [];
    
    // Pattern for "Term: Value" or "Term - Value"
    const keyValuePattern = /([^:\n-]+)[:-]\s*(\d+(?:\.\d+)?)/g;
    
    let match;
    while ((match = keyValuePattern.exec(text)) !== null) {
      const term = match[1].trim();
      const value = parseFloat(match[2]);
      
      // Skip very short terms that might not be meaningful
      if (term.length > 2 && !isNaN(value)) {
        results.push({
          name: term,
          value
        });
      }
    }
    
    // Try to extract numerically spelled words
    const wordNumberResults = extractWordNumbers(text);
    if (wordNumberResults.length > 0) {
      results.push(...wordNumberResults);
    }
    
    // If we found data, return it
    if (results.length > 0) {
      return {
        data: results,
        title: 'Extracted Data',
        source: 'text analysis'
      };
    }
    
    // Last resort: extract sentences with numbers
    const sentenceResults = extractSentenceNumbers(text);
    if (sentenceResults.length > 0) {
      return {
        data: sentenceResults,
        title: 'Text Analysis',
        source: 'sentence analysis'
      };
    }
    
    return generateSampleData('No data patterns found in text');
  }
  
  /**
   * Extract numbers written as words (e.g., "twenty-five")
   */
  function extractWordNumbers(text) {
    const results = [];
    const wordToNumber = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90
    };
    
    // Pattern for "Term: twenty-five" or "Term: twenty five"
    const wordNumberPattern = /([^:\n]+):\s*((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s](?:one|two|three|four|five|six|seven|eight|nine))?)/gi;
    
    let match;
    while ((match = wordNumberPattern.exec(text)) !== null) {
      const term = match[1].trim();
      const numberWord = match[2].toLowerCase();
      
      // Handle compound numbers (e.g., "twenty-five" or "twenty five")
      let value = 0;
      if (numberWord.includes('-') || numberWord.includes(' ')) {
        const parts = numberWord.split(/[-\s]+/);
        if (parts.length === 2 && wordToNumber[parts[0]] !== undefined && wordToNumber[parts[1]] !== undefined) {
          value = wordToNumber[parts[0]] + wordToNumber[parts[1]];
        }
      } else if (wordToNumber[numberWord] !== undefined) {
        value = wordToNumber[numberWord];
      }
      
      if (value > 0) {
        results.push({
          name: term,
          value
        });
      }
    }
    
    return results;
  }
  
  /**
   * Extract numeric values from sentences
   */
  function extractSentenceNumbers(text) {
    const results = [];
    
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      // Find numbers in the sentence
      const numbers = sentence.match(/\d+(?:\.\d+)?/g);
      if (numbers && numbers.length > 0) {
        const value = parseFloat(numbers[0]);
        if (!isNaN(value)) {
          // Create a shortened name from the sentence
          const words = sentence.trim().split(/\s+/);
          const name = words.length > 5 
            ? words.slice(0, 5).join(' ') + '...'
            : sentence.trim();
          
          results.push({
            name,
            value,
            fullText: sentence.trim()
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Generate sample data when no usable data is found
   */
  export function generateSampleData(message) {
    return {
      data: [
        { name: 'Sample A', value: 400 },
        { name: 'Sample B', value: 300 },
        { name: 'Sample C', value: 200 },
        { name: 'Sample D', value: 100 },
        { name: message, value: 50 }
      ],
      title: 'Sample Data',
      source: 'sample'
    };
  }
  
  /**
   * Get appropriate color scheme based on data source
   */

  export function getColorScheme(source) {
    switch (source) {
      case 'currency data':
        return ['#2E8B57', '#3CB371', '#66CDAA', '#8FBC8F', '#90EE90']; // Green palette
      case 'percentage data':
        return ['#4682B4', '#5F9EA0', '#6495ED', '#7B68EE', '#87CEFA']; // Blue palette
      case 'time series data':
        return ['#D2691E', '#CD853F', '#F4A460', '#DEB887', '#FFE4C4']; // Brown palette
      default:
        return ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe']; // Default palette
    }
  }