// src/pages/SettingsPage.js
import React, { useState } from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import Button from '../components/Common/Button';
import { useAuth } from '../context/AuthContext';
import { updateUserPassword, clearChatHistory, getChatHistory } from '../services/firebase';
import { downloadSvgChartAsPng } from '../utils/downloadChartAsPng';
import '../styles/App.css';

// Helper to find the first SVG chart in the DOM
function getFirstChartSvg() {
  // Try to find a visible SVG in the visualization panel
  const panel = document.querySelector('.visualization-display, .scrollable-chart-area');
  if (panel) {
    const svg = panel.querySelector('svg');
    return svg;
  }
  // Fallback: find any SVG on the page
  return document.querySelector('svg');
}

const SettingsPage = () => {
  const { currentUser, userData } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadMsg, setDownloadMsg] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await updateUserPassword(email);
      setSuccess('Password reset email sent. Please check your inbox.');
    } catch (error) {
      setError('Failed to send password reset email. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Download chart as PNG handler
  const handleDownloadChart = () => {
    setDownloadMsg('');
    const svg = getFirstChartSvg();
    if (!svg) {
      setDownloadMsg('No chart found to download. Please view a chart first.');
      return;
    }
    downloadSvgChartAsPng(svg, 'chart.png');
    setDownloadMsg('Chart download started!');
  };

  const handleClearHistory = async () => {
    setDownloadMsg("");
    setError("");
    setSuccess("");
    if (!currentUser?.uid) {
      setError('You must be logged in to clear chat history.');
      return;
    }
    try {
      setLoading(true);
      await clearChatHistory(currentUser.uid);
      setSuccess('Chat history cleared successfully!');
    } catch (err) {
      setError('Failed to clear chat history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = async () => {
    setDownloadMsg("");
    setError("");
    setSuccess("");
    if (!currentUser?.uid) {
      setError('You must be logged in to download your data.');
      return;
    }
    try {
      setLoading(true);
      const chatHistory = await getChatHistory(currentUser.uid);
      const data = {
        user: userData,
        chatHistory,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datatails_user_data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadMsg('Data download started!');
    } catch (err) {
      setError('Failed to download data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <Navbar />
      
      <div className="settings-container">
        <h1 className="settings-title">Account Settings</h1>
        
        <div className="settings-section account-info">
          <h2>Account Information</h2>
          
          <div className="account-details">
            <p>
              <strong>Username:</strong> {userData?.username}
            </p>
            <p>
              <strong>Email:</strong> {userData?.email}
            </p>
            <p>
              <strong>Account Type:</strong>{' '}
              {userData?.isPremium ? (
                <span className="premium-badge">Premium</span>
              ) : (
                <span style={{color: 'var(--primary)'}}>Basic</span>
              )}
            </p>
            {!userData?.isPremium && (
              <p>
                <strong>Daily Queries Used:</strong> {userData?.dailyQueries || 0}/20
              </p>
            )}
          </div>
        </div>
        
        <div className="settings-section password-section">
          <h2>Change Password</h2>
          
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}
          
          <form onSubmit={handleResetPassword} className="password-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="form-control"
              />
              <p className="form-help">
                We'll send a password reset link to this email.
              </p>
            </div>
            
            <Button
              type="submit"
              buttonStyle="btn--primary"
              buttonSize="btn--medium"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        </div>
        
        <div className="settings-section data-section">
          <h2>Data Management</h2>
          
          <div className="data-options">
            <div className="data-option">
              <h3>Clear Chat History</h3>
              <p>
                Remove all your previous chat conversations with DataTails.
                This action cannot be undone.
              </p>
              <Button
                buttonStyle="btn--outline"
                buttonSize="btn--medium"
                onClick={handleClearHistory}
                disabled={loading}
              >
                Clear History
              </Button>
            </div>
            
            <div className="data-option">
              <h3>Download Your Data</h3>
              <p>
                Export all your chat history and settings as a JSON file.
              </p>
              <Button
                buttonStyle="btn--outline"
                buttonSize="btn--medium"
                onClick={handleDownloadData}
                disabled={loading}
              >
                Download Data
              </Button>
            </div>
            
            <div className="data-option">
              <h3>Download Your Charts</h3>
              <p>
                Download the currently visible chart as a PNG image. Make sure the chart you want is visible in the visualization panel.
              </p>
              <Button
                buttonStyle="btn--outline"
                buttonSize="btn--medium"
                onClick={handleDownloadChart}
              >
                Download Chart as PNG
              </Button>
              {downloadMsg && <div style={{ marginTop: 8, color: 'var(--primary)', fontSize: '0.97rem' }}>{downloadMsg}</div>}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default SettingsPage;