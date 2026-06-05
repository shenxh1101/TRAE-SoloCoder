import { useEffect, useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import useTrafficSimulation from '@/hooks/useTrafficSimulation';
import { mockVehicles, mockIntersections, mockRoads, mockEvents } from '@/data/mockData';
import Header from '@/components/panels/Header';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import BottomTimeline from '@/components/panels/BottomTimeline';
import NotificationCenter from '@/components/panels/NotificationCenter';
import Scene from '@/components/three/Scene';
import { Loader } from '@react-three/drei';

export default function Dashboard() {
  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.currentUser);
  const [showNotifications, setShowNotifications] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  useTrafficSimulation({
    initialVehicles: mockVehicles,
    initialIntersections: mockIntersections,
    initialRoads: mockRoads,
    initialEvents: mockEvents,
    enableAutoOptimization: true,
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen w-full bg-cyber-bg text-white flex flex-col overflow-hidden font-mono">
      <Header
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftPanel
          collapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 relative overflow-hidden canvas-container">
            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-cyber-bg">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-cyan-400 animate-pulse">正在加载3D场景...</p>
                </div>
              </div>
            }>
              <Scene />
            </Suspense>
            
            <div className="absolute top-4 left-4 px-4 py-2 bg-cyber-panel/80 backdrop-blur-md rounded-lg border border-cyber-border z-10">
              <p className="text-xs text-cyan-400 font-display tracking-wider">
                3D 智慧城市交通监控系统
              </p>
            </div>

            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <div className="px-3 py-1.5 bg-cyber-panel/80 backdrop-blur-md rounded-lg border border-green-500/30">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse" />
                <span className="text-xs text-green-400">系统正常</span>
              </div>
              <div className="px-3 py-1.5 bg-cyber-panel/80 backdrop-blur-md rounded-lg border border-cyan-500/30">
                <span className="text-xs text-cyan-400">在线路口: 9/9</span>
              </div>
            </div>
          </div>

          <BottomTimeline />
        </main>

        <RightPanel
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />

        {showNotifications && (
          <NotificationCenter onClose={() => setShowNotifications(false)} />
        )}
      </div>

      <Loader
        dataInterpolation={(p) => `加载进度: ${p.toFixed(0)}%`}
        barStyles={{
          background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
          height: '4px',
        }}
        dataStyles={{
          color: '#06b6d4',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
        }}
        containerStyles={{
          background: 'rgba(13, 17, 23, 0.95)',
          backdropFilter: 'blur(10px)',
        }}
        innerStyles={{
          padding: '20px 40px',
          borderRadius: '12px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)',
        }}
      />
    </div>
  );
}
