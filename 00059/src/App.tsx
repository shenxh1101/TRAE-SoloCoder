import React, { useState, useEffect } from 'react';
import { MainMenu } from './pages/MainMenu';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { SettingsPage } from './pages/SettingsPage';
import { Track, GameResult } from './types';
import { useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';

type Page = 'menu' | 'game' | 'result' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('menu');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [lastTrack, setLastTrack] = useState<Track | null>(null);
  const [lastPracticeMode, setLastPracticeMode] = useState(false);
  
  const { startGame, getResult, resetGame } = useGameStore();
  const loadSavedSettings = useSettingsStore(state => state.loadSavedSettings);

  useEffect(() => {
    loadSavedSettings();
  }, [loadSavedSettings]);

  const handleStartGame = (track: Track, practiceMode: boolean) => {
    setLastTrack(track);
    setLastPracticeMode(practiceMode);
    startGame(track, practiceMode, 0.7);
    setCurrentPage('game');
  };

  const handleGameEnd = () => {
    const result = getResult();
    if (result) {
      setGameResult(result);
      setCurrentPage('result');
    }
  };

  const handleRetry = () => {
    if (lastTrack) {
      resetGame();
      startGame(lastTrack, lastPracticeMode, 0.7);
      setCurrentPage('game');
    }
  };

  const handleBackToMenu = () => {
    resetGame();
    setGameResult(null);
    setCurrentPage('menu');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {currentPage === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenSettings={() => setCurrentPage('settings')}
        />
      )}
      {currentPage === 'game' && (
        <GamePage
          onBackToMenu={handleBackToMenu}
          onGameEnd={handleGameEnd}
        />
      )}
      {currentPage === 'result' && gameResult && (
        <ResultPage
          result={gameResult}
          onBackToMenu={handleBackToMenu}
          onRetry={handleRetry}
        />
      )}
      {currentPage === 'settings' && (
        <SettingsPage onBack={() => setCurrentPage('menu')} />
      )}
    </div>
  );
}

export default App;
