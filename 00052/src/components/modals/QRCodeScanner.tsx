import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Check, X, Clock, Camera, RefreshCw, Edit3 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'failed' | 'timeout';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  confirmReceive: (qrCode: string) => void;
  taskId?: string;
}

const generateQRData = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'BLD-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const QRCodePattern: React.FC<{ data: string; className?: string }> = ({ data, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const moduleCount = 21;
    const moduleSize = size / moduleCount;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    const hash = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < moduleCount; i++) {
      for (let j = 0; j < moduleCount; j++) {
        const isCorner =
          (i < 7 && j < 7) ||
          (i < 7 && j >= moduleCount - 7) ||
          (i >= moduleCount - 7 && j < 7);

        if (isCorner) {
          const isOuterBorder = i === 0 || i === 6 || j === 0 || j === 6;
          const isInnerBorder = i === 2 || i === 4 || j === 2 || j === 4;
          const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;

          if (isOuterBorder || (isCenter && !isInnerBorder)) {
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(j * moduleSize, i * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
          }
        } else {
          const pseudoRandom = Math.sin(hash * (i + 1) * (j + 1)) > 0;
          if (pseudoRandom) {
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(j * moduleSize, i * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
          }
        }
      }
    }
  }, [data]);

  return <canvas ref={canvasRef} width={200} height={200} className={cn('rounded-lg', className)} />;
};

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  isOpen,
  onClose,
  confirmReceive,
  taskId
}) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [scanLinePosition, setScanLinePosition] = useState(0);
  const [qrData, setQrData] = useState(generateQRData());
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const animationRef = useRef<number>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (status === 'scanning') {
      const animate = () => {
        setScanLinePosition(prev => {
          if (prev >= 100) return 0;
          return prev + 0.8;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      timeoutRef.current = setTimeout(() => {
        setStatus('success');
        confirmReceive(qrData);
      }, 2000);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status, qrData, confirmReceive]);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setScanLinePosition(0);
      setQrData(generateQRData());
      setShowManualInput(false);
      setManualInput('');
    }
  }, [isOpen]);

  const startScan = () => {
    setStatus('scanning');
    setScanLinePosition(0);
  };

  const resetScan = () => {
    setStatus('idle');
    setScanLinePosition(0);
    setQrData(generateQRData());
    setShowManualInput(false);
    setManualInput('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setStatus('success');
      confirmReceive(manualInput.trim());
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'success':
        return { icon: <Check size={24} />, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', label: '扫码成功' };
      case 'failed':
        return { icon: <X size={24} />, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', label: '扫码失败' };
      case 'timeout':
        return { icon: <Clock size={24} />, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', label: '扫码超时' };
      case 'scanning':
        return { icon: <Camera size={24} />, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', label: '扫描中...' };
      default:
        return { icon: <QrCode size={24} />, color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/50', label: '准备扫码' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="虚拟扫码枪" size="sm">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 rounded-2xl blur-xl -z-10" />

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center border',
                statusInfo.bg,
                statusInfo.border
              )}>
                <span className={statusInfo.color}>{statusInfo.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">{statusInfo.label}</h3>
                {taskId && (
                  <p className="text-xs text-slate-400">任务ID: {taskId.slice(-8)}</p>
                )}
              </div>
            </div>
            <Badge variant={status === 'success' ? 'success' : status === 'scanning' ? 'info' : status === 'idle' ? 'default' : 'danger'} pulse={status === 'scanning'}>
              {status === 'idle' ? '待启动' : status === 'scanning' ? '扫描中' : status === 'success' ? '已完成' : '异常'}
            </Badge>
          </div>

          <div className="relative mx-auto w-56 h-56">
            <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-slate-600/50 bg-slate-900/80 backdrop-blur-sm">
              <QRCodePattern data={qrData} className="w-full h-full" />

              {status === 'scanning' && (
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50"
                  style={{ top: `${scanLinePosition}%`, transition: 'top 16ms linear' }}
                >
                  <div className="absolute inset-0 blur-sm bg-cyan-400/50" />
                </div>
              )}

              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
            </div>
          </div>

          {status !== 'idle' && status !== 'scanning' && (
            <div className={cn(
              'px-4 py-3 rounded-xl border flex items-center justify-between',
              statusInfo.bg,
              statusInfo.border
            )}>
              <div className="flex items-center gap-2">
                <QrCode size={16} className={statusInfo.color} />
                <span className="text-sm font-mono text-slate-200">{qrData}</span>
              </div>
              <span className={cn('text-sm font-medium', statusInfo.color)}>
                {status === 'success' ? '已确认' : '失败'}
              </span>
            </div>
          )}

          {showManualInput && status === 'idle' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <Input
                label="手动输入QR码"
                type="text"
                placeholder="请输入QR码编号"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                icon={<Edit3 size={18} />}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={!manualInput.trim()}
                >
                  确认
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowManualInput(false)}
                >
                  取消
                </Button>
              </div>
            </form>
          )}

          <div className="flex gap-2">
            {status === 'idle' && !showManualInput && (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  icon={<Camera size={18} />}
                  onClick={startScan}
                >
                  开始扫码
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  icon={<Edit3 size={18} />}
                  onClick={() => setShowManualInput(true)}
                >
                  手动输入
                </Button>
              </>
            )}

            {status === 'scanning' && (
              <Button
                variant="info"
                size="lg"
                className="flex-1"
                disabled
              >
                <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-ping mr-2" />
                正在识别QR码...
              </Button>
            )}

            {(status === 'success' || status === 'failed' || status === 'timeout') && (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  icon={<RefreshCw size={18} />}
                  onClick={resetScan}
                >
                  重新扫描
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onClose}
                >
                  关闭
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-center text-slate-500">
            将QR码对准扫描框，系统将自动识别血液信息
          </p>
        </div>
      </div>
    </Modal>
  );
};
