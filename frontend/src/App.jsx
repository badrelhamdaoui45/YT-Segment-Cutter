import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Video, 
  Scissors, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Clock,
  ExternalLink
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('00:00:10');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState('720');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let interval;
    if (taskId && (status === 'PENDING' || status === 'PROCESSING')) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/status/${taskId}`);
          setStatus(response.data.status);
          if (response.data.statusMessage) {
            setStatusMessage(response.data.statusMessage);
          } else if (response.data.status) {
            setStatusMessage(response.data.status);
          }

          if (response.data.progress) {
            setProgress(response.data.progress);
          }

          if (response.data.status === 'SUCCESS') {
            setResult(response.data.result);
            setLoading(false);
            clearInterval(interval);
          } else if (response.data.status === 'FAILURE') {
            setError(response.data.error || 'Task failed');
            setLoading(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setTaskId(null);
    setStatus('PENDING');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/download`, {
        url,
        start_time: startTime,
        end_time: endTime,
        format: 'mp4',
        quality: quality
      });
      setTaskId(response.data.task_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start download');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result || !result.file_url) {
      console.error('Download result or file_url is missing:', result);
      alert('Download link not found. Please try cutting the video again.');
      return;
    }

    const downloadUrl = `${API_BASE_URL}${result.file_url}`;
    console.log('Starting download from:', downloadUrl);
    
    // Using a direct link approach is faster and more memory-efficient than Blob
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'yt_segment.mp4');
    // Ensure it opens in a way that triggers download
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-2xl mb-4 border border-red-500/20">
            <Video className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            YT Segment Cutter
          </h1>
          <p className="text-slate-400 mt-2">
            Cut and download specific parts of any YouTube video in seconds
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full" />

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">
                YouTube URL
              </label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 pl-11 outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all group-hover:border-white/20"
                />
                <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">
                  Start Time
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="00:00:00"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 pl-11 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all group-hover:border-white/20"
                  />
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">
                  End Time
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="00:00:10"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 pl-11 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all group-hover:border-white/20"
                  />
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">
                Quality
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20 appearance-none cursor-pointer"
              >
                <option value="1080">1080p (Full HD)</option>
                <option value="720">720p (HD)</option>
                <option value="480">480p (SD)</option>
                <option value="360">360p (Low)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-slate-700 disabled:to-slate-800 text-white font-semibold py-4 rounded-xl shadow-lg shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 overflow-hidden relative"
            >
              {loading && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
              )}
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {status === 'PENDING' ? 'Initializing...' : (statusMessage || 'Processing Video...')}
                </>
              ) : (
                <>
                  <Scissors className="w-5 h-5" />
                  Cut & Download
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 text-emerald-400 mb-4">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="font-bold text-lg">Download Ready!</h3>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-5 h-5" />
                Save MP4 File
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Built with FastAPI, Celery, and yt-dlp
        </p>
      </div>
    </div>
  );
}

export default App;
