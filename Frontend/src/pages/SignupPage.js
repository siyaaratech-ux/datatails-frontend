// src/pages/SignupPage.js
import React from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import SignupForm from '../components/AuthForms/SignupForm';
import '../styles/App.css';

const SignupPage = () => {
  return (
    <div className="signup-page">
      <Navbar />
      
      <div className="auth-container">
        <div className="auth-wrapper">
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join DataTails to unlock data insights</p>
          
          <SignupForm />
          
          <div className="auth-redirect">
            <p>
              Already have an account? <a href="/login">Login here</a>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default SignupPage;