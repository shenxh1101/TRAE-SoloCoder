import React, { useState } from 'react';
import { User, Lock, ChevronDown, LogIn, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService, UserRole } from '@/services/authService';
import { cn } from '@/lib/utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  { value: 'doctor', label: '医生', description: '申请输血、查看患者信息' },
  { value: 'department_director', label: '科室主任', description: '审批本科室输血申请' },
  { value: 'blood_bank_director', label: '血库主任', description: '管理血库、审批输血申请' },
  { value: 'nurse', label: '护士', description: '确认接收血液、执行输血' },
  { value: 'admin', label: '管理员', description: '系统管理、用户管理' }
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('doctor');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.login({ username, password, role });
      onClose();
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find(r => r.value === role);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="用户登录" size="sm">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-2xl blur-xl -z-10" />
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              选择角色
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className={cn(
                  'w-full px-4 py-3 bg-slate-800/60 border border-slate-600/50 rounded-xl text-left',
                  'flex items-center justify-between transition-all duration-200',
                  'hover:bg-slate-800/80 hover:border-slate-500',
                  'backdrop-blur-md',
                  isRoleDropdownOpen && 'border-blue-500 ring-2 ring-blue-500/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30">
                    <User size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{selectedRole?.label}</p>
                    <p className="text-xs text-slate-400">{selectedRole?.description}</p>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={cn(
                    'text-slate-400 transition-transform duration-200',
                    isRoleDropdownOpen && 'rotate-180'
                  )}
                />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-slate-800/95 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-xl z-10 animate-fadeIn">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setRole(option.value);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-all duration-150',
                        'hover:bg-slate-700/50',
                        role === option.value && 'bg-blue-500/10'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        role === option.value
                          ? 'bg-blue-500/30 border border-blue-500/50'
                          : 'bg-slate-700/50'
                      )}>
                        <User
                          size={16}
                          className={role === option.value ? 'text-blue-400' : 'text-slate-400'}
                        />
                      </div>
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          role === option.value ? 'text-blue-400' : 'text-slate-200'
                        )}>
                          {option.label}
                        </p>
                        <p className="text-xs text-slate-400">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Input
            label="用户名"
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            icon={<User size={18} />}
            required
          />

          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            required
          />

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            icon={<LogIn size={18} />}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登 录'}
          </Button>

          <p className="text-xs text-center text-slate-500">
            预设账号：{role} / password123
          </p>
        </form>
      </div>
    </Modal>
  );
};
