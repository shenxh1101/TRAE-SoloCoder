import { AlertTriangle, X } from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';

const CollisionAlert = () => {
  const showCollisionAlert = useSceneStore((state) => state.showCollisionAlert);
  const dismissCollisionAlert = useSceneStore((state) => state.dismissCollisionAlert);
  const arms = useSceneStore((state) => state.arms);

  const collidingArms = arms.filter((arm) => arm.isColliding);

  if (!showCollisionAlert || collidingArms.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in">
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-industrial-danger bg-industrial-danger/10 backdrop-blur-md shadow-lg shadow-industrial-danger/20">
        <AlertTriangle className="w-5 h-5 text-industrial-danger animate-pulse" />
        <div>
          <div className="text-sm font-display text-industrial-danger font-medium">
            碰撞警告
          </div>
          <div className="text-xs text-gray-400">
            {collidingArms.map((arm) => (
              <span key={arm.id} className="mr-2">
                {arm.name}: 关节 {arm.collidingJoints.map((j) => `J${j + 1}`).join(', ')}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={dismissCollisionAlert}
          className="p-1 rounded hover:bg-industrial-danger/20 transition-colors ml-2"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-industrial-danger" />
        </button>
      </div>
    </div>
  );
};

export default CollisionAlert;
