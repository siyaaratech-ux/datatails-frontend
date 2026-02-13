// src/components/Common/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/App.css';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <Link to="/">DataTails</Link>
          <p>Bridging Data to Insights with Semantic Intelligence</p>
        </div>
        
        <div className="footer-links">
          <div className="footer-link-wrapper">
            <div className="footer-link-items">
              <h2>About Us</h2>
              <Link to="/about">Team</Link>
              <Link to="/about">Research</Link>
              <Link to="/about">Technology</Link>
            </div>
            <div className="footer-link-items">
              <h2>Services</h2>
              <Link to="/chat">Chat</Link>
              <Link to="/pricing">Premium</Link>
            </div>
          </div>
          <div className="footer-link-wrapper">
            <div className="footer-link-items">
              <h2>Account</h2>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
              <Link to="/settings">Settings</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {year} DataTails. All rights reserved.</p>
        <p>Siyaara Tech</p>
      </div>
    </footer>
  );
};

export default Footer;