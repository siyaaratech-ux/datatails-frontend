// src/context/UserContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserChatHistory } from '../services/chat';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [queryCount, setQueryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load user data when authenticated
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      
      if (currentUser && userData) {
        try {
          // Load chat history
          const history = await getUserChatHistory(currentUser.uid);
          setChatHistory(history);
          
          // Set query count
          setQueryCount(userData.dailyQueries || 0);
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        // Reset state when logged out
        setChatHistory([]);
        setSelectedSubreddit('');
        setSelectedTopics([]);
        setQueryCount(0);
      }
      
      setLoading(false);
    };

    loadUserData();
  }, [currentUser, userData]);

  // Filter selection handler
  const handleFilterSelect = (subreddit, topics) => {
    setSelectedSubreddit(subreddit);
    setSelectedTopics(topics);
  };

  // Add a new message to chat history
  const addMessageToHistory = (message) => {
    setChatHistory((prev) => [...prev, message]);
  };

  // Check if user is premium
  const isPremium = userData?.isPremium === true;

  // Check if user has reached query limit
  const hasReachedLimit = !isPremium && queryCount >= 20;

  // Update query count
  const incrementQueryCount = () => {
    if (!isPremium) {
      setQueryCount((prev) => prev + 1);
    }
  };

  const value = {
    chatHistory,
    selectedSubreddit,
    selectedTopics,
    queryCount,
    loading,
    isPremium,
    hasReachedLimit,
    handleFilterSelect,
    addMessageToHistory,
    incrementQueryCount
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;