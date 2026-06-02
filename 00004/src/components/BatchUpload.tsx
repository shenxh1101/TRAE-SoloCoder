import { useState, useRef } from 'react';
import { Upload, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { batchProcess, getDownloadUrl } from '../utils/api';
import { BatchResult } from '../types';

export function BatchUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/plain') {
      setFile(droppedFile);
      setResults(null);
      setDownloadUrl(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setDownloadUrl(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const data = await batchProcess(file);
      setResults(data.results);
      setDownloadUrl(data.downloadUrl);
    } catch (error) {
      console.error('Batch processing failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(getDownloadUrl(downloadUrl), '_blank');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 blur-3xl rounded-3xl" />
        
        <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">批量处理</h2>
              <p className="text-slate-400 text-sm">上传TXT文件，每行歌词批量转换</p>
            </div>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-600/50 hover:border-slate-500/50 hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 size={32} className="text-green-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <Upload size={40} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-300 mb-1">拖拽TXT文件到此处，或点击选择</p>
                <p className="text-slate-500 text-sm">每行一段歌词，将批量生成所有风格结果</p>
              </>
            )}
          </div>

          {file && !results && (
            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  开始批量处理
                </>
              )}
            </button>
          )}

          {results && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400">
                  已处理 <span className="text-cyan-400 font-semibold">{results.length}</span> 行歌词
                </span>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center gap-2"
                >
                  <Download size={18} />
                  下载ZIP
                </button>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {results.slice(0, 5).map((result, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-300 text-sm truncate">
                      <span className="text-slate-500 mr-2">{idx + 1}.</span>
                      {result.line}
                    </p>
                  </div>
                ))}
                {results.length > 5 && (
                  <p className="text-center text-slate-500 text-sm py-2">
                    ...还有 {results.length - 5} 行结果
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
