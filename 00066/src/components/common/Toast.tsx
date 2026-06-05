import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-md 
              min-w-[300px] max-w-[450px] animate-slide-in-right
              ${toast.type === 'success' ? 'bg-acoustic-success/90 border border-acoustic-success' :
                toast.type === 'error' ? 'bg-acoustic-danger/90 border border-acoustic-danger' :
                'bg-acoustic-cyber/90 border border-acoustic-cyber'
              }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-white flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-white flex-shrink-0" />}
            
            <p className="text-sm text-white font-medium flex-1">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
