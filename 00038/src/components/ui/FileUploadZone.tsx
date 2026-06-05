import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { processFileUpload } from '../../utils/plasmaUtils';
import { FileUploadResponse, PLASMA_TYPE_LABELS } from '../../../shared/types';
import { cn } from '../../lib/utils';

interface FileUploadZoneProps {
  onUploadComplete: (response: FileUploadResponse) => void;
  className?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onUploadComplete, className }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<FileUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      try {
        const response = await processFileUpload(file);
        setUploadedFile(response);
        onUploadComplete(response);
      } catch (e) {
        setError(e instanceof Error ? e.message : '文件处理失败');
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleClear = () => {
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {!uploadedFile ? (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer overflow-hidden',
            isDragOver
              ? 'border-primary bg-primary/10 shadow-glow-lg scale-[1.02]'
              : error
              ? 'border-accent-red bg-accent-red/5'
              : 'border-border hover:border-primary/50 hover:bg-background-tertiary/30'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="absolute inset-0 bg-gradient-radial opacity-0 hover:opacity-100 transition-opacity duration-500" />

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.csv,.dat"
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploading ? (
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload size={32} className="text-primary animate-bounce" />
              </div>
              <p className="text-lg font-medium text-text-primary">正在处理文件...</p>
              <p className="text-sm text-text-tertiary mt-1">请稍候，正在解析参数</p>
            </div>
          ) : error ? (
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-red/20 flex items-center justify-center">
                <AlertTriangle size={32} className="text-accent-red" />
              </div>
              <p className="text-lg font-medium text-accent-red">{error}</p>
              <p className="text-sm text-text-tertiary mt-1">点击重新选择文件</p>
            </div>
          ) : (
            <div className="relative z-10">
              <div
                className={cn(
                  'w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300',
                  isDragOver ? 'bg-primary shadow-glow-lg' : 'bg-primary/20'
                )}
              >
                <Upload size={40} className={cn(isDragOver ? 'text-white' : 'text-primary')} />
              </div>
              <p className="text-xl font-display font-semibold text-text-primary mb-2">
                {isDragOver ? '释放以上传文件' : '拖拽文件到此处'}
              </p>
              <p className="text-text-secondary mb-4">
                或 <span className="text-primary hover:text-primary-light">点击选择文件</span>
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
                <FileText size={14} />
                <span>支持格式: .json, .txt, .csv, .dat</span>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
                  <Sparkles size={14} className="text-primary" />
                  <span>系统将自动识别等离子体类型并匹配物理模型</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-5 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-accent-green" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{uploadedFile.filename}</p>
                  <StatusBadgeMini status="success">解析成功</StatusBadgeMini>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-text-secondary">
                    识别类型:{' '}
                    <span className="text-primary font-medium">
                      {PLASMA_TYPE_LABELS[uploadedFile.detectedPlasmaType]}
                    </span>
                  </span>
                  <span className="text-sm text-text-secondary">
                    匹配模型:{' '}
                    <span className="text-accent-cyan font-medium">{uploadedFile.matchedModel}</span>
                  </span>
                </div>
                {uploadedFile.warnings.length > 0 && (
                  <div className="mt-2 p-2 bg-accent-orange/10 rounded-lg">
                    {uploadedFile.warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs text-accent-orange flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg hover:bg-background-tertiary text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadgeMini: React.FC<{ status: 'success' | 'warning' | 'error'; children: React.ReactNode }> = ({
  status,
  children,
}) => {
  const classes = {
    success: 'bg-accent-green/20 text-accent-green',
    warning: 'bg-accent-orange/20 text-accent-orange',
    error: 'bg-accent-red/20 text-accent-red',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', classes[status])}>
      {children}
    </span>
  );
};
