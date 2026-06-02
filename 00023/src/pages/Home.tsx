import ControlPanel from '@/components/ControlPanel';
import Scene from '@/components/Scene';
import InfoBar from '@/components/InfoBar';
import ToolBar from '@/components/ToolBar';

export default function Home() {
  return (
    <div className="w-screen h-screen flex overflow-hidden bg-slate-900">
      <ControlPanel />
      <div className="flex-1 relative">
        <Scene />
        <InfoBar />
        <ToolBar />
      </div>
    </div>
  );
}
