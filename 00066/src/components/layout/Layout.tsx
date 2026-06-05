import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '../../stores/useAppStore';

export default function Layout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-acoustic-deep grid-background noise-overlay">
      <Sidebar />
      
      <div 
        className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}
      >
        <Header />
        
        <main className="pt-16 min-h-screen">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
