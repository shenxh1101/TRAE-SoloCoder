import { useRef, useState } from 'react';
import { Camera, Download, Upload, RotateCcw, FileJson } from 'lucide-react';
import { usePagodaStore } from '@/store/usePagodaStore';
import { takeScreenshot } from '@/utils/screenshot';
import { exportConfig, importConfig } from '@/utils/config';
import { PagodaConfig } from '@/types';

export default function ToolBar() {
  const { config, setConfig, resetConfig } = usePagodaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleScreenshot = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    takeScreenshot(`pagoda-${timestamp}.png`);
    showSuccess('截图已保存');
  };

  const handleExport = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    exportConfig(config, `pagoda-config-${timestamp}.json`);
    showSuccess('配置已导出');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedConfig = await importConfig(file);
      setConfig(importedConfig as PagodaConfig);
      setImportError(null);
      showSuccess('配置已导入');
    } catch (error) {
      setImportError((error as Error).message);
      setTimeout(() => setImportError(null), 3000);
    }

    e.target.value = '';
  };

  const handleReset = () => {
    resetConfig();
    showSuccess('已重置为默认配置');
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-slate-800/80 backdrop-blur-md rounded-xl px-4 py-3 border border-slate-700 shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors"
            title="截图保存"
          >
            <Camera size={18} />
            <span className="text-sm">截图</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="导出配置"
          >
            <Download size={18} />
            <span className="text-sm">导出</span>
            <FileJson size={14} />
          </button>

          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="导入配置"
          >
            <Upload size={18} />
            <span className="text-sm">导入</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-px h-8 bg-slate-600 mx-2" />

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors"
            title="重置配置"
          >
            <RotateCcw size={18} />
            <span className="text-sm">重置</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
          {successMessage}
        </div>
      )}

      {importError && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-rose-500/90 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
          {importError}
        </div>
      )}
    </div>
  );
}
