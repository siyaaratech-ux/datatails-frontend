import spacy
import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import threading
import numpy as np
from collections import Counter

# Lazy load NLP models (only when needed, cached)
_nlp = None
_model = None
_nlp_lock = threading.Lock()
_model_lock = threading.Lock()

def get_nlp():
    """Get or load spacy NLP model (cached)."""
    global _nlp
    if _nlp is not None:
        return _nlp
    with _nlp_lock:
        if _nlp is not None:
            return _nlp
        print("🔄 Loading spaCy model (first time only)...")
        _nlp = spacy.load("en_core_web_sm")
        print("✅ spaCy model loaded.")
        return _nlp

def get_model():
    """Get or load sentence transformer model (cached)."""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        print("🔄 Loading SentenceTransformer model (first time only)...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ SentenceTransformer model loaded.")
        return _model

# Initialize models on import (non-blocking)
def _init_models():
    """Initialize models in background thread."""
    def load():
        get_nlp()
        get_model()
    threading.Thread(target=load, daemon=True).start()

_init_models()

# Enhanced chart type descriptions with comprehensive use cases
chart_types = {
    "area_chart": "Visualizes cumulative quantitative data over continuous time periods. Shows trends with filled area emphasizing magnitude and progression. Ideal for time series data, growth metrics, revenue over time, cumulative values, and continuous measurements over time periods.",
    "bar_chart": "Compares discrete categories or rankings using rectangular bars. Perfect for comparing values across categories, showing rankings, contrasting discrete items, top N lists, survey results, and categorical data without time component.",
    "chord_diagram": "Visualizes complex relationships and flows between multiple entities or groups. Shows bidirectional connections, interactions, and relationships in a circular layout. Ideal for network flows, trade relationships, interconnected systems, migration patterns, and entity relationships.",
    "circle_packing": "Represents hierarchical data as nested circles where size represents value. Efficient for showing part-whole relationships in hierarchies. Good for organizational structures, file systems, nested categories, and hierarchical data with size attributes.",
    "connection_map": "Maps spatial or geographic relationships showing connections between locations. Visualizes routes, flows, or relationships between geographic points. Perfect for transportation networks, migration patterns, geographic connections, and location-based relationships.",
    "DAG": "Directed Acyclic Graph showing dependencies, workflows, or sequential processes. Ideal for process flows, task dependencies, project timelines, hierarchical processes with direction, workflow visualization, and dependency mapping.",
    "donut_chart": "Shows part-to-whole relationships using a circular chart with central hole. Perfect for proportional data, percentage distributions, market shares, budget allocations, category breakdowns, demographic splits, and composition analysis.",
    "heatmap_chart": "Displays data intensity using color gradients in a matrix format. Best for correlation matrices, multi-dimensional categorical data, showing patterns across two dimensions, identifying clusters, intensity mapping, and pattern recognition.",
    "line_chart": "Shows trends and changes over continuous time or sequential data. Perfect for time series, trends, progressions, comparing multiple series over time, continuous data visualization, stock prices, and performance metrics over time.",
    "mosaic_plot": "Visualizes relationships between multiple categorical variables using proportional rectangles. Good for contingency tables, cross-tabulations, multi-category relationships, categorical correlations, and showing interactions between categories.",
    "network_graph": "Illustrates complex networks with nodes and edges showing connections. Best for social networks, influence networks, organizational charts, interconnected systems, relationship mapping, and showing centrality and clustering.",
    "polar_area": "Represents data in polar coordinates with radial segments. Good for cyclic data, seasonal patterns, comparing multiple quantitative variables in circular layout, periodic data, and radial comparisons.",
    "small_multiples": "Displays multiple similar charts side-by-side for comparison. Facilitates comparing patterns across categories, time periods, or groups. Excellent for comparative analysis across dimensions, faceted views, and multi-category comparisons.",
    "stacked_area_chart": "Shows part-to-whole relationships changing over time with stacked filled areas. Displays composition changes while maintaining total perspective. Good for multi-category time series, composition over time, and cumulative breakdowns.",
    "sunburst_chart": "Depicts hierarchical data as concentric rings. Excellent for multi-level hierarchies, nested categories, drill-down data, showing depth and breadth of hierarchical structures, and organizational hierarchies.",
    "tree_diagram": "Shows hierarchical relationships in tree structure with nodes and branches. Clearly displays parent-child relationships, organizational structures, taxonomies, decision trees, and clear hierarchy visualization.",
    "treemap_chart": "Visualizes hierarchical data as nested rectangles where size represents value. Efficient for large hierarchies and showing quantity relationships. Good for file systems, budgets, organizational data, and hierarchical size comparisons.",
    "voronoi_map": "Divides space into regions based on proximity to points. Useful for territory analysis, service areas, spatial partitioning, proximity analysis, coverage areas, and dominance regions.",
    "word_cloud": "Visualizes word frequency as sized words in a cloud layout. Great for text analysis, key themes, popular terms, sentiment analysis, keyword extraction, and text-heavy data visualization."
}

# Chart type keywords for better matching (comprehensive keyword sets)
chart_keywords = {
    "area_chart": ["trend", "growth", "over time", "cumulative", "increase", "decrease", "progression", "continuous", "time series", "evolution", "trajectory", "historical"],
    "bar_chart": ["compare", "comparison", "versus", "ranking", "top", "best", "worst", "category", "different", "contrast", "relative", "rank"],
    "chord_diagram": ["relationship", "connection", "flow", "interaction", "between", "network", "exchange", "transfer", "link", "associate"],
    "circle_packing": ["hierarchy", "nested", "contains", "part of", "within", "organization", "structure", "grouped"],
    "connection_map": ["geographic", "location", "map", "route", "distance", "between places", "spatial", "geographic connection"],
    "DAG": ["process", "workflow", "step", "sequence", "dependency", "before", "after", "requires", "depends on", "pipeline"],
    "donut_chart": ["percentage", "proportion", "share", "breakdown", "distribution", "composition", "part of whole", "market share", "allocation", "split"],
    "heatmap_chart": ["correlation", "pattern", "intensity", "matrix", "relationship between", "multi-dimensional", "cluster", "density"],
    "line_chart": ["trend", "change", "over time", "fluctuation", "variation", "pattern", "progress", "historical"],
    "mosaic_plot": ["categorical", "contingency", "cross-tabulation", "relationship between categories", "multi-category"],
    "network_graph": ["network", "connection", "link", "influence", "relationship", "graph", "connected", "social"],
    "polar_area": ["cyclic", "seasonal", "periodic", "radial", "circular", "rotation", "angle"],
    "small_multiples": ["compare", "multiple", "side by side", "faceted", "across", "comparison", "parallel"],
    "stacked_area_chart": ["composition", "breakdown", "over time", "cumulative", "parts", "changing", "evolution"],
    "sunburst_chart": ["hierarchy", "nested", "layers", "levels", "drill down", "multi-level", "concentric"],
    "tree_diagram": ["hierarchy", "tree", "parent", "child", "structure", "organization", "taxonomy", "branch"],
    "treemap_chart": ["hierarchy", "nested", "size", "quantity", "proportion", "rectangle", "hierarchical size"],
    "voronoi_map": ["proximity", "territory", "region", "distance", "coverage", "area", "partition"],
    "word_cloud": ["text", "word", "frequency", "common", "theme", "keyword", "terms", "language"]
}

# Precompute chart category embeddings (lazy loaded)
_category_embeddings = None

def get_category_embeddings():
    """Get or compute category embeddings (cached)."""
    global _category_embeddings
    if _category_embeddings is not None:
        return _category_embeddings
    model = get_model()
    _category_embeddings = {
    chart: model.encode(description, normalize_embeddings=True)
    for chart, description in chart_types.items()
}
    return _category_embeddings


# Comprehensive feature extraction with multi-level analysis
def extract_features(query, response):
    """Extracts comprehensive features from query-response pair with enhanced detection."""
    combined_text = query + " " + response
    nlp_model = get_nlp()
    doc = nlp_model(combined_text)
    query_doc = nlp_model(query)
    response_doc = nlp_model(response)
    
    # Basic numerical and location features
    numbers = [token.text for token in doc if token.like_num]
    locations = [ent.text for ent in doc.ents if ent.label_ in {"GPE", "LOC"}]
    
    # Enhanced keyword detection with expanded categories
    trend_keywords = {
        "increase", "decline", "growth", "rise", "drop", "trend", "fall", "reduce", 
        "expansion", "fluctuation", "progression", "evolution", "trajectory", 
        "historical", "over time", "increased", "decreased", "grew", "fell", 
        "risen", "trending", "change", "changes", "variation", "shift", "movement",
        "improve", "worsen", "spike", "plunge", "surge", "peak", "valley", "upward", "downward"
    }
    
    relationship_keywords = {
        "prefer", "dominate", "compared", "versus", "majority", "minority", 
        "correlation", "causation", "influence", "impact", "affect", "between", 
        "connection", "network", "interaction", "collaboration", "flow", "transfer", 
        "connected", "linked", "relation", "mapping", "connect", "link", 
        "association", "interact", "related", "depends", "influence", "affect"
    }
    
    hierarchy_keywords = {
        "structure", "hierarchy", "nested", "parent", "child", "tree", "branch", 
        "root", "descendant", "ancestor", "organization", "breakdown", "composition", 
        "contains", "hierarchical", "level", "tier", "layer", "subordinate", 
        "superordinate", "category", "subcategory", "classification", "taxonomy", 
        "class", "subclass", "group", "subgroup"
    }
    
    part_to_whole_keywords = {
        "percentage", "proportion", "fraction", "share", "allocation", "distribution", 
        "segment", "portion", "division", "makeup", "composition", "constituent", 
        "breakdown", "ratio", "percent", "split", "divided", "parts", "pieces", 
        "sections", "components", "pie", "slice", "segment", "partition", 
        "make up", "comprises", "consists of", "account for", "represents"
    }
    
    comparison_keywords = {
        "versus", "against", "compare", "contrast", "difference", "similarity", 
        "benchmark", "outperform", "underperform", "rank", "exceed", "more than", 
        "less than", "higher", "lower", "better", "worse", "comparison", 
        "relative", "compared to", "vs", "different", "same", "similar"
    }
    
    temporal_keywords = {
        "time", "date", "year", "month", "week", "day", "hour", "period", 
        "timeline", "duration", "interval", "frequency", "schedule", "chronological",
        "seasonal", "quarterly", "annually", "daily", "weekly", "monthly"
    }
    
    # Extract lemmatized keywords for each category
    doc_tokens = {token.lemma_.lower() for token in doc}
    query_tokens = {token.lemma_.lower() for token in query_doc}
    response_tokens = {token.lemma_.lower() for token in response_doc}
    
    trends = [token for token in doc_tokens if token in trend_keywords]
    relationships = [token for token in doc_tokens if token in relationship_keywords]
    hierarchies = [token for token in doc_tokens if token in hierarchy_keywords]
    part_to_whole = [token for token in doc_tokens if token in part_to_whole_keywords]
    comparisons = [token for token in doc_tokens if token in comparison_keywords]
    temporal = [token for token in doc_tokens if token in temporal_keywords]
    
    # Enhanced temporal detection
    date_entities = [ent for ent in doc.ents if ent.label_ == "DATE"]
    time_entities = [ent for ent in doc.ents if ent.label_ == "TIME"]
    has_time_series = len(date_entities) > 0 or len(time_entities) > 0 or len(temporal) > 2
    has_multiple_dates = len(date_entities) > 1
    
    # Enhanced temporal pattern detection
    temporal_patterns = re.findall(r'\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(january|february|march|april|may|june|july|august|september|october|november|december)', combined_text.lower())
    has_temporal_patterns = len(temporal_patterns) > 1
    
    # Multi-dimensional detection
    multi_dimensional = ("by" in [token.text.lower() for token in doc] and len(numbers) > 5) or \
                       (re.search(r'\w+\s+by\s+\w+', combined_text.lower()) is not None)
    
    # Distribution patterns
    distribution_keywords = {"distribution", "frequency", "spread", "range", "variance", "outlier", "cluster"}
    has_distribution = any(token in doc_tokens for token in distribution_keywords)
    
    # Enhanced categorical detection
    categories_count = len([ent for ent in doc.ents if ent.label_ in {"ORG", "PRODUCT", "PERSON", "EVENT"}])
    has_categories = categories_count > 2 or len([token for token in doc if token.pos_ == "PROPN"]) > 3
    
    # Enhanced percentage detection
    percentage_indicators = len([token for token in doc if token.text == "%"])
    percentage_indicators += len(re.findall(r'\d+%', combined_text))
    percentage_indicators += len(re.findall(r'\d+\s*percent', combined_text.lower()))
    
    # Proportion phrase detection
    proportion_phrases = len(re.findall(r'(account|make|constitute|represent)s?\s+(for|up)\s+\d+%', combined_text.lower()))
    proportion_phrases += len(re.findall(r'\d+%\s+(of|from|in)', combined_text.lower()))
    
    # Enhanced percentage sum detection
    percentage_values = []
    for match in re.finditer(r'(\d+(?:\.\d+)?)\s*%', combined_text):
        try:
            percentage_values.append(float(match.group(1)))
        except:
            pass
    
    sum_to_whole = False
    if percentage_indicators > 2 and len(percentage_values) > 2:
        percentage_sum = sum(num for num in percentage_values if num <= 100)
        sum_to_whole = 95 <= percentage_sum <= 105
    
    # Query intent detection
    query_lower = query.lower()
    is_question = query.strip().endswith('?')
    is_what_question = query_lower.startswith('what')
    is_how_question = query_lower.startswith('how')
    is_which_question = query_lower.startswith('which')
    is_show_request = "show" in query_lower or "visualize" in query_lower or "display" in query_lower
    
    # List/enumeration detection
    list_indicators = response.count('\n-') + response.count('\n•') + response.count('\n*')
    numbered_list = len(re.findall(r'^\d+[.)]\s+', response, re.MULTILINE))
    has_list_structure = list_indicators > 2 or numbered_list > 2
    
    # Comparison structure detection
    comparison_structure = len(re.findall(r'\bvs\b|\bversus\b|\bcompared\s+to\b|\bcompared\s+with\b', combined_text.lower())) > 0
    
    # Text density analysis
    word_count = len([token for token in doc if token.is_alpha])
    unique_words = len(set(token.lemma_.lower() for token in doc if token.is_alpha))
    is_text_heavy = word_count > 50 and unique_words / max(word_count, 1) > 0.5
    
    # Geographic indicators
    geographic_indicators = len(locations) > 0 or any(word in query_lower for word in ["map", "geographic", "location", "country", "city", "region"])
    
    # Process/workflow indicators
    process_indicators = any(word in doc_tokens for word in ["process", "workflow", "step", "sequence", "procedure", "pipeline", "stage"])
    
    return {
        "numbers": numbers,
        "locations": locations,
        "trends": trends,
        "relationships": relationships,
        "hierarchies": hierarchies,
        "part_to_whole": part_to_whole,
        "comparisons": comparisons,
        "temporal": temporal,
        "has_time_series": has_time_series or has_temporal_patterns,
        "has_multiple_dates": has_multiple_dates or has_temporal_patterns,
        "multi_dimensional": multi_dimensional,
        "has_distribution": has_distribution,
        "has_categories": has_categories,
        "location_count": len(locations),
        "is_text_heavy": is_text_heavy,
        "percentage_indicators": percentage_indicators,
        "proportion_phrases": proportion_phrases,
        "sum_to_whole": sum_to_whole,
        "is_question": is_question,
        "is_what_question": is_what_question,
        "is_how_question": is_how_question,
        "is_which_question": is_which_question,
        "is_show_request": is_show_request,
        "has_list_structure": has_list_structure,
        "comparison_structure": comparison_structure,
        "geographic_indicators": geographic_indicators,
        "process_indicators": process_indicators,
        "query_length": len(query.split()),
        "response_length": len(response.split()),
        "number_count": len(numbers),
        "category_count": categories_count,
        "trend_count": len(trends),
        "relationship_count": len(relationships),
        "hierarchy_count": len(hierarchies),
        "part_to_whole_count": len(part_to_whole),
        "comparison_count": len(comparisons)
    }


# Enhanced data structure analysis
def analyze_data_structure(response):
    """Analyzes potential data structure in the response with improved detection."""
    nlp_model = get_nlp()
    doc = nlp_model(response)
    
    # Enhanced tabular detection
    rows = response.split('\n')
    has_table = False
    if len(rows) > 3:
        pipe_count = [row.count('|') for row in rows[:10]]
        consistent_pipes = len(set(pipe_count)) == 1 and pipe_count[0] > 1
        
        comma_count = [row.count(',') for row in rows[:10] if row.strip()]
        consistent_commas = len(set(comma_count)) == 1 and comma_count[0] > 2
        
        tab_count = [row.count('\t') for row in rows[:10]]
        consistent_tabs = len(set(tab_count)) == 1 and tab_count[0] > 0
        
        has_table = consistent_pipes or consistent_commas or consistent_tabs
    
    # Enhanced list detection
    bullet_patterns = response.count('\n-') + response.count('\n•') + response.count('\n*')
    numbered_patterns = len(re.findall(r'^\d+[.)]\s+', response, re.MULTILINE))
    has_lists = bullet_patterns > 3 or numbered_patterns > 3
    
    # Enhanced hierarchical structure detection
    indentation_pattern = [len(line) - len(line.lstrip()) for line in rows if line.strip()]
    has_hierarchy = False
    if len(indentation_pattern) > 3:
        unique_indents = len(set(indentation_pattern))
        max_indent = max(indentation_pattern) if indentation_pattern else 0
        has_hierarchy = unique_indents > 2 and max_indent > 4
    
    # Enhanced time series detection
    date_entities = [ent for ent in doc.ents if ent.label_ == "DATE"]
    time_entities = [ent for ent in doc.ents if ent.label_ == "TIME"]
    has_dated_sequence = len(date_entities) > 2 or len(time_entities) > 1
    
    # Enhanced categorical detection
    category_entities = [ent for ent in doc.ents if ent.label_ in ["ORG", "PRODUCT", "GPE", "PERSON", "EVENT"]]
    category_sentences = [sent for sent in doc.sents if any(ent.label_ in ["ORG", "PRODUCT", "GPE"] for ent in sent.ents)]
    has_categories = len(category_entities) > 3 or len(category_sentences) > 2
    
    # Key-value pair detection
    key_value_pattern = re.findall(r'(\w+):\s*([^\n]+)', response)
    has_key_value = len(key_value_pattern) > 3
    
    return {
        "has_table": has_table,
        "has_lists": has_lists,
        "has_hierarchy": has_hierarchy,
        "has_dated_sequence": has_dated_sequence,
        "has_categories": has_categories,
        "has_key_value": has_key_value
    }


# Multi-signal scoring system (optimized - single embedding for speed)
def compute_semantic_scores(query, response):
    """Compute semantic similarity scores using embeddings (optimized for speed)."""
    try:
        model_instance = get_model()
        category_embeddings = get_category_embeddings()
        
        # Single combined embedding (faster than computing 3 separate embeddings)
        combined_text = query + " " + response
        # Limit text length for faster encoding
        if len(combined_text) > 1000:
            combined_text = combined_text[:1000]
        
        combined_embedding = model_instance.encode(combined_text, normalize_embeddings=True, show_progress_bar=False)
        
        # Compute scores (single pass)
        ensemble_scores = {}
        for chart, emb in category_embeddings.items():
            similarity = cosine_similarity([combined_embedding], [emb]).flatten()[0]
            ensemble_scores[chart] = float(similarity)
        
        return ensemble_scores
    except Exception as e:
        print(f"⚠️ Warning: Semantic scoring failed, using keyword-only: {e}")
        # Fallback to keyword-only scoring if embedding fails
        return {chart: 0.0 for chart in chart_types.keys()}


# Keyword-based scoring
def compute_keyword_scores(query, response):
    """Compute scores based on keyword matching."""
    combined_text = (query + " " + response).lower()
    scores = {chart: 0.0 for chart in chart_types.keys()}
    
    for chart, keywords in chart_keywords.items():
        matches = sum(1 for keyword in keywords if keyword in combined_text)
        if matches > 0:
            scores[chart] = min(matches / len(keywords) * 2.0, 1.0)  # Normalize
    
    return scores


# Enhanced score boosting with weighted features
def boost_scores(scores, features):
    """Enhances scores with sophisticated boosting based on features."""
    
    # Time series boost (strong signal)
    if features["has_time_series"]:
        if features["has_multiple_dates"]:
            scores["line_chart"] += 0.8
            scores["area_chart"] += 0.7
            scores["stacked_area_chart"] += 0.6
        else:
            scores["line_chart"] += 0.5
            scores["area_chart"] += 0.4
    
    # Trend keywords boost
    if features["trend_count"] > 1:
        scores["line_chart"] += 0.4
        scores["area_chart"] += 0.3
    
    # Relationship/Network boost (enhanced)
    if features["relationship_count"] > 2:
        scores["network_graph"] += 1.2
        scores["chord_diagram"] += 1.0
        scores["DAG"] += 0.8
    elif features["relationship_count"] > 0:
        scores["network_graph"] += 0.6
        scores["chord_diagram"] += 0.5
        
    # Hierarchy boost (enhanced)
    if features["hierarchy_count"] > 2:
        scores["treemap_chart"] += 1.2
        scores["sunburst_chart"] += 1.0
        scores["circle_packing"] += 0.8
        scores["tree_diagram"] += 0.7
    elif features["hierarchy_count"] > 0:
        scores["treemap_chart"] += 0.6
        scores["sunburst_chart"] += 0.5
        
    # Part-to-whole boost (stronger and more nuanced)
    if features["sum_to_whole"]:
        scores["donut_chart"] += 1.5
        scores["treemap_chart"] += 0.8
    elif features["percentage_indicators"] >= 3:
        scores["donut_chart"] += 1.0
        if not features["has_time_series"]:
            scores["donut_chart"] += 0.4
    elif features["percentage_indicators"] > 0:
        scores["donut_chart"] += 0.6
    
    if features["proportion_phrases"] > 0:
        scores["donut_chart"] += 0.7
    
    if features["part_to_whole_count"] >= 3:
        scores["donut_chart"] += 1.2
        if not features["has_time_series"]:
            scores["donut_chart"] += 0.5
    elif features["part_to_whole_count"] > 0:
        scores["donut_chart"] += 0.6
    
    # Geographic boost
    if features["geographic_indicators"]:
        if features["location_count"] > 3:
            scores["connection_map"] += 1.2
            scores["voronoi_map"] += 0.8
        elif features["location_count"] > 0:
            scores["connection_map"] += 0.7
        
    # Comparison boost (enhanced)
    if features["comparison_structure"] or (features["comparison_count"] > 1 and features["has_categories"]):
        scores["bar_chart"] += 0.8
        scores["small_multiples"] += 1.0
        scores["mosaic_plot"] += 0.7
    
    # Multi-dimensional boost
    if features["multi_dimensional"]:
        scores["heatmap_chart"] += 1.2
        scores["small_multiples"] += 0.8
        
    # Distribution boost
    if features["has_distribution"]:
        scores["heatmap_chart"] += 0.8
        
    # Text-heavy boost
    if features["is_text_heavy"]:
        scores["word_cloud"] += 1.0
    
    # Process/workflow boost
    if features["process_indicators"]:
        scores["DAG"] += 1.0
        scores["tree_diagram"] += 0.6
    
    # List structure boost
    if features["has_list_structure"]:
        if features["has_categories"]:
            scores["bar_chart"] += 0.5
        if features["has_hierarchy"]:
            scores["treemap_chart"] += 0.4
    
    # Time series with part-to-whole
    if features["has_time_series"] and features["part_to_whole_count"] > 0:
        scores["stacked_area_chart"] += 0.9
    
    # Categories with multi-dimensional
    if features["has_categories"] and features["multi_dimensional"]:
        scores["heatmap_chart"] += 0.8
        scores["small_multiples"] += 0.7
        
    return scores


# Enhanced context-aware recommendations
def context_aware_recommendations(query, response, features, similarity_scores):
    """Enhances recommendations based on query intent and context patterns."""
    
    query_lower = query.lower()
    response_lower = response.lower()
    
    # Direct visualization requests (strong signal)
    if "show hierarchy" in query_lower or "hierarchical" in query_lower or "hierarchy" in response_lower:
        similarity_scores["treemap_chart"] += 1.0
        similarity_scores["sunburst_chart"] += 0.9
        similarity_scores["tree_diagram"] += 0.8
        similarity_scores["circle_packing"] += 0.7
        
    if "show network" in query_lower or "connections between" in query_lower or "network" in response_lower:
        similarity_scores["network_graph"] += 1.2
        similarity_scores["chord_diagram"] += 0.9
        
    if "over time" in query_lower or ("trend" in query_lower and features["has_time_series"]):
        similarity_scores["line_chart"] += 0.8
        similarity_scores["area_chart"] += 0.7
        
    if "map" in query_lower or "geographic" in query_lower:
        similarity_scores["connection_map"] += 1.0
        similarity_scores["voronoi_map"] += 0.6
        
    if "comparison" in query_lower or "compare" in query_lower or features["comparison_structure"]:
        similarity_scores["bar_chart"] += 0.7
        similarity_scores["small_multiples"] += 1.0

    # Enhanced distribution/proportion detection
    distribution_patterns = [
        r"what\s+is\s+the\s+breakdown",
        r"how\s+is\s+.*\s+distributed",
        r"what\s+percentage",
        r"what\s+proportion",
        r"what\s+is\s+the\s+split",
        r"show\s+.*\s+distribution",
        r"pie\s+chart",
        r"donut\s+chart",
        r"composition\s+of",
        r"makeup\s+of",
        r"share\s+of"
    ]
    
    for pattern in distribution_patterns:
        if re.search(pattern, query_lower):
            similarity_scores["donut_chart"] += 1.0
    
    # Market share, budget, demographic patterns
    if any(term in query_lower for term in ["market share", "budget allocation", "demographic", "voter", "spending"]):
        if not features["has_time_series"]:
            similarity_scores["donut_chart"] += 0.9
    
    # "Top N" patterns
    top_pattern = re.search(r"top\s+\d+", query_lower)
    if top_pattern:
        if "category" in query_lower or "segment" in query_lower:
            similarity_scores["donut_chart"] += 0.7
        else:
            similarity_scores["bar_chart"] += 0.6
    
    # Question type analysis
    if features["is_what_question"]:
        if "percentage" in query_lower or "proportion" in query_lower:
            similarity_scores["donut_chart"] += 0.8
        elif "trend" in query_lower:
            similarity_scores["line_chart"] += 0.7
    
    if features["is_how_question"]:
        if "change" in query_lower or "varied" in query_lower:
            similarity_scores["line_chart"] += 0.6
    
    if features["is_which_question"]:
        similarity_scores["bar_chart"] += 0.5
        
    return similarity_scores


# Returns contextual description
def get_chart_description(chart_type, features):
    """Provides explanatory descriptions of chart recommendations."""
    
    descriptions = {
        "area_chart": "Recommended for showing continuous data trends over time with emphasis on magnitude.",
        "bar_chart": "Ideal for comparing discrete categories or showing rankings.",
        "chord_diagram": "Best for showing complex relationships and interactions between groups.",
        "circle_packing": "Excellent for displaying hierarchical data with size relationships.",
        "connection_map": "Perfect for geographic data showing relationships between locations.",
        "DAG": "Ideal for visualizing directed processes, workflows, or dependencies.",
        "donut_chart": "Perfect for showing part-to-whole relationships and proportional data.",
        "heatmap_chart": "Best for showing patterns in multi-dimensional categorical data.",
        "line_chart": "Excellent for time series data and continuous trends.",
        "mosaic_plot": "Useful for showing relationships between multiple categorical variables.",
        "network_graph": "Ideal for visualizing complex interconnected relationships.",
        "polar_area": "Good for cyclic data or comparing multiple quantitative variables.",
        "small_multiples": "Perfect for comparing patterns across different categories or groups.",
        "stacked_area_chart": "Best for showing part-to-whole relationships changing over time.",
        "sunburst_chart": "Excellent for multi-level hierarchical data with nesting.",
        "tree_diagram": "Ideal for displaying hierarchical relationships with clear parent-child structure.",
        "treemap_chart": "Best for hierarchical data where size represents quantity.",
        "voronoi_map": "Good for spatial partitioning and proximity analysis.",
        "word_cloud": "Perfect for showing frequency in text data and key themes."
    }
    
    return descriptions.get(chart_type, "Visualization type")


# Main recommendation function with diversity and accuracy
def recommend_visualizations(query, response):
    """Recommends top 3 visualizations + word cloud (always 4th) with enhanced accuracy and diversity."""
    
    # Extract features
    features = extract_features(query, response)
    data_structure = analyze_data_structure(response)
    features.update(data_structure)
    
    # Compute multiple scoring signals
    semantic_scores = compute_semantic_scores(query, response)
    keyword_scores = compute_keyword_scores(query, response)

    # Combine scores with weights
    base_scores = {}
    for chart in chart_types.keys():
        base_scores[chart] = (
            semantic_scores[chart] * 0.7 +  # Semantic similarity is primary
            keyword_scores[chart] * 0.3      # Keywords provide additional signal
        )

    # Apply feature-based boosts
    boosted_scores = boost_scores(base_scores.copy(), features)
    
    # Apply context-aware recommendations
    final_scores = context_aware_recommendations(query, response, features, boosted_scores)

    # Define chart categories for diversity
    chart_categories = {
        "time_series": ["line_chart", "area_chart", "stacked_area_chart"],
        "hierarchical": ["treemap_chart", "sunburst_chart", "circle_packing", "tree_diagram"],
        "relational": ["network_graph", "chord_diagram", "DAG"],
        "comparison": ["bar_chart", "small_multiples", "mosaic_plot"],
        "geographic": ["connection_map", "voronoi_map"],
        "distribution": ["heatmap_chart"],
        "proportion": ["donut_chart"],
        "text": ["word_cloud"],
        "polar": ["polar_area"]
    }
    
    # Create ranked list
    ranked_charts = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Select top 3 diverse recommendations (excluding word_cloud)
    recommendations = []
    used_categories = set()
    word_cloud_score = final_scores.get("word_cloud", 0.5)
    
    # Always include top chart
    top_chart, top_score = ranked_charts[0]
    if top_chart != "word_cloud":
        recommendations.append((top_chart, top_score))
        # Find category
    for category, charts in chart_categories.items():
        if top_chart in charts:
            used_categories.add(category)
            break
    
    # Add diverse recommendations
    for chart, score in ranked_charts[1:]:
        if len(recommendations) >= 3:
            break
        if chart == "word_cloud":
            continue
            
        # Find category
        chart_category = None
        for category, charts in chart_categories.items():
            if chart in charts:
                chart_category = category
                break
                
        # Add if different category or high score
        if chart_category not in used_categories or score > 0.7:
            recommendations.append((chart, score))
            if chart_category:
                used_categories.add(chart_category)
    
    # Ensure we have 3 recommendations (fill with high-scoring if needed)
    while len(recommendations) < 3:
        for chart, score in ranked_charts:
            if chart != "word_cloud" and chart not in [r[0] for r in recommendations]:
                recommendations.append((chart, score))
                break
    
    # Always add word_cloud as 4th recommendation
    recommendations.append(("word_cloud", word_cloud_score))
    
    # Normalize scores (0-1 scale)
    if len(recommendations) > 0:
        max_score = max(score for _, score in recommendations)
        min_score = min(score for _, score in recommendations)
    
        if max_score - min_score > 0:
            normalized = []
            for chart, score in recommendations:
                normalized_score = round((score - min_score) / (max_score - min_score), 2)
                normalized.append((chart, normalized_score))
            return normalized
    
    return [(chart, round(score, 2)) for chart, score in recommendations]


# Cache for recent recommendations (simple LRU cache)
_recommendation_cache = {}
_cache_max_size = 50

def _get_cache_key(query, response):
    """Generate cache key from query and response."""
    # Use first 200 chars of each for cache key
    q_key = query[:200] if len(query) > 200 else query
    r_key = str(response)[:200] if len(str(response)) > 200 else str(response)
    return f"{hash(q_key)}_{hash(r_key)}"

# Main function
def getViz(user_query, response):
    """Main function to recommend visualizations with enhanced accuracy."""
    
    # Check cache first
    cache_key = _get_cache_key(user_query, response)
    if cache_key in _recommendation_cache:
        return _recommendation_cache[cache_key]
    
    # Limit response length for faster processing
    if len(str(response)) > 2000:
        response = str(response)[:2000] + "..."
    
    # Extract features (simplified for speed)
    features = extract_features(user_query, response)
    data_structure = analyze_data_structure(response)
    features.update(data_structure)
    
    # Get recommendations
    recommended_charts = recommend_visualizations(user_query, response)
    
    # Cache the result
    if len(_recommendation_cache) >= _cache_max_size:
        # Remove oldest entry (simple FIFO)
        _recommendation_cache.pop(next(iter(_recommendation_cache)))
    _recommendation_cache[cache_key] = recommended_charts
    
    # Log recommendations (only in debug mode)
    # for chart, score in recommended_charts:
    #     description = get_chart_description(chart, features)
    #     print(f"{chart}: {score:.2f} - {description}")

    return recommended_charts
