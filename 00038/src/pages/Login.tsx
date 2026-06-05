import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, Sparkles, Atom } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  const [email, setEmail] = useState('admin@plasma-lab.com');
  const [password, setPassword] = useState('123456');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number; delay: number }>>([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 3 + 1,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background-secondary to-background" />
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-cyan/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-primary to-accent-cyan"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: 0.6,
              animation: `float ${particle.speed + 4}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              boxShadow: `0 0 ${particle.size * 3}px rgba(99, 102, 241, 0.5)`,
            }}
          />
        ))}
        
        <div className="absolute top-10 left-10 w-32 h-32 border border-primary/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute bottom-10 right-10 w-48 h-48 border border-accent-cyan/20 rounded-full animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
        <div className="absolute top-1/3 right-20 w-24 h-24 border border-accent-purple/20 rounded-full animate-spin" style={{ animationDuration: '15s' }} />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="glass-card p-8 glow-border">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 shadow-glow-lg">
                <Atom size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold font-display text-text-primary mb-2">
                Plasma <span className="glow-text">Lab</span>
              </h1>
              <p className="text-text-secondary">等离子体模拟平台</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-primary" />
                    <span>邮箱地址</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11"
                    placeholder="请输入邮箱"
                    required
                  />
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
                </div>
              </div>

              <div>
                <label className="input-label">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-primary" />
                    <span>密码</span>
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-11"
                    placeholder="请输入密码"
                    required
                  />
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm flex items-center gap-2 animate-shake">
                  <Sparkles size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'btn-primary w-full flex items-center justify-center gap-2',
                  isLoading && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>登录中...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>登 录</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-center gap-6 text-xs text-text-tertiary">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                  <span>系统在线</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div>v1.0.0</div>
                <div className="w-px h-4 bg-border" />
                <div>2024 Plasma Lab</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
