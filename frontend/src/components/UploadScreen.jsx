import { useState, useRef, useCallback } from 'react';
import { useProblemStore } from '../store/useProblemStore';
import { solveProblem } from '../api/solveService';

export default function UploadScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const { setProblemData, setUploadStatus, setError, setLoading } = useProblemStore();

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG or PNG)');
      return;
    }

    // Validate file size (max 10MB to match backend)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    // Create preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [previewUrl]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select an image first');
      return;
    }

    setUploadError(null);
    setUploadStatus('uploading');
    setLoading(true);

    try {
      const result = await solveProblem(selectedFile);
      setProblemData(result);
    } catch (error) {
      setUploadError(error.message || 'Failed to process image. Please try again.');
      setError(error.message || 'Upload failed');
      setUploadStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setUploadError(null);
    setError(null);
    setUploadStatus('idle');
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadError(null);
    fileInputRef.current.value = '';
  };

  return (
    <div className="upload-screen">
      <div className="upload-container">
        <h1>Visualize Mechanics</h1>
        <p className="subtitle">Upload a physics problem photo to generate a 3D animation with worked solution</p>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />

          {selectedFile ? (
            <div className="file-preview">
              <img src={previewUrl} alt="Preview" />
              <div className="file-info">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button className="remove-btn" onClick={handleRemoveFile}>
                Remove
              </button>
            </div>
          ) : (
            <div className="drop-content">
              <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="drop-text">Drag & drop a physics problem photo here</p>
              <p className="drop-hint">or click to browse (JPEG, PNG up to 10MB)</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="error-message" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{uploadError}</span>
            <button onClick={handleRetry} className="retry-btn">Retry</button>
          </div>
        )}

        <button
          className={`upload-btn ${selectedFile ? '' : 'disabled'}`}
          onClick={handleUpload}
          disabled={!selectedFile}
        >
          Analyze & Generate Animation
        </button>

        <div className="supported-formats">
          <p>Supported scenarios:</p>
          <ul>
            <li>Projectile Motion</li>
            <li>1D Kinematics</li>
            <li>Inclined Plane</li>
            <li>Atwood Machine</li>
            <li>Energy Conservation</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .upload-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .upload-container {
          width: 100%;
          max-width: 500px;
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        h1 {
          text-align: center;
          margin: 0 0 0.5rem;
          color: #1a1a2e;
          font-size: 2rem;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin: 0 0 2rem;
          font-size: 1rem;
        }
        .drop-zone {
          border: 2px dashed #cbd5e0;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .drop-zone:hover:not(.has-file) {
          border-color: #4299e1;
          background: #ebf8ff;
        }
        .drop-zone.dragging {
          border-color: #4299e1;
          background: #ebf8ff;
        }
        .drop-zone.has-file {
          border-style: solid;
          border-color: #4299e1;
          background: #ebf8ff;
          padding: 1rem;
        }
        .upload-icon {
          color: #4299e1;
          margin-bottom: 1rem;
        }
        .drop-text {
          margin: 0 0 0.5rem;
          color: #2d3748;
          font-size: 1.1rem;
        }
        .drop-hint {
          margin: 0;
          color: #718096;
          font-size: 0.875rem;
        }
        .file-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
        }
        .file-preview img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
        }
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .file-name {
          font-weight: 500;
          color: #1a1a2e;
        }
        .file-size {
          font-size: 0.875rem;
          color: #718096;
        }
        .remove-btn {
          background: none;
          border: 1px solid #e53e3e;
          color: #e53e3e;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .remove-btn:hover {
          background: #e53e3e;
          color: white;
        }
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fff5f5;
          border: 1px solid #fc8181;
          border-radius: 8px;
          padding: 1rem;
          margin: 1.5rem 0;
          color: #c53030;
        }
        .retry-btn {
          margin-left: auto;
          background: #e53e3e;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }
        .retry-btn:hover {
          background: #c53030;
        }
        .upload-btn {
          width: 100%;
          padding: 1rem;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .upload-btn:hover:not(.disabled) {
          background: #3182ce;
        }
        .upload-btn.disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }
        .supported-formats {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }
        .supported-formats p {
          margin: 0 0 0.5rem;
          font-size: 0.875rem;
          color: #718096;
        }
        .supported-formats ul {
          margin: 0;
          padding-left: 1.25rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.25rem;
        }
        .supported-formats li {
          font-size: 0.875rem;
          color: #4a5568;
        }
      `}</style>
    </div>
  );
}