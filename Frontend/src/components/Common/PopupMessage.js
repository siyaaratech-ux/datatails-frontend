// src/components/Common/PopupMessage.js
import React from 'react';
import Button from './Button';
import '../../styles/App.css';

const PopupMessage = ({ title, message, onClose }) => {
  return (
    <>
      <div className="popup-overlay" onClick={onClose}></div>
      <div className="popup-message">
        <div className="popup-header">
          <h3 className="popup-title">{title}</h3>
        </div>
        <div className="popup-content">
          <p>{message}</p>
        </div>
        <div className="popup-actions">
          <Button 
            onClick={onClose}
            buttonStyle="btn--primary"
            buttonSize="btn--small"
          >
            Got it
          </Button>
        </div>
      </div>
    </>
  );
};

export default PopupMessage;