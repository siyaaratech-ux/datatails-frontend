// src/components/ChatInterface/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import { submitQuery, getVisualizations, uploadAndAnalyze } from '../../services/api';
import { saveChatHistory } from '../../services/firebase';
import ChatMessage from './ChatMessage';
import Button from '../Common/Button';
import FileUpload from './FileUpload';
import '../../styles/App.css';
import '../../styles/chat-interface.css';

const ChatInterface = ({ onQuerySubmit, selectedSubreddit, selectedTopics, userId, chatHistory }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [typing, setTyping] = useState(false);
  const [loadingVisualizations, setLoadingVisualizations] = useState(false);
  const messagesEndRef = useRef(null);

  // Determine if input should be enabled
  const isInputEnabled = pendingFiles.length > 0 || (selectedSubreddit && selectedTopics.length > 0);
  
  // Determine if send button should be enabled
  const isSendEnabled = pendingFiles.length > 0 || (selectedSubreddit && selectedTopics.length > 0 && input.trim());
  
  // Get appropriate placeholder
  const getPlaceholder = () => {
    if (pendingFiles.length > 0) {
      return "Type your question about the files (optional)...";
    }
    if (selectedSubreddit && selectedTopics.length > 0) {
      return "Type your query here...";
    }
    return "Upload a file above or select subreddit & topics to chat";
  };

  // Load chat history
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  // Scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Called by FileUpload when files are selected; we just store them until Send
  const handleFileUpload = (dataOrFiles) => {
    // Backward compatibility: if old upload returned analysis, ignore
    if (Array.isArray(dataOrFiles)) {
      setPendingFiles(dataOrFiles);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Branch 1: If files are selected, analyze the files with optional query
    if (pendingFiles.length > 0) {
      const userMessage = {
        id: Date.now(),
        text: `📎 ${pendingFiles.length} file(s) attached${input ? `\nQuery: ${input}` : ''}`,
        sender: 'user',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, userMessage]);
      setTyping(true);
      setLoading(true);
      try {
        const result = await uploadAndAnalyze({ query: input, files: pendingFiles });
        const assistantMessage = {
          id: Date.now() + 1,
          text: result.analysis,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Turn off typing indicator immediately after analysis response
        setTyping(false);
        setLoading(false);
        setPendingFiles([]);
        setInput('');
        
        // Save chat history immediately
        if (userId) {
          saveChatHistory(userId, userMessage).catch(err => console.error('Error saving user message:', err));
          saveChatHistory(userId, assistantMessage).catch(err => console.error('Error saving assistant message:', err));
        }
        
        // Fetch visualizations in background (non-blocking) with loading indicator
        setLoadingVisualizations(true);
        getVisualizations(input || 'Document analysis', result.analysis)
          .then(visualizations => {
            console.log("File Viz", visualizations);
            setLoadingVisualizations(false);
            onQuerySubmit(input || 'Document analysis', { response: result.analysis }, visualizations);
          })
          .catch(vizError => {
            console.error('Error getting visualizations for files:', vizError);
            setLoadingVisualizations(false);
            onQuerySubmit(input || 'Document analysis', { response: result.analysis }, []);
          });
      } catch (err) {
        const errorMessage = {
          id: Date.now() + 1,
          text: err.message || 'Failed to analyze documents.',
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          isError: true
        };
        setMessages((prev) => [...prev, errorMessage]);
        setTyping(false);
        setLoading(false);
        setPendingFiles([]);
        setInput('');
      }
      return;
    }
    
    // Branch 2: Normal query requires subreddit + topics
    if (!selectedSubreddit || selectedTopics.length === 0) {
      return;
    }
    
    if (!input.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    const queryText = input;
    setInput('');
    setLoading(true);
    setTyping(true);
    
    try {
      // Submit query to backend
      const response = await submitQuery(queryText, selectedSubreddit, selectedTopics, userId);
      console.log("Res", response)
      // Create bot message with the response
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
      // Turn off typing indicator immediately after LLM response
      setTyping(false);
      setLoading(false);
      
      // Save chat history immediately (don't wait for visualizations)
      if (userId) {
        saveChatHistory(userId, userMessage).catch(err => console.error('Error saving user message:', err));
        saveChatHistory(userId, botMessage).catch(err => console.error('Error saving bot message:', err));
      }
      
      // Fetch visualizations in background (non-blocking) with loading indicator
      setLoadingVisualizations(true);
      getVisualizations(queryText, response.response || response)
        .then(visualizations => {
          console.log("Viz", visualizations);
          setLoadingVisualizations(false);
          onQuerySubmit(queryText, response, visualizations);
        })
        .catch(vizError => {
          // Still notify parent but with empty visualizations
          console.error('Error getting visualizations:', vizError);
          setLoadingVisualizations(false);
          onQuerySubmit(queryText, response, []);
        });
    } catch (error) {
      console.error('Error processing query:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, there was an error processing your query. Please try again.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      setTyping(false);
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Upload a file for analysis or select a subreddit and topics to start chatting.</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))
        )}
        {typing && (
          <div className="chat-message bot-message">
            <div className="message-content">Thinking…</div>
          </div>
        )}
        {loadingVisualizations && (
          <div className="chat-message bot-message visualization-loading-message">
            <div className="message-content">
              <div className="spinner" style={{ display: 'inline-block', marginRight: '10px', width: '16px', height: '16px' }}></div>
              Generating visualizations...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <FileUpload onFileUpload={setPendingFiles} />
        <form onSubmit={handleSubmit} className="chat-input-form" onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && isSendEnabled && !loading) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={loading || !isInputEnabled}
            className="chat-input"
            rows={1}
          />
          <Button
            type="submit"
            buttonStyle="btn--primary"
            buttonSize="btn--medium"
            disabled={loading || !isSendEnabled}
          >
            {loading ? 'Processing...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;