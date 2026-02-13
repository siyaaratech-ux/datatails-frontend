import React, { useState, useRef, useCallback, useEffect } from 'react';
// Selection-only; processing happens on Send via uploadAndAnalyze
import '../../styles/file-upload.css';

const FileUpload = ({ onFileUpload }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Update parent whenever files change
  useEffect(() => {
    onFileUpload(files);
  }, [files, onFileUpload]);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    
    setFiles((prev) => [...prev, ...selectedFiles]);
    setError('');
    // Do not auto-upload; user will click Send
  };

  const clearSelection = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFilePicker = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (loading) return;
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, [loading]);

  const onDragOver = (e) => {
    e.preventDefault();
  };

  // Get file size in readable format
  const getFileSize = (size) => {
    if (size < 1024) return size + ' B';
    else if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    else return (size / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="file-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt,.csv"
        multiple
        style={{ display: 'none' }}
        id="file-upload"
      />

      <div
        className={`dropzone ${loading ? 'is-loading' : ''}`}
        onClick={openFilePicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        role="button"
        tabIndex={0}
      >
        <div className="dropzone-icon">📎</div>
        <div className="dropzone-text">
          {files.length > 0
            ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
            : 'Drag and drop or click to add files'}
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, idx) => (
            <div key={idx} className="file-item">📄 {f.name} ({getFileSize(f.size)})</div>
          ))}
          <button className="btn btn--outline" onClick={clearSelection} disabled={loading}>Clear</button>
        </div>
      )}

      {error && <div className="file-upload-error">❌ {error}</div>}
    </div>
  );
};

export default FileUpload;
