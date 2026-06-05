import React, { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, LogOut, UserCircle, RefreshCw, Mail, Phone, Building2 } from 'lucide-react';
import { useBloodBankStore } from '@/store';
import { authService, UserRole } from '@/services/authService';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, { label: string; color: string; bg: string }> = {
  doctor: { label: '医生', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  department_director: { label: '科室主任', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  blood_bank_director: { label: '血库主任', color: 'text-red-400', bg: 'bg-red-500/20' },
  nurse: { label: '护士', color: 'text-green-400', bg: 'bg-green-500/20' },
  admin: { label: '管理员', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
};

interface UserMenuProps {
  onRoleSwitch?: () => void;
  onLogin?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onRoleSwitch, onLogin }) => {
  const { currentUser } = useBloodBankStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullUser = authService.getCurrentUser();
  const displayUser = currentUser || fullUser;
  const userRole = (displayUser?.role as UserRole) || 'blood_bank_director';
  const roleInfo = ROLE_LABELS[userRole];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowUserInfo(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsDropdownOpen(false);
    window.location.reload();
  };

  const handleRoleSwitch = () => {
    setIsDropdownOpen(false);
    onRoleSwitch?.();
  };

  const handleLogin = () => {
    setIsDropdownOpen(false);
    onLogin?.();
  };

  const avatarColors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-red-500 to-red-600',
    'from-green-500 to-green-600',
    'from-yellow-500 to-yellow-600'
  ];

  const colorIndex = Object.keys(ROLE_LABELS).indexOf(userRole);
  const avatarGradient = avatarColors[colorIndex] || avatarColors[0];

  if (!currentUser) {
    return (
      <button
        onClick={onLogin}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-blue-600 hover:bg-blue-500 text-white',
          'transition-all duration-200',
          'shadow-lg shadow-blue-500/20'
        )}
      >
        <User size={16} />
        <span className="text-sm font-medium">登录</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-slate-800/50 border border-slate-700/50',
          'hover:bg-slate-800 hover:border-slate-600',
          'transition-all duration-200',
          isDropdownOpen && 'bg-slate-800 border-slate-600'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center',
          avatarGradient,
          'shadow-lg'
        )}>
          <User size={16} className="text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-200">{currentUser.name}</p>
          <p className={cn('text-xs', roleInfo.color)}>
            {roleInfo.label}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-400 transition-transform duration-200',
            isDropdownOpen && 'rotate-180'
          )}
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-xl z-50 animate-fadeIn overflow-hidden">
          {!showUserInfo ? (
            <>
              <div className="px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center',
                    avatarGradient
                  )}>
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{displayUser.name}</p>
                    <Badge variant={userRole === 'admin' ? 'warning' : userRole === 'blood_bank_director' ? 'danger' : userRole === 'department_director' ? 'info' : userRole === 'nurse' ? 'success' : 'default'}>
                      {roleInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => setShowUserInfo(true)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <UserCircle size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200">个人信息</p>
                    <p className="text-xs text-slate-400">查看和修改个人资料</p>
                  </div>
                </button>

                <button
                  onClick={handleRoleSwitch}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <RefreshCw size={16} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200">切换角色</p>
                    <p className="text-xs text-slate-400">使用其他身份登录</p>
                  </div>
                </button>

                {!fullUser && (
                  <button
                    onClick={handleLogin}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <User size={16} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-200">账号登录</p>
                      <p className="text-xs text-slate-400">使用用户名密码登录</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="border-t border-slate-700/50 pt-1 pb-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-red-500/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <LogOut size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-red-400">退出登录</p>
                    <p className="text-xs text-slate-400">退出当前账号</p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 space-y-4">
              <button
                onClick={() => setShowUserInfo(false)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                ← 返回
              </button>

              <div className="flex justify-center">
                <div className={cn(
                  'w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center',
                  avatarGradient,
                  'shadow-xl'
                )}>
                  <User size={40} className="text-white" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-200">{displayUser.name}</h3>
                <Badge variant={userRole === 'admin' ? 'warning' : userRole === 'blood_bank_director' ? 'danger' : userRole === 'department_director' ? 'purple' : userRole === 'nurse' ? 'success' : 'info'}>
                  {roleInfo.label}
                </Badge>
              </div>

              {fullUser && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-700/30 rounded-lg">
                    <Mail size={16} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">邮箱</p>
                      <p className="text-sm text-slate-200">{fullUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-700/30 rounded-lg">
                    <Phone size={16} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">电话</p>
                      <p className="text-sm text-slate-200">{fullUser.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-700/30 rounded-lg">
                    <Building2 size={16} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">部门</p>
                      <p className="text-sm text-slate-200">{fullUser.department}</p>
                    </div>
                  </div>
                </div>
              )}

              {!fullUser && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400">使用预设账号登录以查看完整信息</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
