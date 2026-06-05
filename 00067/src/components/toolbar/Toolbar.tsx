import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Pencil,
  Eraser,
  Minus,
  Square,
  Circle,
  Type,
  Undo2,
  Redo2,
  Download,
  ImagePlus,
  Users,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToolStore, type ToolType } from '@/store/useToolStore';
import { useLayerStore } from '@/store/useLayerStore';
import { useRoomStore } from '@/store/useRoomStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  mergeCanvases,
  exportCanvasToPNG,
  exportActiveLayerToPNG,
  exportToPSD,
} from '@/utils/export';

const tools: { type: ToolType; icon: typeof Pencil; label: string }[] = [
  { type: 'pen', icon: Pencil, label: '画笔' },
  { type: 'eraser', icon: Eraser, label: '橡皮擦' },
  { type: 'line', icon: Minus, label: '直线' },
  { type: 'rectangle', icon: Square, label: '矩形' },
  { type: 'circle', icon: Circle, label: '圆形' },
  { type: 'text', icon: Type, label: '文字' },
];

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export default function Toolbar() {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { currentTool, setTool } = useToolStore();
  const {
    activeLayerId,
    layers,
    undoLayer,
    redoLayer,
    createLayer,
    setActiveLayer,
    setLayerImageData,
  } = useLayerStore();
  const { roomCode, users, userId } = useRoomStore();
  const { sendHistoryAction, isConnected } = useWebSocket();

  const activeLayer = activeLayerId ? layers.find((l) => l.id === activeLayerId) : null;
  const canUndo = activeLayer ? activeLayer.historyIndex >= 0 : false;
  const canRedo = activeLayer
    ? activeLayer.historyIndex < activeLayer.history.length - 1
    : false;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUndo = useCallback(() => {
    if (activeLayerId && canUndo) {
      undoLayer(activeLayerId);
      if (isConnected) {
        sendHistoryAction('undo', activeLayerId);
      }
    }
  }, [activeLayerId, canUndo, undoLayer, isConnected, sendHistoryAction]);

  const handleRedo = useCallback(() => {
    if (activeLayerId && canRedo) {
      redoLayer(activeLayerId);
      if (isConnected) {
        sendHistoryAction('redo', activeLayerId);
      }
    }
  }, [activeLayerId, canRedo, redoLayer, isConnected, sendHistoryAction]);

  const handleExportPNG = useCallback(async () => {
    try {
      const canvas = await mergeCanvases(layers, CANVAS_WIDTH, CANVAS_HEIGHT);
      exportCanvasToPNG(canvas, `whiteboard-${roomCode || 'untitled'}.png`);
    } catch (error) {
      console.error('导出 PNG 失败:', error);
    }
    setExportMenuOpen(false);
  }, [layers, roomCode]);

  const handleExportCurrentLayer = useCallback(() => {
    try {
      exportActiveLayerToPNG(layers, activeLayerId, CANVAS_WIDTH, CANVAS_HEIGHT);
    } catch (error) {
      console.error('导出当前图层失败:', error);
    }
    setExportMenuOpen(false);
  }, [layers, activeLayerId]);

  const handleExportPSD = useCallback(async () => {
    try {
      await exportToPSD(layers, CANVAS_WIDTH, CANVAS_HEIGHT, `design-${roomCode || 'untitled'}.psd.zip`);
    } catch (error) {
      console.error('导出 PSD 失败:', error);
    }
    setExportMenuOpen(false);
  }, [layers, roomCode]);

  const handleImportImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        console.error('请选择图片文件');
        return;
      }

      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          if (imageData) {
            const img = new Image();
            img.onload = () => {
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = CANVAS_WIDTH;
              tempCanvas.height = CANVAS_HEIGHT;
              const tempCtx = tempCanvas.getContext('2d');

              if (tempCtx) {
                const scale = Math.min(
                  CANVAS_WIDTH / img.width,
                  CANVAS_HEIGHT / img.height
                );
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
                const offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;

                tempCtx.fillStyle = 'transparent';
                tempCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                tempCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

                const processedImageData = tempCanvas.toDataURL('image/png');
                const newLayer = createLayer(`图片 - ${file.name}`);
                setLayerImageData(newLayer.id, processedImageData, true);
                setActiveLayer(newLayer.id);
              }
            };
            img.onerror = () => {
              console.error('加载图片失败');
            };
            img.src = imageData;
          }
        };
        reader.onerror = () => {
          console.error('读取图片文件失败');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('导入图片失败:', error);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [createLayer, setLayerImageData, setActiveLayer]
  );

  const handleCopyRoomCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-14 bg-gray-800 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setTool(tool.type)}
              title={tool.label}
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-all duration-200',
                currentTool === tool.type
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:bg-gray-600 hover:text-white'
              )}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-white/10" />

        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="撤销"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              canUndo
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-600 cursor-not-allowed'
            )}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="重做"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              canRedo
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-600 cursor-not-allowed'
            )}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" />

        <div className="flex items-center gap-1">
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="导出"
              className="flex items-center gap-1.5 w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            {exportMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-gray-700 rounded-lg shadow-xl border border-white/10 overflow-hidden z-50">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出 PNG
                </button>
                <button
                  onClick={handleExportCurrentLayer}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  导出当前图层
                </button>
                <button
                  onClick={handleExportPSD}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  导出 PSD
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleImportImage}
            title="导入图片"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5">
          <span className="text-gray-400 text-sm">房间码:</span>
          <span className="text-white font-mono font-bold tracking-wider">{roomCode}</span>
          <button
            onClick={handleCopyRoomCode}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="复制房间码"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">{users.length} 人在线</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-gray-700 rounded-lg shadow-xl border border-white/10 overflow-hidden z-50">
              <div className="px-4 py-2 border-b border-white/10">
                <h3 className="text-sm font-medium text-white">在线用户</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm',
                      user.id === userId ? 'bg-blue-500/20' : 'hover:bg-gray-600/50'
                    )}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: user.color || '#3b82f6' }}
                    />
                    <span className="text-gray-300 truncate flex-1">
                      {user.name}
                      {user.id === userId && ' (你)'}
                      {user.isHost && ' (房主)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
