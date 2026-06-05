import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';
import { JudgeResult } from '../types';
import { Pause, Play, Home, Heart, Flame } from 'lucide-react';

interface GamePageProps {
  onBackToMenu: () => void;
  onGameEnd: () => void;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
}

interface JudgeEffect {
  id: string;
  lane: number;
  result: JudgeResult;
  time: number;
}

export const GamePage: React.FC<GamePageProps> = ({ onBackToMenu, onGameEnd }) => {
  const {
    currentTrack,
    isPlaying,
    isPaused,
    isPracticeMode,
    speedMultiplier,
    currentTime,
    score,
    combo,
    lives,
    activeNotes,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    updateTime,
    judgeNote,
    missNote,
    addActiveNote,
    removeActiveNote,
  } = useGameStore();

  const { keyMapping, laneCount, noteSpeed } = useSettingsStore();

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const noteIndexRef = useRef<number>(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [judgeEffects, setJudgeEffects] = useState<JudgeEffect[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);

  const JUDGE_LINE_Y = 85;
  const PERFECT_WINDOW = 50;
  const GOOD_WINDOW = 100;
  const NOTE_SPEED_BASE = 0.05 * noteSpeed * speedMultiplier;

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 10) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `particle-${Date.now()}-${i}`,
        x,
        y,
        color,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const addJudgeEffect = useCallback((lane: number, result: JudgeResult) => {
    const effect: JudgeEffect = {
      id: `judge-${Date.now()}-${lane}`,
      lane,
      result,
      time: Date.now(),
    };
    setJudgeEffects(prev => [...prev, effect]);
    setTimeout(() => {
      setJudgeEffects(prev => prev.filter(e => e.id !== effect.id));
    }, 500);
  }, []);

  const handleLaneInput = useCallback((lane: number) => {
    if (!isPlaying || isPaused || countdown !== null) return;

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;

    const laneWidth = 100 / laneCount;
    const laneCenterX = (lane + 0.5) * laneWidth;

    const noteToJudge = activeNotes.find(note => {
      if (note.lane !== lane || note.judged) return false;
      const noteY = ((currentTime - note.time) * NOTE_SPEED_BASE);
      const distance = Math.abs(noteY - JUDGE_LINE_Y);
      return distance < 15;
    });

    if (noteToJudge) {
      const noteY = ((currentTime - noteToJudge.time) * NOTE_SPEED_BASE);
      const distance = Math.abs(noteY - JUDGE_LINE_Y);
      
      let result: JudgeResult;
      let color: string;
      
      if (distance * 10 < PERFECT_WINDOW) {
        result = 'perfect';
        color = '#00d4ff';
      } else if (distance * 10 < GOOD_WINDOW) {
        result = 'good';
        color = '#10b981';
      } else {
        result = 'miss';
        color = '#ef4444';
      }

      if (result === 'miss') {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 200);
      }

      judgeNote(noteToJudge.id, result);
      addJudgeEffect(lane, result);
      spawnParticles(laneCenterX, JUDGE_LINE_Y, color, result === 'perfect' ? 15 : 8);
    }
  }, [isPlaying, isPaused, countdown, laneCount, activeNotes, currentTime, judgeNote, addJudgeEffect, spawnParticles, NOTE_SPEED_BASE]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      if (e.key === 'Escape') {
        if (isPlaying && !isPaused) {
          pauseGame();
        } else if (isPaused) {
          resumeGame();
        }
        return;
      }

      const key = e.key.toLowerCase();
      for (const [lane, mappedKey] of Object.entries(keyMapping)) {
        if (key === mappedKey.toLowerCase()) {
          handleLaneInput(parseInt(lane));
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyMapping, handleLaneInput, isPlaying, isPaused, pauseGame, resumeGame]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setTimeout(() => {
        setCountdown(null);
        startTimeRef.current = performance.now();
        noteIndexRef.current = 0;
      }, 500);
    }
  }, [countdown]);

  useEffect(() => {
    if (!isPlaying || isPaused || countdown !== null || !currentTrack) return;

    let lastFrameTime = performance.now();

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastFrameTime;
      lastFrameTime = timestamp;

      const elapsed = timestamp - startTimeRef.current;
      updateTime(elapsed);

      while (
        noteIndexRef.current < currentTrack.notes.length &&
        currentTrack.notes[noteIndexRef.current].time <= elapsed + 2000
      ) {
        const note = currentTrack.notes[noteIndexRef.current];
        addActiveNote({ ...note, judged: false });
        noteIndexRef.current++;
      }

      activeNotes.forEach(note => {
        if (note.judged) return;
        const noteY = ((elapsed - note.time) * NOTE_SPEED_BASE);
        if (noteY > JUDGE_LINE_Y + 10) {
          missNote(note.id);
          setScreenShake(true);
          setTimeout(() => setScreenShake(false), 200);
          addJudgeEffect(note.lane, 'miss');
        }
      });

      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.1,
            y: p.y + p.vy * 0.1,
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );

      if (elapsed > currentTrack.duration && noteIndexRef.current >= currentTrack.notes.length) {
        setTimeout(() => {
          endGame();
          onGameEnd();
        }, 1000);
        return;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, isPaused, countdown, currentTrack, activeNotes, updateTime, addActiveNote, missNote, addJudgeEffect, endGame, onGameEnd, NOTE_SPEED_BASE]);

  useEffect(() => {
    if (lives <= 0 && !isPracticeMode && isPlaying) {
      endGame();
      onGameEnd();
    }
  }, [lives, isPracticeMode, isPlaying, endGame, onGameEnd]);

  if (!currentTrack) return null;

  const laneWidth = 100 / laneCount;

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden select-none">
      <div
        className={`absolute inset-0 transition-transform duration-100 ${
          screenShake ? 'translate-x-1 translate-y-1' : ''
        }`}
      >
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => (isPaused ? resumeGame() : pauseGame())}
              className="p-3 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
            </button>
            <button
              onClick={onBackToMenu}
              className="p-3 bg-gray-800/80 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Home className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">{currentTrack.name}</h2>
            {isPracticeMode && (
              <span className="text-sm text-green-400">练习模式 x{speedMultiplier.toFixed(1)}</span>
            )}
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400 font-mono">{score.toLocaleString()}</div>
            {combo > 0 && (
              <div className={`flex items-center justify-end gap-1 ${
                combo >= 50 ? 'text-yellow-400' : combo >= 20 ? 'text-purple-400' : 'text-white'
              }`}>
                <Flame className="w-5 h-5" />
                <span className="text-2xl font-bold">{combo}</span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-20 right-4 z-20 flex gap-1">
          {Array.from({ length: isPracticeMode ? 3 : Math.min(lives, 10) }).map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 ${lives > i ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
            />
          ))}
          {!isPracticeMode && lives > 10 && (
            <span className="text-red-400 text-sm">+{lives - 10}</span>
          )}
        </div>

        <div
          ref={gameAreaRef}
          className="absolute inset-0 flex justify-center"
          style={{ paddingTop: '100px', paddingBottom: '80px' }}
        >
          <div className="relative h-full" style={{ width: `${laneCount * 80}px` }}>
            {Array.from({ length: laneCount }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-x border-gray-700/50"
                style={{
                  left: `${i * laneWidth}%`,
                  width: `${laneWidth}%`,
                }}
                onClick={() => handleLaneInput(i)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleLaneInput(i);
                }}
              />
            ))}

            <div
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 shadow-lg shadow-cyan-500/50"
              style={{ top: `${JUDGE_LINE_Y}%` }}
            />

            {activeNotes.map(note => {
              const noteY = ((currentTime - note.time) * NOTE_SPEED_BASE);
              if (noteY < -10 || noteY > 110 || note.judged) return null;

              const colors = ['#00d4ff', '#9333ea', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
              
              return (
                <div
                  key={note.id}
                  className="absolute rounded-md transition-opacity"
                  style={{
                    left: `${note.lane * laneWidth + 2}%`,
                    width: `${laneWidth - 4}%`,
                    height: '40px',
                    top: `${noteY}%`,
                    transform: 'translateY(-50%)',
                    backgroundColor: colors[note.lane % colors.length],
                    boxShadow: `0 0 20px ${colors[note.lane % colors.length]}40`,
                  }}
                />
              );
            })}

            {judgeEffects.map(effect => (
              <div
                key={effect.id}
                className="absolute text-center font-bold text-lg animate-bounce pointer-events-none"
                style={{
                  left: `${effect.lane * laneWidth}%`,
                  width: `${laneWidth}%`,
                  top: `${JUDGE_LINE_Y - 10}%`,
                  color: effect.result === 'perfect' ? '#00d4ff' : effect.result === 'good' ? '#10b981' : '#ef4444',
                  textShadow: `0 0 10px ${effect.result === 'perfect' ? '#00d4ff' : effect.result === 'good' ? '#10b981' : '#ef4444'}`,
                }}
              >
                {effect.result?.toUpperCase()}
              </div>
            ))}

            {particles.map(p => (
              <div
                key={p.id}
                className="absolute w-2 h-2 rounded-full pointer-events-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  backgroundColor: p.color,
                  opacity: p.life,
                  boxShadow: `0 0 10px ${p.color}`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
          <div className="flex justify-center gap-2">
            {Array.from({ length: laneCount }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-12 flex items-center justify-center bg-gray-800/80 rounded-lg border border-gray-600 uppercase font-bold text-gray-300"
              >
                {keyMapping[i]}
              </div>
            ))}
          </div>
        </div>

        {countdown !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
            <div className="text-9xl font-bold text-cyan-400 animate-ping">
              {countdown === 0 ? 'GO!' : countdown}
            </div>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-8">暂停</h2>
              <div className="flex flex-col gap-4">
                <button
                  onClick={resumeGame}
                  className="px-8 py-3 bg-cyan-500 text-white rounded-lg font-bold hover:bg-cyan-400 transition-colors"
                >
                  继续游戏
                </button>
                <button
                  onClick={onBackToMenu}
                  className="px-8 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition-colors"
                >
                  返回菜单
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
