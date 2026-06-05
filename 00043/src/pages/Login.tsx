import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Mail, Lock, User as UserIcon, Shield, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';

export default function Login() {
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const { login, error, setError } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 p-12 flex flex-col justify-center text-white max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <PawPrint size={32} />
            </div>
            <span className="text-2xl font-bold">宠物寄养中心</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            专业的宠物<br />健康管理与寄养服务
          </h1>
          <p className="text-white/80 text-lg mb-8">
            为您的爱宠提供全方位的健康管理和贴心的寄养服务，
            让您出行无忧，爱宠开心。
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur rounded-xl">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <PawPrint size={20} />
              </div>
              <div>
                <p className="font-medium">智能套餐推荐</p>
                <p className="text-sm text-white/70">根据宠物特征自动匹配最适合的寄养套餐</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur rounded-xl">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <UserIcon size={20} />
              </div>
              <div>
                <p className="font-medium">专业护理团队</p>
                <p className="text-sm text-white/70">经验丰富的护理员，智能匹配，服务评价体系</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur rounded-xl">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-medium">实时互动监控</p>
                <p className="text-sm text-white/70">每日更新动态，随时查看爱宠状态，互动留言</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
              <PawPrint className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-neutral-800">宠物寄养中心</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">欢迎回来</h2>
            <p className="text-neutral-500">请登录以继续使用服务</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="input-field pl-10"
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                测试账号: user@example.com / admin@example.com / caregiver@example.com
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                登录密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="input-field pl-10"
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">测试密码: 123456</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-neutral-400">
              登录即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
