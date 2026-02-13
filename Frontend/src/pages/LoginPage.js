// src/pages/LoginPage.js
import React from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import LoginForm from '../components/AuthForms/LoginForm';
import '../styles/App.css';

const LoginPage = () => {
  return (
    <div className="login-page">
      <Navbar />
      
      <div className="auth-container">
        <div className="auth-wrapper">
          <h1 className="auth-title">Login to DataTails</h1>
          <p className="auth-subtitle">Welcome back! Sign in to your account</p>
          
          <LoginForm />
          
          <div className="auth-redirect">
            <p>
              Don't have an account? <a href="/signup">Sign up here</a>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default LoginPage;