import json
import os
import rdflib
import csv
import re
import time
from collections import deque, defaultdict
from rdflib import Graph, Namespace, Literal, URIRef
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from groq import Groq, AuthenticationError
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from functools import lru_cache
import threading

# Load environment variables
load_dotenv()

# Global cache for KG data (loaded once, reused)
_kg_json_cache = None
_kg_ttl_cache = None
_adjacency_list_cache = None
_cache_lock = threading.Lock()
_cache_loaded = False

# ✅ Initialize Groq Client from environment
# Reads GROQ_API_KEY from environment. Do not hardcode secrets.
def get_groq_client():
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("❌ GROQ_API_KEY environment variable is not set")
        return None
    try:
        return Groq(api_key=api_key)
    except Exception as e:
        print(f"❌ Error initializing Groq client: {str(e)}")
        return None

# ✅ CSV File for Conversation History
csv_file_path = "conversation_history.csv"
conversation_history = []

# ✅ Define RDF Namespaces
SIOC = Namespace("http://rdfs.org/sioc/ns#")
DCMI = Namespace("http://purl.org/dc/elements/1.1/")
FOAF = Namespace("http://xmlns.com/foaf/0.1/")
REDDIT = Namespace("http://reddit.com/ns#")

# ✅ NLP Preprocessing
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))


def preprocess_text(text):
    """Extracts meaningful words from text."""
    if not isinstance(text, str):
        return []

    text = re.sub(r'[^\w\s]', '', text)
    tokens = word_tokenize(text.lower())
    return [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words and len(word) > 2]


# ✅ Load KG.json for Fast Lookups (with caching)
def load_kg_json(file_path):
    """Loads KG.json and converts it into a dictionary for fast lookup. Uses caching."""
    global _kg_json_cache, _cache_loaded
    
    if _kg_json_cache is not None:
        return _kg_json_cache
    
    with _cache_lock:
        if _kg_json_cache is not None:
            return _kg_json_cache
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            _kg_json_cache = {entity["@id"]: entity for entity in data}
            print(f"✅ Loaded KG.json with {len(_kg_json_cache)} entities (cached).")
            return _kg_json_cache
        except Exception as e:
            print(f"❌ Error loading KG.json: {str(e)}")
            return None


# ✅ Load KG.ttl & Build Adjacency List (with caching)
def load_kg_ttl(file_path):
    """Loads KG.ttl and builds an adjacency list for fast graph traversal. Uses caching."""
    global _kg_ttl_cache, _adjacency_list_cache, _cache_loaded
    
    if _kg_ttl_cache is not None and _adjacency_list_cache is not None:
        return _kg_ttl_cache, _adjacency_list_cache
    
    with _cache_lock:
        if _kg_ttl_cache is not None and _adjacency_list_cache is not None:
            return _kg_ttl_cache, _adjacency_list_cache
        
        try:
            g = Graph()
            g.parse(file_path, format="turtle")
            adjacency_list = defaultdict(list)

            for s, p, o in g:
                adjacency_list[str(s)].append((s, p, o))
                adjacency_list[str(o)].append((s, p, o))

            _kg_ttl_cache = g
            _adjacency_list_cache = adjacency_list
            print(f"✅ Loaded KG.ttl with {len(g)} triples (cached).")
            return _kg_ttl_cache, _adjacency_list_cache
        except Exception as e:
            print(f"❌ Error loading KG.ttl: {str(e)}")
            return None, None


# ✅ Initialize cache on module load
def initialize_kg_cache():
    """Pre-loads KG data into cache to avoid loading on every request."""
    global _cache_loaded
    if _cache_loaded:
        return
    
    kg_json_path = os.path.join(os.path.dirname(__file__), "KG.json")
    kg_ttl_path = os.path.join(os.path.dirname(__file__), "KG.ttl")
    
    # Try to load from parent directory if not found
    if not os.path.exists(kg_json_path):
        kg_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Backend", "KG.json")
    if not os.path.exists(kg_ttl_path):
        kg_ttl_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Backend", "KG.ttl")
    
    print("🔄 Initializing KG cache...")
    load_kg_json(kg_json_path)
    load_kg_ttl(kg_ttl_path)
    _cache_loaded = True
    print("✅ KG cache initialized.")


# ✅ **Optimized BFS Retrieval with Subreddit & Topic Filtering**
def retrieve_relevant_comments(kg_json, adjacency_list, subreddit, topics):
    """Retrieves only comments relevant to the given subreddit and topics."""
    if not kg_json:
        return "❌ KG.json not loaded."

    subreddit_uri = f"http://reddit.com/subreddit/{subreddit}"
    
    # Handle both single topic (string) and multiple topics (list)
    if isinstance(topics, str):
        topics = [topics]
    
    topic_uris = [f"http://reddit.com/topic/{topic}" for topic in topics]
    matched_comments = set()

    # **Step 1: Find Posts Related to Subreddit & Topics**
    relevant_posts = set()
    for entity_id, entity in kg_json.items():
        if "sioc:Container" in entity and entity["sioc:Container"] == subreddit_uri:
            # Check if any topic is mentioned
            if "sioc:topic" in entity:
                entity_topics = entity["sioc:topic"]
                if isinstance(entity_topics, list):
                    if any(topic_uri in entity_topics for topic_uri in topic_uris):
                        relevant_posts.add(entity_id)
                elif isinstance(entity_topics, str):
                    if any(topic_uri == entity_topics for topic_uri in topic_uris):
                        relevant_posts.add(entity_id)

    if not relevant_posts:
        return "❌ No posts found for the given subreddit & topics."

    # **Step 2: Retrieve Only Comments from Relevant Posts**
    for post_uri in relevant_posts:
        for comment_uri, p, o in adjacency_list.get(post_uri, []):
            if "sioc:Comment" in str(o):
                matched_comments.add(comment_uri)

    if not matched_comments:
        return "❌ No relevant comments found."

    # **Step 3: Retrieve Context of Matched Comments**
    context_results = []
    for comment in matched_comments:
        comment_text = kg_json.get(comment, {}).get("dc:title", "")
        if comment_text:
            context_results.append(comment_text)

    return {"context": context_results[:10]} if context_results else "❌ Data not found."


# ✅ Groq Chat API (optimized with faster model and async file I/O)
def chat_with_groq(context, user_query, userID):
    """Interacts with Groq model using retrieved KG context. Uses faster model and async file I/O."""
    global conversation_history

    # Format context properly
    if isinstance(context, dict) and "context" in context:
        context_str = "\n".join(context["context"]) if isinstance(context["context"], list) else str(context["context"])
    else:
        context_str = str(context)

    # Build prompt more efficiently
    messages = [
        {"role": "system", "content": "You are a helpful assistant that provides concise, accurate answers based on the given context."},
        {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {user_query}\n\nProvide a detailed answer based on the context."}
    ]

    client = get_groq_client()
    if client is None:
        return "❌ Groq client not configured. Provide a valid API key."

    try:
        # Use faster model: llama-3.1-8b-instant is much faster than 70b
        # Still provides good quality but responds 3-5x faster
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",  # Changed from llama-3.3-70b-versatile for speed
            temperature=0.7,
            max_tokens=1500  # Reasonable limit
        )
        response = chat_completion.choices[0].message.content
        
        # Save conversation history asynchronously (non-blocking)
        def save_history():
            try:
                file_path = "conversation_history.csv"
                csv_file_path = f"{userID}_{file_path}"
                conversation_history = [
                    {"role": "user", "content": user_query},
                    {"role": "assistant", "content": response}
                ]
                with open(csv_file_path, mode='w', newline='', encoding='utf-8') as file:
                    writer = csv.writer(file)
                    writer.writerow(["Role", "Content"])
                    for entry in conversation_history:
                        writer.writerow([entry["role"], entry["content"]])
            except Exception as e:
                print(f"⚠️ Warning: Could not save conversation history: {e}")
        
        # Save in background thread
        threading.Thread(target=save_history, daemon=True).start()
        
        return response
    except AuthenticationError:
        return "❌ Invalid Groq API key. Update 'GROQ_API_KEY' and try again."
    except Exception as e:
        return f"❌ Groq request failed: {str(e)}"

# ✅ Run Main Program (optimized)
def chat_with_kg(user_query, userID, subreddit, topics):
    # Use cached paths
    kg_json_path = os.path.join(os.path.dirname(__file__), "KG.json")
    kg_ttl_path = os.path.join(os.path.dirname(__file__), "KG.ttl")
    
    # Try parent directory if not found
    if not os.path.exists(kg_json_path):
        kg_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Backend", "KG.json")
    if not os.path.exists(kg_ttl_path):
        kg_ttl_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Backend", "KG.ttl")

    # Load KG data (uses cache if already loaded)
    kg_json = load_kg_json(kg_json_path)
    kg_ttl, adjacency_list = load_kg_ttl(kg_ttl_path)
    
    if kg_json is None or adjacency_list is None:
        return "❌ Error loading knowledge graph data."

    if not (1 <= len(topics) <= 4):
        return "❌ Please select between 1 and 4 topics."

    # Retrieve relevant comments (optimized)
    context = retrieve_relevant_comments(kg_json, adjacency_list, subreddit, topics)

    # Query Groq (optimized with faster model)
    response = chat_with_groq(context, user_query, userID)

    return response

# Initialize cache when module is imported
initialize_kg_cache()