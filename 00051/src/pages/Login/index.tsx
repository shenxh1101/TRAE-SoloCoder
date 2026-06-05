import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Car, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { initializeLocalStorage } from '@/utils/mock';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, clearError, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initializeLocalStorage();
  }, []);

  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: string })?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(username, password);
  };

  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: '车管员' },
    { username: 'manager', password: 'manager123', role: '部门主管' },
    { username: 'employee', password: 'employee123', role: '普通员工' },
  ];

  const fillDemo = (uname: string, pwd: string) => {
    setUsername(uname);
    setPassword(pwd);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-slate-900/50" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-4">
            <Car className="text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">车辆调度管理系统</h1>
          <p className="text-slate-400">企业用车管理 · 智能调度 · 高效便捷</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm animate-in fade-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="relative">
              <Input
                label="用户名"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 pl-10"
                autoComplete="username"
              />
              <User className="absolute left-3 top-9 text-slate-400" size={18} />
            </div>

            <div className="relative">
              <Input
                label="密码"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 pl-10 pr-10"
                autoComplete="current-password"
              />
              <Lock className="absolute left-3 top-9 text-slate-400" size={18} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-base shadow-lg shadow-blue-500/30"
            >
              登 录
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-3">演示账号：</p>
            <div className="grid grid-cols-3 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => fillDemo(acc.username, acc.password)}
                  className="px-2 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-all duration-200"
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          © 2024 企业车辆调度管理系统
        </p>
      </div>
    </div>
  );
};

export default Login;
