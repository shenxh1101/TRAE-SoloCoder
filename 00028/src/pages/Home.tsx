import Scene from '@/components/scene/Scene';
import ControlPanel from '@/components/controls/ControlPanel';
import Toolbar from '@/components/controls/Toolbar';
import DataPanel from '@/components/ui/DataPanel';
import CollisionAlert from '@/components/ui/CollisionAlert';

const Home = () => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-industrial-bg">
      <Scene />
      <ControlPanel />
      <Toolbar />
      <DataPanel />
      <CollisionAlert />

      <div className="fixed bottom-4 left-4 z-30">
        <div className="text-xs text-gray-600 font-mono">
          <div>3D 机械臂装配线仿真 v1.0</div>
          <div className="text-[10px] mt-1">
            Three.js • React Three Fiber
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
