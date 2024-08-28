"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import "./global.css";

const CHUNK_SIZE = 512 * 1024; // 0.5 MB

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
    links.unshift(newLink); // Добавляем новый файл в начало массива
    localStorage.setItem('mapLinks', JSON.stringify(links));
  }
};

const Home: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<MapEntry[]>([]);

  useEffect(() => {
    const sortedLinks = LinkManager.getLinks().sort((a, b) => b.timestamp - a.timestamp);
    setLinks(sortedLinks);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setUploadProgress([]); // Сбрасываем прогресс
      setUploadUrl(null);
      setError(null);
    }
  };

  const uploadChunk = async (chunk: Blob, index: number, totalChunks: number) => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('fileName', file!.name);
    formData.append('chunkIndex', index.toString());
    formData.append('totalChunks', totalChunks.toString());

    try {
      const response = await axios.post('/api/upload', formData);
      setUploadProgress((prev) => [...prev, index + 1]);

      // Если это последний chunk, сохраняем URL
      if (index === totalChunks - 1) {
        setUploadUrl(response.data.url); // Устанавливаем URL, который вернул сервер
        LinkManager.addLink(file!.name, response.data.url);
        const sortedLinks = LinkManager.getLinks().sort((a, b) => b.timestamp - a.timestamp);
        setLinks(sortedLinks);
      }
    } catch (err) {
      setError('Failed to upload chunk ' + index);
      throw err;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file.');
      return;
    }

    setLoading(true);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      try {
        await uploadChunk(chunk, i, totalChunks);
      } catch {
        setLoading(false);
        return;
      }
    }

    setLoading(false);
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
              accept=".map" 
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full bg-[#2c2c2c] text-[#bab1a8] border-[#3c3c3c]" 
            />
          </div>
          {loading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full">
                <div
                  className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                  style={{ width: `${(uploadProgress.length / Math.ceil(file!.size / CHUNK_SIZE)) * 100}%` }}
                >
                  {uploadProgress.length}/{Math.ceil(file!.size / CHUNK_SIZE)} chunks uploaded
                </div>
              </div>
            </div>
          )}
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
