import React, { useState } from 'react';
import { MapUploader } from './MapUploader';
import 'bootstrap/dist/css/bootstrap.min.css';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadUrl(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file before uploading.');
      return;
    }

    setUploading(true);

    try {
      const url = await MapUploader.uploadMapAsync(selectedFile);

      if (url) {
        setUploadUrl(url);
        setError(null);
      } else {
        setError('Failed to upload the map.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h1>Map Uploader</h1>
      <div className="mb-3">
        <input type="file" onChange={handleFileChange} className="form-control" />
      </div>
      <button onClick={handleUpload} className="btn btn-primary" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Map'}
      </button>

      {uploadUrl && (
        <div className="alert alert-success mt-3">
          Map uploaded successfully: <a href={uploadUrl} target="_blank" rel="noopener noreferrer">{uploadUrl}</a>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3">{error}</div>
      )}
    </div>
  );
};

export default App;
