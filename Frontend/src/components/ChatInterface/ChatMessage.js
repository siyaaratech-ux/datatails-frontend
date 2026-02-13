// src/components/ChatInterface/ChatMessage.js
import React from 'react';
import '../../styles/App.css';

// Function to convert markdown to HTML
const convertMarkdownToHTML = (text) => {
  if (!text) return '';
  
  // Handle bold text with ** **
  let htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Handle italic text with * *
  htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return htmlText;
};

const formatResponse = (text) => {
  // Ensure text is a string
  let textContent;
  if (typeof text === 'object') {
    // Handle response object
    textContent = text?.response || JSON.stringify(text);
  } else {
    // Ensure non-object values are converted to strings
    textContent = String(text || '');
  }

  // Extra safety check to ensure we have a string
  if (typeof textContent !== 'string') {
    textContent = String(textContent || '');
  }

  // Check if response is in JSON format
  try {
    // Only try to parse if it's not already an object and looks like JSON
    if (typeof text !== 'object' && 
        typeof textContent === 'string' && 
        (textContent.startsWith('{') || textContent.startsWith('['))) {
      const parsed = JSON.parse(textContent);
      return renderStructuredData(parsed);
    }
  } catch (e) {
    // Not JSON, proceed with normal formatting
  }
  
  // Format bullet points with "* " (asterisks) - common in markdown
  if (typeof textContent === 'string' && textContent.includes('\n* ')) {
    return (
      <ul className="chat-bullet-list">
        {textContent.split('\n* ').map((item, index) => {
          const processedItem = convertMarkdownToHTML(item);
          if (index === 0) return <p key={index} dangerouslySetInnerHTML={{ __html: processedItem }} />;
          return <li key={index} dangerouslySetInnerHTML={{ __html: processedItem }} />;
        })}
      </ul>
    );
  }
  
  // Format bullet points with "- " (dashes)
  if (typeof textContent === 'string' && textContent.includes('\n- ')) {
    return (
      <ul className="chat-bullet-list">
        {textContent.split('\n- ').map((item, index) => {
          const processedItem = convertMarkdownToHTML(item);
          if (index === 0) return <p key={index} dangerouslySetInnerHTML={{ __html: processedItem }} />;
          return <li key={index} dangerouslySetInnerHTML={{ __html: processedItem }} />;
        })}
      </ul>
    );
  }

  // Format numbered lists
  if (typeof textContent === 'string' && /\n\d+\.\s/.test(textContent)) {
    const parts = textContent.split(/\n(\d+\.\s)/);
    const items = [];
    
    let currentText = '';
    
    for (let i = 0; i < parts.length; i++) {
      if (/^\d+\.\s$/.test(parts[i])) {
        if (currentText) {
          const processedText = convertMarkdownToHTML(currentText);
          items.push(<p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: processedText }} />);
          currentText = '';
        }
        
        if (i + 1 < parts.length) {
          const processedContent = convertMarkdownToHTML(parts[i + 1]);
          items.push(
            <div key={`li-${i}`} className="numbered-item">
              <span className="number">{parts[i]}</span>
              <span dangerouslySetInnerHTML={{ __html: processedContent }} />
            </div>
          );
          i++; // Skip the next part since we've used it
        }
      } else if (i === 0 || (i === 1 && !/^\d+\.\s$/.test(parts[0]))) {
        currentText = parts[i];
      }
    }
    
    if (currentText) {
      const processedFinalText = convertMarkdownToHTML(currentText);
      items.push(<p key="final-p" dangerouslySetInnerHTML={{ __html: processedFinalText }} />);
    }
    
    return <div className="chat-numbered-list">{items}</div>;
  }

  // Extra safety - if not a string at this point, make it one
  if (typeof textContent !== 'string') {
    try {
      textContent = JSON.stringify(textContent);
    } catch (e) {
      textContent = String(textContent || '');
    }
  }

  // Default: format with paragraphs
  return (
    <div>
      {textContent.split('\n\n').map((paragraph, index) => {
        const processedParagraph = convertMarkdownToHTML(paragraph);
        return (
          <p key={index} dangerouslySetInnerHTML={{ __html: processedParagraph.replace(/\n/g, '<br/>') }} />
        );
      })}
    </div>
  );
};

const renderStructuredData = (data) => {
  // Render tabular data
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const headers = Object.keys(data[0]);
    
    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header) => (
                  <td key={`${rowIndex}-${header}`}>{String(row[header] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render nested object
  return (
    <div className="structured-data">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const { text, sender, timestamp, isError } = message;
  const isUser = sender === 'user';
  const messageClass = `chat-message ${isUser ? 'user-message' : 'bot-message'} ${isError ? 'error-message' : ''}`;

  return (
    <div className={messageClass} style={{justifyContent: isUser ? 'flex-end' : 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row'}}>
      <div className="message-avatar">
        {isUser ? <i className="fas fa-user"></i> : <i className="fas fa-robot"></i>}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{isUser ? 'You' : 'DataTails'}</span>
          <span className="message-time">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        <div className="message-text">{formatResponse(text)}</div>
      </div>
    </div>
  );
};

export default ChatMessage;