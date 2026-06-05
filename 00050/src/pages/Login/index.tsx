import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Monitor,
  Wrench,
  DollarSign,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { UserRole } from '../../types';

const roles: Array<{
  id: UserRole;
  icon: React.ElementType;
  label: string;
  description: string;
  gradient: string;
  demoEmail: string;
}> = [
  {
    id: 'exhibitor',
    icon: Building2,
    label: '展商',
    description: '展位预订、服务申请、数据统计',
    gradient: 'from-blue-500 to-cyan-500',
    demoEmail: 'zhangwei@techcorp.com',
  },
  {
    id: 'visitor',
    icon: Users,
    label: '观众',
    description: '展商浏览、论坛预约、参观路线',
    gradient: 'from-green-500 to-emerald-500',
    demoEmail: 'chenjing@example.com',
  },
  {
    id: 'operator',
    icon: Monitor,
    label: '展馆运营',
    description: '实时监控、预订审核、预警处理',
    gradient: 'from-orange-500 to-amber-500',
    demoEmail: 'zhougz@expo-center.com',
  },
  {
    id: 'provider',
    icon: Wrench,
    label: '服务商',
    description: '订单大厅、工单管理、进度跟踪',
    gradient: 'from-purple-500 to-violet-500',
    demoEmail: 'sunjl@buildpro.com',
  },
  {
    id: 'finance',
    icon: DollarSign,
    label: '财务',
    description: '收入统计、报表中心、凭证管理',
    gradient: 'from-rose-500 to-pink-500',
    demoEmail: 'zhengkj@expo-center.com',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const demoAccount = roles.find((r) => r.id === role);
    if (demoAccount) {
      setEmail(demoAccount.demoEmail);
    }
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('请先选择用户角色');
      return;
    }

    setIsLoading(true);
    setError('');

    await new Promise((resolve) => setTimeout(resolve, 800));

    const success = login(email, selectedRole);

    if (success) {
      navigate(`/${selectedRole}`);
    } else {
      setError('登录失败，请检查邮箱或角色是否正确');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    const demoAccount = roles.find((r) => r.id === role);
    if (demoAccount) {
      login(demoAccount.demoEmail, role);
      navigate(`/${role}`);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-8 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary-500/20 to-transparent animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary-600/10 to-transparent animate-pulse-slow" />
        <div className="absolute inset-0 tech-grid-bg opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center glow-effect">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-white font-display">智慧会展中心</h1>
              <p className="text-dark-300">展位管理与服务调度平台</p>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-dark-200 max-w-2xl mx-auto"
          >
            <span className="gradient-text">智能 · 高效 · 便捷</span>
            <br />
            为大型国际会展提供全流程数字化管理服务
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-5 gap-4 mb-8">
          {roles.map((role, index) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelect(role.id)}
                className={`glass-card glass-card-hover p-5 text-left transition-all duration-300 ${
                  isSelected ? `border-primary-500 ring-2 ring-primary-500/30 bg-white/10` : ''
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-3 ${
                    isSelected ? 'animate-pulse' : ''
                  }`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{role.label}</h3>
                <p className="text-xs text-dark-300">{role.description}</p>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 mt-3 text-primary-400 text-xs font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>已选择</span>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-8 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  登录<span className="gradient-text"> {roles.find((r) => r.id === selectedRole)?.label}</span> 账号
                </h2>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-2">邮箱地址</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱地址"
                      className="input-field"
                      required
                    />
                    <p className="text-xs text-dark-400 mt-1">
                      演示账号：{roles.find((r) => r.id === selectedRole)?.demoEmail}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-200 mb-2">登录密码</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码（演示账号密码任意）"
                        className="input-field pr-12"
                        defaultValue="123456"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-danger-500/20 border border-danger-500/30 rounded-lg text-danger-400 text-sm text-center"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>立即登录</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-center text-sm text-dark-400 mb-4">快速体验不同角色</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {roles
                      .filter((r) => r.id !== selectedRole)
                      .map((role) => {
                        const RoleIcon = role.icon;
                        return (
                          <button
                            key={role.id}
                            onClick={() => handleQuickLogin(role.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-dark-200 hover:text-white transition-all duration-300"
                          >
                            <RoleIcon className="w-3 h-3" />
                            <span>{role.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-dark-400 text-sm mt-8"
        >
          © 2026 智慧会展中心 | 展位管理与服务调度平台 v1.0
        </motion.p>
      </motion.div>
    </div>
  );
}
