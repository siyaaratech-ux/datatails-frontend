// src/components/ChatInterface/FilterButton.js
import React, { useState, useEffect, useRef } from 'react';
import Button from '../Common/Button';
import '../../styles/App.css';

const FilterButton = ({ onSelect, subredditData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [topicsData, setTopicsData] = useState({});
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Update available topics when subreddit changes
    if (selectedSubreddit && topicsData[selectedSubreddit]) {
      setAvailableTopics(topicsData[selectedSubreddit]);
    } else {
      setAvailableTopics([]);
    }
    
    // Clear selected topics when subreddit changes
    setSelectedTopics([]);
  }, [selectedSubreddit, topicsData]);

  // Update topicsData if subredditData prop changes
  useEffect(() => {
    if (subredditData && Object.keys(subredditData).length > 0) {
      setTopicsData(subredditData);
    } else {
      // If no data provided, try to fetch it
      fetch('/subreddit_topics.json')
        .then(response => response.json())
        .then(data => {
          setTopicsData(data);
        })
        .catch(error => {
          console.error('Error loading subreddit_topics.json:', error);
        });
    }
  }, [subredditData]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSubredditSelect = (subreddit) => {
    setSelectedSubreddit(subreddit);
  };

  const handleTopicSelect = (topic) => {
    if (selectedTopics.includes(topic)) {
      // Remove topic if already selected
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else if (selectedTopics.length < 5) {
      // Add topic if under limit
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleApply = () => {
    if (selectedSubreddit && selectedTopics.length > 0 && selectedTopics.length <= 4) {
      onSelect(selectedSubreddit, selectedTopics);
      setIsOpen(false);
    }
  };

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <Button
        onClick={toggleDropdown}
        buttonStyle="btn--outline"
        buttonSize="btn--medium"
      >
        <i className="fas fa-filter"></i> Filter
        {selectedSubreddit && selectedTopics.length > 0 && (
          <span className="filter-badge">{selectedTopics.length}</span>
        )}
      </Button>
      
      {isOpen && (
        <div className="dropdown-content">
          <div className="filter-header">
            <h3>Select Subreddit and Topics</h3>
            <p>Choose 1 subreddit and 1-4 topics</p>
          </div>
          
          <div className="filter-body">
            <div className="subreddit-selection">
              <h4>Subreddit</h4>
              <div className="subreddit-options">
                {Object.keys(topicsData).map((subreddit) => (
                  <div
                    key={subreddit}
                    className={`subreddit-option ${
                      selectedSubreddit === subreddit ? 'selected' : ''
                    }`}
                    onClick={() => handleSubredditSelect(subreddit)}
                  >
                    {subreddit}
                  </div>
                ))}
              </div>
            </div>
            
            {selectedSubreddit && (
              <div className="topic-selection">
                <h4>Topics ({selectedTopics.length}/4)</h4>
                <div className="topic-options">
                  {availableTopics.map((topic) => (
                    <div
                      key={topic}
                      className={`topic-option ${
                        selectedTopics.includes(topic) ? 'selected' : ''
                      } ${
                        selectedTopics.length >= 4 && !selectedTopics.includes(topic)
                          ? 'disabled'
                          : ''
                      }`}
                      onClick={() => handleTopicSelect(topic)}
                    >
                      {topic}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="filter-footer">
            <Button
              onClick={() => setIsOpen(false)}
              buttonStyle="btn--outline"
              buttonSize="btn--small"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              buttonStyle="btn--primary"
              buttonSize="btn--small"
              disabled={!selectedSubreddit || selectedTopics.length === 0}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterButton;