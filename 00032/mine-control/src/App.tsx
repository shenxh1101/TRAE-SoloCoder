import { MineScene } from './components/three/MineScene';
import { StatusBar } from './components/panels/StatusBar';
import { LeftSidebar } from './components/panels/LeftSidebar';
import { AlertPanel } from './components/panels/AlertPanel';
import { WorkFaceDetailPanel } from './components/panels/WorkFaceDetailPanel';
import { EmergencyModal } from './components/panels/EmergencyModal';
import { useMineStore } from './store/useMineStore';

function App() {
  const selectedWorkFace = useMineStore((state) => state.selectedWorkFace);

  return (
    <div className="w-full h-screen flex flex-col bg-mine-dark overflow-hidden">
      <StatusBar />

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar />

        <div className="flex-1 relative">
          <MineScene />

          {selectedWorkFace && (
            <div className="absolute top-4 right-4 z-10">
              <WorkFaceDetailPanel workFace={selectedWorkFace} />
            </div>
          )}

          <div className="absolute top-4 right-4 z-10" style={{ marginTop: selectedWorkFace ? '420px' : '0' }}>
            <AlertPanel />
          </div>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="glass-panel rounded-lg px-4 py-2 text-sm text-gray-400">
              🖱️ 鼠标左键拖拽旋转 | 滚轮缩放 | 右键平移 | 点击采掘面查看详情
            </div>
          </div>
        </div>
      </div>

      <EmergencyModal />
    </div>
  );
}

export default App;
