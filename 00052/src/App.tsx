import { useState, useEffect } from 'react';
import { StatusBar } from '@/components/panels/StatusBar';
import { LeftPanel } from '@/components/panels/LeftPanel';
import { RightPanel } from '@/components/panels/RightPanel';
import { BloodBankScene } from '@/components/3d/BloodBankScene';
import { BloodBagDetail } from '@/components/modals/BloodBagDetail';
import { LoginModal } from '@/components/modals/LoginModal';
import { RoleSwitchModal } from '@/components/modals/RoleSwitchModal';
import { useBloodBankStore } from '@/store';
import { websocketService } from '@/services/websocketService';
import type { BloodBag } from '@/types';
import { Wifi, WifiOff } from 'lucide-react';

function App() {
  const [selectedBloodBag, setSelectedBloodBag] = useState<BloodBag | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRoleSwitchModalOpen, setIsRoleSwitchModalOpen] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { 
    setSelectedBloodBag: setStoreSelectedBloodBag, 
    loadInitialData, 
    currentUser, 
    wsConnected
  } = useBloodBankStore();

  useEffect(() => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      setDataLoaded(false);
    } else if (!dataLoaded) {
      loadInitialData().then(() => {
        setDataLoaded(true);
      }).catch(() => {
        setDataLoaded(false);
      });
    }

    return () => {
      websocketService.disconnect();
    };
  }, [currentUser, dataLoaded]);

  const handleBloodBagClick = (bloodBag: BloodBag) => {
    setSelectedBloodBag(bloodBag);
    setStoreSelectedBloodBag(bloodBag);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setStoreSelectedBloodBag(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <StatusBar
        onRoleSwitch={() => setIsRoleSwitchModalOpen(true)}
        onLogin={() => setIsLoginModalOpen(true)}
      />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <LeftPanel />
        
        <div className="flex-1 relative">
          <BloodBankScene onBloodBagClick={handleBloodBagClick} />
          
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-400">
              🖱️ 左键拖动旋转 · 滚轮缩放 · 右键平移 · 点击血袋查看详情
            </p>
          </div>
          
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/50">
            {wsConnected ? (
              <>
                <Wifi size={14} className="text-green-400" />
                <span className="text-xs text-green-400">WebSocket 已连接</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-red-400" />
                <span className="text-xs text-red-400">WebSocket 未连接</span>
              </>
            )}
          </div>
        </div>
        
        <RightPanel />
      </div>
      
      <BloodBagDetail
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        bloodBag={selectedBloodBag}
      />
      
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      
      <RoleSwitchModal
        isOpen={isRoleSwitchModalOpen}
        onClose={() => setIsRoleSwitchModalOpen(false)}
      />
    </div>
  );
}

export default App;
