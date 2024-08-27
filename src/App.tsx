import React, { useState } from 'react';
import { MapUploader } from './MapUploader';

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploadUrl, setUploadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
        setUploadUrl(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setLoading(true);

        try {
            const url = await MapUploader.uploadMapAsync(file);
            if (url) {
                setUploadUrl(url);
            } else {
                setError('Failed to upload the map.');
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError('Error uploading map: ' + err.message);
            } else {
                setError('Unknown error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Upload Map'}
            </button>
            {uploadUrl && <p>Map uploaded successfully: <a href={uploadUrl} target="_blank" rel="noopener noreferrer">{uploadUrl}</a></p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default App;
