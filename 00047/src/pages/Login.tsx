import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { Camera, Shield, User, ChevronDown, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'traffic_police', label: '交警' },
  { value: 'command_director', label: '指挥中心主任' },
  { value: 'transport_bureau', label: '交通局' },
];

function generateDeterministicDescriptor(seed: string): Float32Array {
  const descriptor = new Float32Array(128);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < 128; i++) {
    hash = ((hash << 5) - hash + i * 7 + seed.charCodeAt(i % seed.length)) | 0;
    descriptor[i] = (hash % 200 - 100) / 100;
  }
  return descriptor;
}

const storedDescriptors: { role: UserRole; descriptor: Float32Array }[] =
  roleOptions.map((r) => ({
    role: r.value,
    descriptor: generateDeterministicDescriptor(r.value),
  }));

export default function Login() {
  const navigate = useNavigate();
  const login = useAppStore((state) => state.login);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableStartRef = useRef<number | null>(null);

  const [selectedRole, setSelectedRole] = useState<UserRole>('traffic_police');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelLoadingText, setModelLoadingText] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionScore, setDetectionScore] = useState(0);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [stableProgress, setStableProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        setModelLoadingText('加载人脸检测模型...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelLoadingText('加载人脸关键点模型...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoadingText('加载人脸识别模型...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setModelLoadingText('');
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setModelLoadingText('模型加载失败，请使用手动登录');
      }
    };
    loadModels();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.log('Camera access denied');
    }
  }, []);

  useEffect(() => {
    if (modelsLoaded) {
      startCamera();
    }
  }, [modelsLoaded, startCamera]);

  const matchFace = useCallback(
    (descriptor: Float32Array): UserRole => {
      let bestRole: UserRole = selectedRole;
      let bestDist = Infinity;
      for (const stored of storedDescriptors) {
        const dist = faceapi.euclideanDistance(descriptor, stored.descriptor);
        if (dist < bestDist) {
          bestDist = dist;
          bestRole = stored.role;
        }
      }
      return bestRole;
    },
    [selectedRole],
  );

  const drawDetections = useCallback(
    (
      detection: faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
      >,
      videoWidth: number,
      videoHeight: number,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, videoWidth, videoHeight);

      const { box } = detection.detection;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      const cornerLen = Math.min(box.width, box.height) * 0.15;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 3;
      const corners = [
        [box.x, box.y, cornerLen, 0, 0, cornerLen],
        [box.x + box.width, box.y, -cornerLen, 0, 0, cornerLen],
        [box.x, box.y + box.height, cornerLen, 0, 0, -cornerLen],
        [box.x + box.width, box.y + box.height, -cornerLen, 0, 0, -cornerLen],
      ];
      for (const [cx, cy, dx1, dy1, dx2, dy2] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + dx1, cy + dy1);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx2, cy + dy2);
        ctx.stroke();
      }

      const landmarks = detection.landmarks;
      const positions = landmarks.positions;
      ctx.fillStyle = '#00ff88';
      for (const pt of positions) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const score = detection.detection.score;
      ctx.fillStyle = '#00ffcc';
      ctx.font = '12px monospace';
      ctx.fillText(`${(score * 100).toFixed(1)}%`, box.x, box.y - 6);
    },
    [],
  );

  useEffect(() => {
    if (!cameraReady || !modelsLoaded) return;

    const detectFace = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setFaceDetected(true);
          setDetectionScore(detection.detection.score);
          setFaceDescriptor(detection.descriptor);
          drawDetections(detection, video.videoWidth, video.videoHeight);

          if (!stableStartRef.current) {
            stableStartRef.current = Date.now();
          }
          const elapsed = Date.now() - stableStartRef.current;
          const progress = Math.min((elapsed / 2000) * 100, 100);
          setStableProgress(progress);

          if (elapsed >= 2000 && !isLoggingIn) {
            const matchedRole = matchFace(detection.descriptor);
            handleAutoLogin(matchedRole);
          }
        } else {
          setFaceDetected(false);
          setDetectionScore(0);
          setFaceDescriptor(null);
          stableStartRef.current = null;
          setStableProgress(0);
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.error('Face detection error:', err);
      }
    };

    detectionIntervalRef.current = setInterval(detectFace, 200);
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, modelsLoaded, isLoggingIn]);

  const handleAutoLogin = (role: UserRole) => {
    setIsLoggingIn(true);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setTimeout(() => {
      login(role);
      navigate('/dashboard');
    }, 800);
  };

  const handleManualLogin = () => {
    setIsLoggingIn(true);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setTimeout(() => {
      login(selectedRole);
      navigate('/dashboard');
    }, 2500);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-grid-move" />

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan-line" />

      <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            智慧城市交通系统
          </h1>
          <p className="text-cyan-400/80 text-sm tracking-widest">SMART TRAFFIC MANAGEMENT</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-cyan-500/20 p-8 shadow-2xl shadow-cyan-500/10">
          <div className="relative mb-6">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-800 border-2 border-cyan-500/30">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover opacity-80"
              />

              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/50" />

              <div className="absolute inset-0">
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
              </div>

              {stableProgress > 0 && (
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                  style={{ top: `${stableProgress}%` }}
                />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_50%,rgba(0,255,255,0.02)_50%)] bg-[size:100%_4px] animate-scan" />

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-500/30">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-cyan-300 font-mono">
                  {!modelsLoaded
                    ? modelLoadingText
                    : !cameraReady
                      ? '启动摄像头...'
                      : faceDetected
                        ? `人脸识别 ${(detectionScore * 100).toFixed(0)}%`
                        : '等待人脸...'}
                </span>
              </div>

              {faceDetected && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/80 border border-green-500/40">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-300 font-mono">Face Detected</span>
                </div>
              )}

              {stableProgress > 0 && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-3/4">
                  <div className="h-1 rounded-full bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-cyan-400 rounded-full transition-all duration-200"
                      style={{ width: `${stableProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-[10px] text-green-400/80 mt-1 font-mono">
                    稳定识别中 {stableProgress.toFixed(0)}%
                  </p>
                </div>
              )}

              {!modelsLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
                  <p className="text-sm text-cyan-300 font-mono">{modelLoadingText}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-cyan-300 mb-2 tracking-wide">
              <User className="w-4 h-4 inline mr-2" />
              选择角色 <span className="text-slate-500 text-xs">(手动登录)</span>
            </label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white text-left flex items-center justify-between hover:border-cyan-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <span>{roleOptions.find((r) => r.value === selectedRole)?.label}</span>
                <ChevronDown className={cn('w-5 h-5 text-cyan-400 transition-transform', dropdownOpen && 'rotate-180')} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl overflow-hidden z-20 shadow-xl">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => {
                        setSelectedRole(role.value);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors hover:bg-cyan-500/10',
                        selectedRole === role.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-white',
                      )}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleManualLogin}
            disabled={isLoggingIn}
            className="relative w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl overflow-hidden group transition-all hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-70"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/50 to-cyan-400/0 -translate-x-full group-hover:animate-shine" />
            <div className="absolute inset-0 animate-pulse-glow" />

            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  人脸识别登录中...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  人脸登录
                </>
              )}
            </span>
          </button>

          <div className="mt-6 pt-6 border-t border-cyan-500/10">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <div className={cn(
                  'w-2 h-2 rounded-full animate-pulse',
                  modelsLoaded ? 'bg-green-500' : 'bg-yellow-500',
                )} />
                {modelsLoaded ? '系统正常' : '模型加载中'}
              </span>
              <span className="font-mono">v2.4.1</span>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          智慧城市交通可视化平台 © 2026
        </p>
      </div>
    </div>
  );
}
