"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "./global.css"

interface MapEntry {
  name: string;
  url: string;
  timestamp: number;
}

const LinkManager = {
  getLinks: (): MapEntry[] => {
    if (typeof window !== 'undefined') {
      const storedLinks = localStorage.getItem('mapLinks');
      return storedLinks ? JSON.parse(storedLinks) : [];
    }
    return [];
  },
  addLink: (name: string, url: string) => {
    const newLink = { name, url, timestamp: Date.now() };
    const links = LinkManager.getLinks();
    links.push(newLink);
    localStorage.setItem('mapLinks', JSON.stringify(links));
  }
};

const Home: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<MapEntry[]>([]);

  useEffect(() => {
    setLinks(LinkManager.getLinks());
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
    setUploadUrl(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file.');
      return;
    }
  
    setLoading(true);
    setError(null);
    setUploadUrl(null);
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (response.data.url) {
        setUploadUrl(response.data.url);
        LinkManager.addLink(file.name, response.data.url);
        setLinks(LinkManager.getLinks());
      } else {
        setError('Failed to upload the map.');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError('Error uploading the map: ' + err.response.data.error);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#151413] text-[#bab1a8] font-sans">
      <div className="w-full max-w-md p-8 bg-[#1b1b1b] rounded-lg shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-8">Map Upload</h2>
        <form>
          <div className="mb-6">
            <label className="block text-lg mb-2">Choose file:</label>
            <input 
              type="file" 
              accept=".map" // Разрешить только файлы с расширением .map
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full bg-[#2c2c2c] text-[#bab1a8] border-[#3c3c3c]" 
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className={`btn w-full ${loading ? 'bg-[#c94d3f]' : 'bg-[#d9534f] hover:bg-[#b0413d]'} text-white font-bold py-2 px-4 rounded`}
          >
            {loading ? 'Uploading...' : 'Upload Map'}
          </button>
        </form>
        {uploadUrl && (
          <div className="mt-6 alert shadow-lg bg-[#4e8d59] text-white">
            <div className="break-all">
              Map successfully uploaded: <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className="text-white underline">{uploadUrl}</a>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-6 alert shadow-lg bg-[#b0413d] text-white">
            <div>
              <span>{error}</span>
            </div>
          </div>
        )}
        <div className="mt-10">
          <h3 className="text-xl font-semibold mb-4 text-[#d9534f]">Saved Maps</h3>
          <ul className="space-y-4">
            {links.map((link, index) => (
              <li key={index} className="p-4 bg-[#2c2c2c] rounded-md shadow-md">
                <strong className="text-lg">{link.name}</strong><br />
                <small className="text-[#bab1a8]">{new Date(link.timestamp).toLocaleString()}</small><br />
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#d9534f] underline break-words">{link.url}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
