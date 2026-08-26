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
        <header className="upload-header">
          <h1>Visualize Mechanics</h1>
          <p className="subtitle">Upload a physics problem photo to generate a 3D animation with worked solution</p>
        </header>

        <div
          className={`upload-drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); }}}
          aria-label="Drop zone for physics problem image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          {selectedFile ? (
            <div className="upload-file-preview">
              <img src={previewUrl} alt="Preview of uploaded physics problem" />
              <div className="upload-file-info">
                <span className="upload-file-name">{selectedFile.name}</span>
                <span className="upload-file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button className="btn btn-ghost upload-remove-btn" onClick={handleRemoveFile} type="button">
                Remove
              </button>
            </div>
          ) : (
            <div className="upload-drop-content">
              <div className="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="upload-drop-text">Drag & drop a physics problem photo here</p>
              <p className="upload-drop-hint">or click to browse (JPEG, PNG up to 10MB)</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="upload-error" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{uploadError}</span>
            <button onClick={handleRetry} className="btn btn-ghost" type="button">Retry</button>
          </div>
        )}

        <button
          className={`btn btn-primary upload-submit-btn ${selectedFile ? '' : 'disabled'}`}
          onClick={handleUpload}
          disabled={!selectedFile}
        >
          Analyze & Generate Animation
        </button>

        <div className="upload-supported">
          <p>Supported scenarios:</p>
          <ul>
            <li>Projectile Motion</li>
            <li>1D Kinematics</li>
            <li>Inclined Plane</li>
            <li>Atwood Machine</li>
            <li>Energy Conservation</li>
            <li>Mass-Spring Systems</li>
            <li>Rotational Kinematics</li>
            <li>Torque</li>
            <li>Collisions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}