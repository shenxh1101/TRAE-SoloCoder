import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Heart,
  Shuffle,
  RotateCcw,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Settings,
  Bot,
  Loader2,
  ScanFace,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useMemeStore } from '../store/memeStore';
import { 
  generateTextsFromTemplate,
  getRandomEmoji, 
  getRandomHotQuoteAsync,
  getEmotionLabel,
} from '../utils/textGenerator';
import { exportMemeToDataUrl } from '../components/MemeCanvas';
import { saveMeme } from '../db/indexedDB';
import { ImageUploader } from '../components/ImageUploader';
import { PresetEmojis } from '../components/PresetEmojis';
import { StyleSelector } from '../components/StyleSelector';
import { TextSuggestions } from '../components/TextSuggestions';
import { MemeCanvas } from '../components/MemeCanvas';
import { StyleToolbar } from '../components/StyleToolbar';
import { MemeStyle, EmotionType } from '../types';
import { loadFaceModels, isFaceModelLoaded, detectFaces } from '../services/faceDetection';
import { generateMemeTexts, setLLMApiKey } from '../services/llmService';

export function Editor() {
  const navigate = useNavigate();
  const [showFaceBox, setShowFaceBox] = useState(true);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'loading' | 'success' | 'no-face' | 'error'>('idle');

  const {
    imageData,
    textSettings,
    selectedStyle,
    generatedTexts,
    detectedFaces,
    detectedEmotion,
    isFaceDetecting,
    isGeneratingTexts,
    faceDetectionEnabled,
    setImageData,
    setTextSettings,
    setSelectedStyle,
    setGeneratedTexts,
    setDetectedFaces,
    setDetectedEmotion,
    setIsFaceDetecting,
    setIsGeneratingTexts,
    setFaceDetectionEnabled,
    resetState,
    resetDetection,
  } = useMemeStore();

  useEffect(() => {
    const initModels = async () => {
      if (faceDetectionEnabled && !isFaceModelLoaded()) {
        setIsModelLoading(true);
        const loaded = await loadFaceModels();
        setModelLoaded(loaded);
        setIsModelLoading(false);
      }
    };
    initModels();
  }, [faceDetectionEnabled]);

  const handleImageUpload = useCallback((dataUrl: string) => {
    resetState();
    setImageData(dataUrl);
    setDetectionStatus('idle');
  }, [setImageData, resetState]);

  const handleGenerateTexts = useCallback(async () => {
    if (!imageData) return;

    setIsFaceDetecting(true);
    setIsGeneratingTexts(true);
    setDetectionStatus('loading');

    let emotion: EmotionType = 'unknown';
    let faces: any[] = [];

    try {
      const img = new Image();
      img.src = imageData;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });

      faces = await detectFaces(img);
      
      const cleanFaces = faces.map(f => ({
        box: { x: f.box.x, y: f.box.y, width: f.box.width, height: f.box.height },
        emotion: f.emotion,
        confidence: f.confidence,
      }));

      setDetectedFaces(cleanFaces);

      emotion = cleanFaces.length > 0 ? cleanFaces[0].emotion : 'unknown';
      setDetectedEmotion(emotion);

      if (cleanFaces.length > 0) {
        setDetectionStatus('success');
      } else {
        setDetectionStatus('no-face');
      }
    } catch (error) {
      console.error('Face detection failed:', error);
      setDetectionStatus('error');
      setDetectedFaces([]);
      setDetectedEmotion('unknown');
    }

    try {
      const texts = await generateMemeTexts(selectedStyle, emotion, 5);
      if (texts && texts.length > 0) {
        setGeneratedTexts(texts);
      } else {
        const fallback = generateTextsFromTemplate(selectedStyle, 5);
        setGeneratedTexts(fallback);
      }
    } catch (error) {
      console.error('Text generation failed:', error);
      const fallback = generateTextsFromTemplate(selectedStyle, 5);
      setGeneratedTexts(fallback);
    } finally {
      setIsFaceDetecting(false);
      setIsGeneratingTexts(false);
    }
  }, [imageData, selectedStyle, setDetectedFaces, setDetectedEmotion, setGeneratedTexts, setIsFaceDetecting, setIsGeneratingTexts]);

  const handleSelectText = useCallback((text: string) => {
    setTextSettings({ content: text });
  }, [setTextSettings]);

  const handleRefreshTexts = useCallback(async () => {
    setIsGeneratingTexts(true);
    try {
      const emotion = detectedEmotion || 'unknown';
      const texts = await generateMemeTexts(selectedStyle, emotion, 5);
      if (texts && texts.length > 0) {
        setGeneratedTexts(texts);
      } else {
        setGeneratedTexts(generateTextsFromTemplate(selectedStyle, 5));
      }
    } catch {
      setGeneratedTexts(generateTextsFromTemplate(selectedStyle, 5));
    } finally {
      setIsGeneratingTexts(false);
    }
  }, [selectedStyle, detectedEmotion, setGeneratedTexts]);

  const handleStyleChange = useCallback((style: MemeStyle) => {
    setSelectedStyle(style);
  }, [setSelectedStyle]);

  const handleRandomMode = useCallback(async () => {
    const randomEmoji = getRandomEmoji();
    const randomQuote = await getRandomHotQuoteAsync();

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const colors = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#e0e7ff'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(0, 0, 300, 300);
      ctx.font = '150px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(randomEmoji.emoji, 150, 130);
      const dataUrl = canvas.toDataURL();
      setImageData(dataUrl);
    }

    setTextSettings({ content: randomQuote, x: 50, y: 85 });
    resetDetection();
    setDetectionStatus('idle');
  }, [setImageData, setTextSettings, resetDetection]);

  const handleDownload = async () => {
    if (!imageData) return;
    try {
      const dataUrl = await exportMemeToDataUrl(imageData, textSettings);
      const link = document.createElement('a');
      link.download = `meme-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      alert('下载失败，请重试');
    }
  };

  const handleSave = async () => {
    if (!imageData || !textSettings.content) return;
    try {
      const dataUrl = await exportMemeToDataUrl(imageData, textSettings);
      await saveMeme({
        imageData: dataUrl,
        textSettings,
        style: selectedStyle,
      });
      alert('已保存到收藏夹！');
    } catch (error) {
      alert('保存失败，请重试');
    }
  };

  const handleTextPositionChange = useCallback((x: number, y: number) => {
    setTextSettings({ x, y });
  }, [setTextSettings]);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setLLMApiKey(apiKey.trim());
      setShowApiSettings(false);
    }
  };

  const isProcessing = isFaceDetecting || isGeneratingTexts || isModelLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            ✨ AI 表情包生成器
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              title="API设置"
            >
              <Settings className="w-4 h-4" />
              设置
            </button>
            <button
              onClick={handleRandomMode}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg transition-all hover:scale-105"
            >
              <Shuffle className="w-4 h-4" />
              随缘模式
            </button>
            <button
              onClick={() => navigate('/favorites')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              <Heart className="w-4 h-4" />
              收藏夹
            </button>
          </div>
        </div>
      </header>

      {showApiSettings && (
        <div className="bg-white border-b border-gray-100 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bot className="w-4 h-4 inline mr-1" />
                  通义千问 API Key（可选，无Key使用内置配文库）
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  获取 API Key: <a href="https://dashscope.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">阿里云百炼控制台</a>
                </p>
              </div>
              <button
                onClick={handleSaveApiKey}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-500" />
                选择表情包
              </h2>
              {!imageData ? (
                <>
                  <ImageUploader onImageUpload={handleImageUpload} />
                  <PresetEmojis onSelectEmoji={handleImageUpload} />
                </>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={resetState}
                    className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重新选择图片
                  </button>
                </div>
              )}
            </div>

            {imageData && (
              <>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <StyleSelector
                    selectedStyle={selectedStyle}
                    onStyleChange={handleStyleChange}
                  />
                  <div className="mt-4">
                    <button
                      onClick={handleGenerateTexts}
                      disabled={isProcessing}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {isModelLoading ? '加载模型中...' : 
                           isFaceDetecting ? '识别面部中...' :
                           '生成配文中...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          AI 智能配文
                        </>
                      )}
                    </button>

                    {detectionStatus === 'loading' && (
                      <div className="flex items-center justify-center gap-2 mt-3 text-purple-500 text-sm">
                        <ScanFace className="w-4 h-4 animate-pulse" />
                        正在识别面部表情...
                      </div>
                    )}
                    {detectionStatus === 'success' && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">
                          识别到：{getEmotionLabel(detectedEmotion!)} ({detectedFaces.length}张人脸)
                        </span>
                        <button
                          onClick={() => setShowFaceBox(!showFaceBox)}
                          className="text-gray-400 hover:text-gray-600 ml-1"
                          title={showFaceBox ? '隐藏检测框' : '显示检测框'}
                        >
                          {showFaceBox ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    {detectionStatus === 'no-face' && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <XCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-600">未检测到人脸，已使用模板配文</span>
                      </div>
                    )}
                    {detectionStatus === 'error' && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">识别失败，已使用模板配文</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <TextSuggestions
                    texts={generatedTexts}
                    isLoading={isGeneratingTexts}
                    onSelectText={handleSelectText}
                    onRefresh={handleRefreshTexts}
                  />
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            {imageData ? (
              <>
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">预览效果</h2>
                  <MemeCanvas
                    imageData={imageData}
                    textSettings={textSettings}
                    detectedFaces={detectedFaces}
                    detectedEmotion={detectedEmotion}
                    showFaceBox={showFaceBox}
                    onTextPositionChange={handleTextPositionChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StyleToolbar
                    textSettings={textSettings}
                    onSettingsChange={setTextSettings}
                  />

                  <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-medium text-gray-600">自定义文字</h3>
                    <input
                      type="text"
                      value={textSettings.content}
                      onChange={(e) => setTextSettings({ content: e.target.value })}
                      placeholder="输入自定义文字..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />

                    <div className="pt-4 space-y-3">
                      <button
                        onClick={handleDownload}
                        disabled={!textSettings.content}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        下载表情包
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!textSettings.content}
                        className="w-full py-3 bg-white border-2 border-orange-500 text-orange-500 rounded-xl font-medium hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Heart className="w-5 h-5" />
                        保存到收藏夹
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  开始制作你的表情包
                </h2>
                <p className="text-gray-500">
                  上传图片或选择预设表情，AI 将为你生成有趣的配文
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          Made with ❤️ | AI 表情包生成器
        </div>
      </footer>
    </div>
  );
}
