// src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import Button from '../components/Common/Button';
import '../styles/App.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <Navbar />
      
      <div className="hero-section">
        <div className="hero-container">
          <h1 className="hero-title">DataTails</h1>
          <h2 className="hero-subtitle">
            Bridging Data to Insights with Semantic Intelligence
          </h2>
          <p className="hero-description">
            Transform chaotic Reddit data into crystal-clear insights with DataTails, 
            your ultimate AI-powered analytics platform.
          </p>
          
          <div className="hero-buttons">
            <Link to="/signup">
              <Button buttonStyle="btn--primary" buttonSize="btn--large">
                Sign Up
              </Button>
            </Link>
            <Link to="/login">
              <Button buttonStyle="btn--secondary" buttonSize="btn--large">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="features-section">
        <div className="features-container">
          <h2 className="section-title">What Sets DataTails Apart?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <i className="fas fa-lightbulb feature-icon" style={{color: 'var(--secondary)'}}></i>
              <h3>Smart Recommendations</h3>
              <p>Get the best charts automatically, saving time and reducing guesswork.</p>
            </div>
            
            <div className="feature-card">
              <i className="fas fa-chart-line feature-icon" style={{color: 'var(--primary)'}}></i>
              <h3>Real-Time Analytics</h3>
              <p>Stay ahead with up-to-date insights and trends.</p>
            </div>
            
            <div className="feature-card">
              <i className="fas fa-brain feature-icon" style={{color: 'var(--secondary)'}}></i>
              <h3>Advanced AI Engine</h3>
              <p>Powered by NLP, Knowledge Graphs, and LLMs for precision and speed.</p>
            </div>
            
            <div className="feature-card">
              <i className="fas fa-search feature-icon" style={{color: 'var(--primary)'}}></i>
              <h3>Intelligent Querying</h3>
              <p>Ask complex questions and get instant, actionable answers.</p>
            </div>
            
            <div className="feature-card">
              <i className="fas fa-crown feature-icon" style={{color: 'var(--secondary)'}}></i>
              <h3>Premium Customization</h3>
              <p>Cron jobs, advanced visualization options, and enhanced features for power users.</p>
            </div>
          </div>
          
          <div className="cta-container">
            <h3>With DataTails, make smarter decisions, faster</h3>
            <Link to="/signup">
              <Button buttonStyle="btn--primary" buttonSize="btn--large">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default HomePage;