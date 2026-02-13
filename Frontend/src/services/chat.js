// src/services/chat.js
import { submitQuery, getVisualizations, getSubredditsAndTopics, scheduleCronJob } from './api';
import { updateQueryCount, saveChatHistory, getChatHistory } from './firebase';
import { isPremiumUser, hasReachedQueryLimit } from './auth';

// Send a query to the backend
export const sendQuery = async (query, subreddit, topics, userId, userData) => {
  try {
    // Check if the user has reached the query limit
    if (hasReachedQueryLimit(userData)) {
      throw new Error('Query limit reached. Upgrade to premium for unlimited queries.');
    }
    
    // Send query to backend
    const response = await submitQuery(query, subreddit, topics, userId);
    
    // Update query count in Firebase
    await updateQueryCount(userId);
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Get visualization recommendations
export const getVisualizationRecommendations = async (query, response) => {
  try {
    const visualizations = await getVisualizations(query, response);
    return visualizations;
  } catch (error) {
    throw error;
  }
};

// Get available subreddits and topics
export const getAvailableSubredditsAndTopics = async () => {
  try {
    const data = await getSubredditsAndTopics();
    return data;
  } catch (error) {
    throw error;
  }
};

// Schedule a cron job
export const scheduleHourlyCronJob = async (userId, subreddit, topics, schedule, userData) => {
  try {
    // Check if user is premium
    if (!isPremiumUser(userData)) {
      throw new Error('Cron jobs are only available for premium users.');
    }
    
    const result = await scheduleCronJob(userId, subreddit, topics, schedule);
    return result;
  } catch (error) {
    throw error;
  }
};

// Save chat message to history
export const saveChatMessageToHistory = async (userId, message) => {
  try {
    await saveChatHistory(userId, message);
    return true;
  } catch (error) {
    throw error;
  }
};

// Get user's chat history
export const getUserChatHistory = async (userId) => {
  try {
    const history = await getChatHistory(userId);
    return history;
  } catch (error) {
    throw error;
  }
};

// Format chat response for display
export const formatChatResponse = (response) => {
  // Check if response is in JSON format
  try {
    const parsedResponse = JSON.parse(response);
    return parsedResponse;
  } catch (e) {
    // Not JSON, return as is
    return response;
  }
};