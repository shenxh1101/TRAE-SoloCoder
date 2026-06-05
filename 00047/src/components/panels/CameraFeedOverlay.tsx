import { useEffect, useRef, useState, useCallback } from 'react';
import { Video, X, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraFeedOverlayProps {
  cameraId: string;
  cameraName: string;
  location: [number, number, number];
  onClose?: () => void;
}

interface Vehicle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: 'horizontal' | 'vertical';
  color: string;
  lane: number;
}

const CANVAS_W = 640;
const CANVAS_H = 480;
const ROAD_Y_POSITIONS = [160, 240, 320];
const ROAD_X_POSITIONS = [200, 430];

function createInitialVehicles(): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const carColors = ['#c0c0c0', '#2c2c2c', '#1a3a5c', '#5c1a1a', '#3a5c1a'];
  for (let i = 0; i < 8; i++) {
    const isHorizontal = Math.random() > 0.3;
    const lane = isHorizontal
      ? Math.floor(Math.random() * ROAD_Y_POSITIONS.length)
      : Math.floor(Math.random() * ROAD_X_POSITIONS.length);
    vehicles.push({
      x: isHorizontal ? Math.random() * CANVAS_W : ROAD_X_POSITIONS[lane],
      y: isHorizontal ? ROAD_Y_POSITIONS[lane] : Math.random() * CANVAS_H,
      width: isHorizontal ? 24 + Math.random() * 12 : 10 + Math.random() * 4,
      height: isHorizontal ? 10 + Math.random() * 4 : 24 + Math.random() * 12,
      speed: 0.4 + Math.random() * 1.2,
      direction: isHorizontal ? 'horizontal' : 'vertical',
      color: carColors[Math.floor(Math.random() * carColors.length)],
      lane,
    });
  }
  return vehicles;
}

function drawRoads(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)';
  ctx.lineWidth = 2;

  ROAD_Y_POSITIONS.forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();

    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = 'rgba(120, 120, 120, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, y - 15);
    ctx.lineTo(CANVAS_W, y - 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y + 15);
    ctx.lineTo(CANVAS_W, y + 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)';
  });

  ROAD_X_POSITIONS.forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();

    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = 'rgba(120, 120, 120, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x - 15, 0);
    ctx.lineTo(x - 15, CANVAS_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 15, 0);
    ctx.lineTo(x + 15, CANVAS_H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)';
  });
}

function drawGrid(ctx: CanvasRenderingContext2D, nightVision: boolean) {
  const gridColor = nightVision
    ? 'rgba(0, 255, 0, 0.06)'
    : 'rgba(56, 139, 253, 0.04)';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  const spacing = 40;
  for (let x = 0; x < CANVAS_W; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_H; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
}

function drawScanLines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let y = 0; y < CANVAS_H; y += 3) {
    ctx.fillRect(0, y, CANVAS_W, 1);
  }
}

function drawNoise(ctx: CanvasRenderingContext2D, intensity: number) {
  const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  const data = imageData.data;
  const pixelCount = Math.floor(CANVAS_W * CANVAS_H * intensity);
  for (let i = 0; i < pixelCount; i++) {
    const idx = Math.floor(Math.random() * (CANVAS_W * CANVAS_H)) * 4;
    const noise = Math.random() * 40 - 20;
    data[idx] = Math.min(255, Math.max(0, data[idx] + noise));
    data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + noise));
    data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawVehicles(ctx: CanvasRenderingContext2D, vehicles: Vehicle[]) {
  vehicles.forEach((v) => {
    ctx.fillStyle = v.color;
    ctx.fillRect(v.x, v.y, v.width, v.height);

    ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
    if (v.direction === 'horizontal') {
      ctx.fillRect(v.x + v.width - 2, v.y + 1, 2, 2);
      ctx.fillRect(v.x + v.width - 2, v.y + v.height - 3, 2, 2);
    } else {
      ctx.fillRect(v.x + 1, v.y, 2, 2);
      ctx.fillRect(v.x + v.width - 3, v.y, 2, 2);
    }

    ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
    if (v.direction === 'horizontal') {
      ctx.fillRect(v.x, v.y + 1, 2, 2);
      ctx.fillRect(v.x, v.y + v.height - 3, 2, 2);
    } else {
      ctx.fillRect(v.x + 1, v.y + v.height - 2, 2, 2);
      ctx.fillRect(v.x + v.width - 3, v.y + v.height - 2, 2, 2);
    }
  });
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  cameraId: string,
  nightVision: boolean,
  isOnline: boolean,
  frameCount: number
) {
  const textColor = nightVision ? '#00ff00' : '#00e5ff';
  const dimColor = nightVision ? 'rgba(0,255,0,0.6)' : 'rgba(0,229,255,0.6)';

  ctx.font = '12px "JetBrains Mono", monospace';

  const now = new Date();
  const timestamp = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  ctx.fillStyle = dimColor;
  ctx.textAlign = 'left';
  ctx.fillText(timestamp, 8, CANVAS_H - 10);

  ctx.textAlign = 'right';
  ctx.fillText(`CAM:${cameraId}`, CANVAS_W - 8, CANVAS_H - 10);

  ctx.textAlign = 'left';
  ctx.fillStyle = isOnline ? '#00ff00' : '#ff3333';
  ctx.beginPath();
  ctx.arc(14, 18, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isOnline ? 'rgba(0,255,0,0.8)' : 'rgba(255,51,51,0.8)';
  ctx.fillText(isOnline ? 'ONLINE' : 'OFFLINE', 24, 22);

  const showRec = Math.floor(frameCount / 30) % 2 === 0;
  if (showRec && isOnline) {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(CANVAS_W - 50, 18, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff0000';
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('REC', CANVAS_W - 8, 22);
    ctx.font = '12px "JetBrains Mono", monospace';
  }

  ctx.strokeStyle = textColor;
  ctx.lineWidth = 1;

  const cornerLen = 20;
  const cornerOffset = 6;

  ctx.beginPath();
  ctx.moveTo(cornerOffset, cornerOffset + cornerLen);
  ctx.lineTo(cornerOffset, cornerOffset);
  ctx.lineTo(cornerOffset + cornerLen, cornerOffset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(CANVAS_W - cornerOffset - cornerLen, cornerOffset);
  ctx.lineTo(CANVAS_W - cornerOffset, cornerOffset);
  ctx.lineTo(CANVAS_W - cornerOffset, cornerOffset + cornerLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cornerOffset, CANVAS_H - cornerOffset - cornerLen);
  ctx.lineTo(cornerOffset, CANVAS_H - cornerOffset);
  ctx.lineTo(cornerOffset + cornerLen, CANVAS_H - cornerOffset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(CANVAS_W - cornerOffset - cornerLen, CANVAS_H - cornerOffset);
  ctx.lineTo(CANVAS_W - cornerOffset, CANVAS_H - cornerOffset);
  ctx.lineTo(CANVAS_W - cornerOffset, CANVAS_H - cornerOffset - cornerLen);
  ctx.stroke();

  const crossSize = 12;
  const crossX = CANVAS_W / 2;
  const crossY = CANVAS_H / 2;
  ctx.strokeStyle = nightVision ? 'rgba(0,255,0,0.25)' : 'rgba(0,229,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(crossX - crossSize, crossY);
  ctx.lineTo(crossX + crossSize, crossY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(crossX, crossY - crossSize);
  ctx.lineTo(crossX, crossY + crossSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(crossX, crossY, crossSize * 0.8, 0, Math.PI * 2);
  ctx.stroke();
}

export default function CameraFeedOverlay({
  cameraId,
  cameraName,
  onClose,
}: CameraFeedOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const vehiclesRef = useRef<Vehicle[]>(createInitialVehicles());
  const frameCountRef = useRef(0);
  const [nightVision, setNightVision] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const updateVehicles = useCallback(() => {
    const vehicles = vehiclesRef.current;
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.direction === 'horizontal') {
        v.x += v.speed;
        if (v.x > CANVAS_W + 10) {
          v.x = -v.width - 10;
        }
      } else {
        v.y += v.speed;
        if (v.y > CANVAS_H + 10) {
          v.y = -v.height - 10;
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      frameCountRef.current++;
      updateVehicles();

      if (nightVision) {
        ctx.fillStyle = '#0a1a0a';
      } else {
        ctx.fillStyle = '#0a0e14';
      }
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      drawRoads(ctx);
      drawGrid(ctx, nightVision);
      drawVehicles(ctx, vehiclesRef.current);

      if (nightVision) {
        ctx.fillStyle = 'rgba(0, 40, 0, 0.15)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      drawScanLines(ctx);

      const movingScanY = (frameCountRef.current * 2) % (CANVAS_H + 40) - 20;
      const scanGradient = ctx.createLinearGradient(0, movingScanY - 20, 0, movingScanY + 20);
      scanGradient.addColorStop(0, 'transparent');
      scanGradient.addColorStop(
        0.5,
        nightVision ? 'rgba(0, 255, 0, 0.08)' : 'rgba(56, 139, 253, 0.06)'
      );
      scanGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, movingScanY - 20, CANVAS_W, 40);

      drawNoise(ctx, 0.02);

      if (!isOnline) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ff3333';
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', CANVAS_W / 2, CANVAS_H / 2 - 10);

        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,51,51,0.6)';
        ctx.fillText(`CAM:${cameraId} - CONNECTION LOST`, CANVAS_W / 2, CANVAS_H / 2 + 15);
      }

      drawOverlays(ctx, cameraId, nightVision, isOnline, frameCountRef.current);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [nightVision, isOnline, cameraId, updateVehicles]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.03) {
        setIsOnline((prev) => !prev);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 text-sm text-cyan-400">
          <Video className="w-4 h-4 animate-pulse" />
          <span className="font-mono">{cameraName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNightVision(!nightVision)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-xs rounded border transition-all duration-300',
              nightVision
                ? 'bg-green-500/20 border-green-500/50 text-green-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
            )}
          >
            {nightVision ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            {nightVision ? 'NV ON' : 'NV OFF'}
          </button>
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-xs rounded border transition-all duration-300',
              isOnline
                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            )}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'LIVE' : 'OFF'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded border"
        style={{
          borderColor: nightVision ? 'rgba(0,255,0,0.3)' : 'rgba(56,139,253,0.3)',
          boxShadow: nightVision
            ? '0 0 15px rgba(0,255,0,0.15), inset 0 0 15px rgba(0,255,0,0.05)'
            : '0 0 15px rgba(56,139,253,0.15), inset 0 0 15px rgba(56,139,253,0.05)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-auto block"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />
      </div>
    </div>
  );
}
