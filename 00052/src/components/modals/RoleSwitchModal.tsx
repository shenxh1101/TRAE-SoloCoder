import React, { useState } from 'react';
import { User, Check, LogIn, AlertCircle, Stethoscope, UserCheck, Droplets, Heart, Settings } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { authService, UserRole } from '@/services/authService';
import { useBloodBankStore } from '@/store';
import { cn } from '@/lib/utils';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  doctor: <Stethoscope size={24} />,
  department_director: <UserCheck size={24} />,
  blood_bank_director: <Droplets size={24} />,
  nurse: <Heart size={24} />,
  admin: <Settings size={24} />
};

const ROLE_INFO: Array<{
  role: UserRole;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  username: string;
  features: string[];
}> = [
  {
    role: 'doctor',
    name: '医生',
    description: '申请输血、查看患者信息',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    username: 'doctor',
    features: ['提交输血申请', '查看患者信息', '查询输血记录', '查看检验报告']
  },
  {
    role: 'department_director',
    name: '科室主任',
    description: '审批本科室输血申请',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    username: 'director',
    features: ['审批输血申请', '查看科室统计', '管理医生权限', '查看所有申请记录']
  },
  {
    role: 'blood_bank_director',
    name: '血库主任',
    description: '管理血库、审批输血申请',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    username: 'blood_bank_director',
    features: ['审批输血申请', '管理血液库存', '配血管理', '运输调度', '查看血库统计']
  },
  {
    role: 'nurse',
    name: '护士',
    description: '确认接收血液、执行输血',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    username: 'nurse',
    features: ['扫码接收血液', '确认输血执行', '查看输血任务', '记录输血反应']
  },
  {
    role: 'admin',
    name: '管理员',
    description: '系统管理、用户管理',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    username: 'admin',
    features: ['用户管理', '系统配置', '数据备份', '日志审计', '报表导出']
  }
];

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUser = authService.getCurrentUser();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
  };

  const handleQuickLogin = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    setError(null);

    try {
      await authService.quickLogin(selectedRole);
      onClose();
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换角色失败');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoleInfo = ROLE_INFO.find(r => r.role === selectedRole);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="切换角色" size="lg">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 rounded-2xl blur-xl -z-10" />

        <div className="space-y-5">
          {displayUser && (
            <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">当前登录</p>
                <p className="text-xs text-slate-400">
                  {displayUser.name} · {ROLE_INFO.find(r => r.role === displayUser.role)?.name}
                </p>
              </div>
              <Badge variant="success" className="ml-auto">
                已登录
              </Badge>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">选择要切换的角色</h3>
            <div className="space-y-2">
              {ROLE_INFO.map((roleInfo) => (
                <button
                  key={roleInfo.role}
                  onClick={() => handleRoleSelect(roleInfo.role)}
                  className={cn(
                    'w-full p-4 rounded-xl border text-left transition-all duration-200',
                    'flex items-start gap-4',
                    'hover:bg-slate-700/30',
                    selectedRole === roleInfo.role
                      ? cn(roleInfo.bgColor, roleInfo.borderColor, 'ring-2', roleInfo.borderColor.replace('border', 'ring'))
                      : 'bg-slate-800/30 border-slate-700/50',
                    displayUser?.role === roleInfo.role && 'opacity-60'
                  )}
                  disabled={displayUser?.role === roleInfo.role}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0',
                    selectedRole === roleInfo.role
                      ? cn(roleInfo.bgColor, roleInfo.borderColor)
                      : 'bg-slate-700/50 border-slate-600/50'
                  )}>
                    <span className={selectedRole === roleInfo.role ? roleInfo.color : 'text-slate-400'}>
                      {ROLE_ICONS[roleInfo.role]}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        'text-base font-semibold',
                        selectedRole === roleInfo.role ? roleInfo.color : 'text-slate-200'
                      )}>
                        {roleInfo.name}
                      </p>
                      {displayUser?.role === roleInfo.role && (
                        <Badge variant="info" className="text-[10px]">当前</Badge>
                      )}
                      {selectedRole === roleInfo.role && (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{roleInfo.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roleInfo.features.slice(0, 3).map((feature, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400"
                        >
                          {feature}
                        </span>
                      ))}
                      {roleInfo.features.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500">
                          +{roleInfo.features.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">账号</p>
                    <p className="text-sm font-mono text-slate-400">{roleInfo.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedRole && selectedRoleInfo && (
            <div className={cn(
              'p-4 rounded-xl border',
              selectedRoleInfo.bgColor,
              selectedRoleInfo.borderColor
            )}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cn('text-sm font-semibold', selectedRoleInfo.color)}>
                    即将切换到: {selectedRoleInfo.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    账号: {selectedRoleInfo.username} · 密码: password123
                  </p>
                </div>
                <Badge variant="info">快速登录</Badge>
              </div>
              <p className="text-xs text-slate-400">
                系统将使用预设账号自动登录，无需输入密码。
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              icon={<LogIn size={18} />}
              onClick={handleQuickLogin}
              disabled={!selectedRole || isLoading || displayUser?.role === selectedRole}
            >
              {isLoading ? '切换中...' : '快速切换'}
            </Button>
          </div>

          <p className="text-xs text-center text-slate-500">
            所有预设账号密码均为: password123
          </p>
        </div>
      </div>
    </Modal>
  );
};
