import { useRef, useCallback, useState } from 'react';
import { Upload, Camera, Save, FolderOpen, RotateCcw, Moon, Sun, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { useSceneStore } from '../store/useSceneStore';
import { useScreenshot } from '../hooks/useScreenshot';
import { fileToBase64, downloadConfig, deserializeConfig } from '../utils/config';
import type { GlWithRefs } from './Scene';

interface ToolbarProps {
  gl: GlWithRefs | null;
}

export const Toolbar = ({ gl }: ToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);
  const [showReplaceHint, setShowReplaceHint] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const lucidity = useSceneStore((state) => state.config.lucidity);
  const selectedFragmentId = useSceneStore((state) => state.selectedFragmentId);
  const config = useSceneStore((state) => state.config);
  const setLucidity = useSceneStore((state) => state.setLucidity);
  const updateFragmentImage = useSceneStore((state) => state.updateFragmentImage);
  const loadConfig = useSceneStore((state) => state.loadConfig);
  const resetToDefault = useSceneStore((state) => state.resetToDefault);

  const takeScreenshot = useScreenshot(gl);

  const handleUploadClick = useCallback(() => {
    if (!selectedFragmentId) {
      setShowReplaceHint(true);
      setTimeout(() => setShowReplaceHint(false), 2500);
      return;
    }
    fileInputRef.current?.click();
  }, [selectedFragmentId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedFragmentId) return;

      try {
        setLoadingMessage(`正在处理图片: ${file.name}...`);
        const base64 = await fileToBase64(file);
        updateFragmentImage(selectedFragmentId, base64, file.name);
        setLoadingMessage('图片更新成功！');
        setTimeout(() => setLoadingMessage(null), 2000);
      } catch (err) {
        console.error('Failed to read file:', err);
        const errorMsg = err instanceof Error ? err.message : '文件读取失败';
        setLoadingMessage(`❌ ${errorMsg}`);
        setTimeout(() => setLoadingMessage(null), 4000);
      }

      e.target.value = '';
    },
    [selectedFragmentId, updateFragmentImage]
  );

  const handleSaveConfig = useCallback(() => {
    try {
      setLoadingMessage('正在生成配置文件...');
      downloadConfig(config);
      setTimeout(() => setLoadingMessage(null), 2000);
    } catch (err) {
      console.error('保存失败:', err);
      const errorMsg = err instanceof Error ? err.message : '保存失败';
      setLoadingMessage(`❌ ${errorMsg}`);
      setTimeout(() => setLoadingMessage(null), 4000);
    }
  }, [config]);

  const handleLoadConfig = useCallback(() => {
    configInputRef.current?.click();
  }, []);

  const handleConfigFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 30) {
        alert(`配置文件过大 (${fileSizeMB.toFixed(1)}MB)，最大支持 30MB`);
        e.target.value = '';
        return;
      }

      setIsLoadingConfig(true);
      setLoadingMessage(`正在加载配置 (${fileSizeMB.toFixed(1)}MB)...`);

      try {
        const content = await file.text();
        const result = await deserializeConfig(content);

        if (result.error) {
          setLoadingMessage(`❌ ${result.error}`);
          setTimeout(() => setLoadingMessage(null), 5000);
          return;
        }

        if (result.warning) {
          const showWarning = confirm(`⚠️  ${result.warning}\n\n是否继续加载？`);
          if (!showWarning) {
            setLoadingMessage('加载已取消');
            setTimeout(() => setLoadingMessage(null), 2000);
            e.target.value = '';
            return;
          }
        }

        if (result.config) {
          loadConfig(result.config);
          setLoadingMessage(`✅ 配置加载成功！(${result.totalSizeMB.toFixed(1)}MB)`);
          setTimeout(() => setLoadingMessage(null), 3000);
        }
      } catch (err) {
        console.error('加载配置失败:', err);
        const errorMsg = err instanceof Error ? err.message : '加载失败';
        setLoadingMessage(`❌ ${errorMsg}`);
        setTimeout(() => setLoadingMessage(null), 5000);
      } finally {
        setIsLoadingConfig(false);
      }

      e.target.value = '';
    },
    [loadConfig]
  );

  const getLucidityLabel = () => {
    if (lucidity < 0.25) return '深度梦境';
    if (lucidity < 0.5) return '朦胧';
    if (lucidity < 0.75) return '半清醒';
    return '完全清醒';
  };

  const getLucidityIcon = () => {
    if (lucidity < 0.5) return <Moon className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 bg-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-serif text-white/90 tracking-wide">
              梦境碎片
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md mx-8">
            {getLucidityIcon()}
            <span className="text-xs text-white/60 whitespace-nowrap w-16">
              {getLucidityLabel()}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={lucidity}
              onChange={(e) => setLucidity(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r
                [&::-webkit-slider-thumb]:from-cyan-400 [&::-webkit-slider-thumb]:to-purple-500
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.6)]
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-cyan-400
                [&::-moz-range-thumb]:to-purple-500 [&::-moz-range-thumb]:border-0"
              style={{
                background: `linear-gradient(to right, #00d4ff 0%, #a855f7 ${lucidity * 100}%, rgba(255,255,255,0.1) ${lucidity * 100}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUploadClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${selectedFragmentId
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30'
                  : 'bg-white/5 text-white/40 border border-white/5 cursor-not-allowed'}`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">替换图片</span>
            </button>

            <button
              onClick={takeScreenshot}
              aria-label="截图"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all duration-300"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">截图</span>
            </button>

            <button
              onClick={handleSaveConfig}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">保存</span>
            </button>

            <button
              onClick={handleLoadConfig}
              aria-label="加载配置"
              disabled={isLoadingConfig}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderOpen className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">加载</span>
            </button>

            <button
              onClick={resetToDefault}
              className="flex items-center gap-2 p-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/5 hover:border-white/20 transition-all duration-300"
              title="重置场景"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showReplaceHint && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-5 py-3 bg-gradient-to-r from-purple-500/90 to-cyan-500/90 backdrop-blur-xl rounded-xl text-white text-sm font-medium shadow-2xl animate-pulse">
            请先点击一个梦境碎片，再上传图片替换
          </div>
        )}

        {loadingMessage && (
          <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 px-5 py-3 backdrop-blur-xl rounded-xl text-sm font-medium shadow-2xl transition-all duration-300 ${
            loadingMessage.includes('❌') 
              ? 'bg-gradient-to-r from-red-500/90 to-orange-500/90 text-white'
              : loadingMessage.includes('✅')
              ? 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white'
              : 'bg-gradient-to-r from-purple-500/90 to-cyan-500/90 text-white'
          }`}>
            <div className="flex items-center gap-2">
              {loadingMessage.includes('正在') && !loadingMessage.includes('❌') && !loadingMessage.includes('✅') && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {loadingMessage.includes('❌') && <AlertTriangle className="w-4 h-4" />}
              <span>{loadingMessage.replace(/^[❌✅]\s*/, '')}</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        ref={configInputRef}
        type="file"
        accept="application/json"
        onChange={handleConfigFileChange}
        className="hidden"
      />
    </div>
  );
};
