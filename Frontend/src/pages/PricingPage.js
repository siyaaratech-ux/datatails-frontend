// src/pages/PricingPage.js
import React, { useState } from 'react';
import Navbar from '../components/Common/Navbar';
import Footer from '../components/Common/Footer';
import Button from '../components/Common/Button';
import { useAuth } from '../context/AuthContext';
import { updateUserPremiumStatus } from '../services/firebase';
import '../styles/App.css';

const PricingPage = () => {
  const { currentUser, userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpgrade = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In a real application, this would be connected to a payment processor
      await updateUserPremiumStatus(currentUser.uid, true);
      setSuccess('Successfully upgraded to premium!');
      
      // Update user data in context
      setUserData({
        ...userData,
        isPremium: true
      });
    } catch (error) {
      setError('Failed to upgrade. Please try again.');
      console.error('Upgrade error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!currentUser || !userData?.isPremium) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In a real application, this would be connected to a payment processor
      await updateUserPremiumStatus(currentUser.uid, true);
      setSuccess('Successfully renewed your premium subscription!');
    } catch (error) {
      setError('Failed to renew. Please try again.');
      console.error('Renewal error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page">
      <Navbar />
      
      <div className="pricing-container">
        <h1 className="pricing-title">DataTails Pricing</h1>
        <p className="pricing-subtitle">Choose the plan that fits your needs</p>
        
        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}
        
        <div className="pricing-plans">
          <div className="pricing-plan">
            <div className="plan-header">
              <h2>Basic</h2>
              <p className="plan-price">Free</p>
            </div>
            
            <div className="plan-features">
              <ul>
                <li>
                  <i className="fas fa-check"></i> Access to filter functionality
                </li>
                <li>
                  <i className="fas fa-check"></i> 5 queries per day
                </li>
                <li>
                  <i className="fas fa-check"></i> Basic visualizations
                </li>
                <li className="feature-disabled">
                  <i className="fas fa-times"></i> No access to cron jobs
                </li>
                <li className="feature-disabled">
                  <i className="fas fa-times"></i> No advanced visualizations
                </li>
                <li className="feature-disabled">
                  <i className="fas fa-times"></i> Limited to 4 topics per filter
                </li>
              </ul>
            </div>
            
            <div className="plan-cta">
              {userData?.isPremium ? (
                <span className="current-plan">Your current plan</span>
              ) : (
                <span className="current-plan">Your current plan</span>
              )}
            </div>
          </div>
          
          <div className="pricing-plan premium-plan">
            <div className="plan-badge">Recommended</div>
            
            <div className="plan-header">
              <h2>Premium</h2>
              <p className="plan-price">$9.99<span>/month</span></p>
            </div>
            
            <div className="plan-features">
              <ul>
                <li>
                  <i className="fas fa-check"></i> Access to filter functionality
                </li>
                <li>
                  <i className="fas fa-check"></i> Unlimited queries
                </li>
                <li>
                  <i className="fas fa-check"></i> All visualizations (basic + advanced)
                </li>
                <li>
                  <i className="fas fa-check"></i> Access to cron jobs
                </li>
                <li>
                  <i className="fas fa-check"></i> Priority support
                </li>
                <li>
                  <i className="fas fa-check"></i> Future premium features
                </li>
              </ul>
            </div>
            
            <div className="plan-cta">
              {userData?.isPremium ? (
                <Button
                  onClick={handleRenew}
                  buttonStyle="btn--primary"
                  buttonSize="btn--large"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Renew Premium'}
                </Button>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  buttonStyle="btn--primary"
                  buttonSize="btn--large"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Upgrade to Premium'}
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="pricing-faq">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>What's included in the Premium plan?</h3>
            <p>
              Premium users get unlimited queries, access to all visualization types,
              ability to schedule cron jobs, and priority support.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>Can I cancel my Premium subscription?</h3>
            <p>
              Yes, you can cancel your subscription at any time. Your Premium benefits
              will continue until the end of your billing cycle.
            </p>
          </div>
          
          <div className="faq-item">
            <h3>What are cron jobs?</h3>
            <p>
              Cron jobs allow you to schedule automated data collection and analysis at 
              regular intervals, ensuring you always have up-to-date insights.
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PricingPage;