// src/components/ChatInterface/CronJobButton.js
import React, { useState, useRef, useEffect } from 'react';
import Button from '../Common/Button';
import { scheduleCronJob } from '../../services/api';
import '../../styles/App.css';

const CronJobButton = ({ selectedSubreddit, selectedTopics, userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropdownRef = useRef(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    if (!selectedSubreddit || selectedTopics.length === 0) {
      setError('Please select a subreddit and topics first');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setIsOpen(!isOpen);
  };

  const handleHourSelect = (hour) => {
    setSelectedHour(hour);
  };

  const handleSchedule = async () => {
    if (!selectedHour) {
      setError('Please select an hour');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await scheduleCronJob(userId, selectedSubreddit, selectedTopics, selectedHour);
      setSuccess(`Scheduled job successfully for ${selectedHour}:00`);
      setTimeout(() => {
        setSuccess('');
        setIsOpen(false);
      }, 3000);
    } catch (error) {
      setError('Failed to schedule job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cron-job-dropdown" ref={dropdownRef}>
      <Button
        onClick={toggleDropdown}
        buttonStyle="btn--outline"
        buttonSize="btn--medium"
        disabled={!selectedSubreddit || selectedTopics.length === 0}
      >
        <i className="fas fa-clock"></i> Schedule
      </Button>
      
      {error && <div className="cron-error">{error}</div>}
      {success && <div className="cron-success">{success}</div>}
      
      {isOpen && (
        <div className="dropdown-content">
          <div className="cron-header">
            <h3>Schedule Hourly Job</h3>
            <p>Select start hour (24-hour format)</p>
          </div>
          
          <div className="cron-body">
            <div className="hour-selection">
              <div className="hour-options">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className={`hour-option ${selectedHour === hour ? 'selected' : ''}`}
                    onClick={() => handleHourSelect(hour)}
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="cron-footer">
            <Button
              onClick={() => setIsOpen(false)}
              buttonStyle="btn--outline"
              buttonSize="btn--small"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              buttonStyle="btn--primary"
              buttonSize="btn--small"
              disabled={loading || !selectedHour}
            >
              {loading ? 'Scheduling...' : 'Schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CronJobButton;