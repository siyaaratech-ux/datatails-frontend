// src/pages/ChatPage.js
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import ChatInterface from '../components/ChatInterface/ChatInterface';
import FilterButton from '../components/ChatInterface/FilterButton';
import CronJobButton from '../components/ChatInterface/ChronJobButton';
import PopupMessage from '../components/Common/PopupMessage';
import { useAuth } from '../context/AuthContext';
import { getChatHistory, updateQueryCount } from '../services/firebase';
import { getSubredditsAndTopics } from '../services/api';
import '../styles/App.css';

// Lazy load VisualizationPanel since it's only shown conditionally and contains heavy chart components
const VisualizationPanel = lazy(() => import('../components/ChatInterface/VisualizationPanel'));

const ChatPage = () => {
  const { currentUser, userData } = useAuth();
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [subredditData, setSubredditData] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [showVisualization, setShowVisualization] = useState(false);
  const [visualizationData, setVisualizationData] = useState(null);
  const [visualizationOptions, setVisualizationOptions] = useState([]);
  const [selectedChart, setSelectedChart] = useState('');
  const [showPopup, setShowPopup] = useState(true);
  const [popupMessage, setPopupMessage] = useState({
    title: 'Welcome to DataTails Chat',
    message: 'Please select a subreddit and topics using the filter button before querying.'
  });

  // Load subreddit and topic data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to fetch from API first
        const data = await getSubredditsAndTopics();
        setSubredditData(data);
      } catch (error) {
        console.error('Error loading subreddits and topics from API:', error);
        
        // Fallback to local JSON file
        try {
          const response = await fetch('/subreddit_topics.json');
          const data = await response.json();
          setSubredditData(data);
        } catch (jsonError) {
          console.error('Error loading subreddit_topics.json:', jsonError);
        }
      }
    };

    loadData();
  }, []);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentUser) {
        try {
          const history = await getChatHistory(currentUser.uid);
          setChatHistory(history);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    };

    loadChatHistory();
  }, [currentUser]);

  const handleFilterSelect = (subreddit, topics) => {
    setSelectedSubreddit(subreddit);
    setSelectedTopics(topics);
    setShowPopup(true);
    setPopupMessage({
      title: 'Filter Selected',
      message: `Selected ${subreddit} with ${topics.length} topics. You can now query DataTails.`
    });
  };

  const handleVisualizationSelect = (chart) => {
    // Check if user is premium or if the chart is a simple visualization
    const simpleVisualizations = ['bar_chart', 'line_chart', 'area_chart', 'word_cloud'];
    
    if (userData?.isPremium || simpleVisualizations.includes(chart)) {
      setSelectedChart(chart);
    } else {
      setShowPopup(true);
      setPopupMessage({
        title: 'Premium Feature',
        message: 'This is a premium visualization. Please upgrade to access advanced charts.'
      });
    }
  };

  const handleQuerySubmit = async (query, response, visualizations) => {
    // File uploads don't require subreddit/topics, so we only check for normal queries
    const isFileUpload = query && query.includes('Document analysis') || 
                         (typeof response === 'object' && response.response && response.response.includes('CV') || response.response.includes('resume'));
    
    // Only check for subreddit/topics if this is NOT a file upload
    if (!isFileUpload && (!selectedSubreddit || selectedTopics.length === 0)) {
      setShowPopup(true);
      setPopupMessage({
        title: 'Filter Required',
        message: 'Please select a subreddit and at least one topic before querying.'
      });
      return;
    }

    // Check if user has reached query limit (only for non-file uploads)
    if (!isFileUpload && !userData?.isPremium && userData?.dailyQueries >= 20) {
      setShowPopup(true);
      setPopupMessage({
        title: 'Query Limit Reached',
        message: 'You have reached your daily limit of 20 queries. Upgrade to premium for unlimited queries.'
      });
      return;
    }

    // Update query count (only for non-file uploads)
    if (!isFileUpload && currentUser) {
      try {
        await updateQueryCount(currentUser.uid);
      } catch (error) {
        console.error('Error updating query count:', error);
      }
    }

    // Show visualization panel if visualizations are available
    if (visualizations && visualizations.length > 0) {
      setShowVisualization(true);
      setVisualizationOptions(visualizations);
      setVisualizationData({ query, response });
    } else {
      // Even if no visualizations, show the panel with the response
      setShowVisualization(false);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="chat-page">
      <Navbar />
      
      <div className="chat-container">
        <div className="chat-header">
          <h1>DataTails Chat</h1>
          <div className="chat-controls">
            <FilterButton
              onSelect={handleFilterSelect}
              subredditData={subredditData}
            />
            
            {userData?.isPremium && (
              <CronJobButton
                selectedSubreddit={selectedSubreddit}
                selectedTopics={selectedTopics}
                userId={currentUser?.uid}
              />
            )}
          </div>
        </div>
        
        <div className={`chat-content ${showVisualization ? 'with-visualization' : ''}`}
          style={{gap: '2rem'}}>
          <div className="chat-interface-container">
            <ChatInterface
              onQuerySubmit={handleQuerySubmit}
              selectedSubreddit={selectedSubreddit}
              selectedTopics={selectedTopics}
              userId={currentUser?.uid}
              chatHistory={chatHistory}
            />
          </div>
          
          {showVisualization && (
            <div className="visualization-container">
              <Suspense fallback={<div className="visualization-loading"><div className="spinner" /> Loading visualizations...</div>}>
                <VisualizationPanel
                  visualizationData={visualizationData}
                  visualizationOptions={visualizationOptions}
                  selectedChart={selectedChart}
                  onChartSelect={handleVisualizationSelect}
                  isPremium={userData?.isPremium}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>
      
      {showPopup && (
        <PopupMessage
          title={popupMessage.title}
          message={popupMessage.message}
          onClose={closePopup}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default ChatPage;