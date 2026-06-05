import type { ApprovalStatus, UserRole } from '../types';

export type ApprovalAction = 'submit' | 'approve' | 'reject' | 'push' | 'implement' | 'rework';

const roleHierarchy: Record<UserRole, number> = {
  traffic_police: 0,
  command_director: 1,
  transport_bureau: 2,
};

function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function transitionApprovalStatus(
  current: ApprovalStatus,
  action: ApprovalAction,
  userRole: UserRole
): ApprovalStatus {
  switch (current) {
    case 'draft':
      if (action === 'submit' && hasRequiredRole(userRole, 'command_director')) {
        return 'pending_command';
      }
      break;

    case 'pending_command':
      if (action === 'approve') {
        return 'approved_command';
      }
      if (action === 'reject') {
        return 'rejected_command';
      }
      break;

    case 'approved_command':
      if (action === 'push' && userRole === 'command_director') {
        return 'pending_bureau';
      }
      break;

    case 'rejected_command':
      if (action === 'rework') {
        return 'draft';
      }
      break;

    case 'pending_bureau':
      if (action === 'approve') {
        return 'approved_bureau';
      }
      if (action === 'reject') {
        return 'rejected_bureau';
      }
      break;

    case 'approved_bureau':
      if (action === 'push' && userRole === 'transport_bureau') {
        return 'pending_government';
      }
      break;

    case 'rejected_bureau':
      if (action === 'rework') {
        return 'draft';
      }
      break;

    case 'pending_government':
      if (action === 'approve') {
        return 'approved_government';
      }
      if (action === 'reject') {
        return 'rejected_government';
      }
      break;

    case 'approved_government':
      if (action === 'implement' && (userRole === 'transport_bureau')) {
        return 'implemented';
      }
      break;

    case 'rejected_government':
      if (action === 'rework') {
        return 'draft';
      }
      break;
  }

  return current;
}

export function getRequiredRoleForLevel(level: number): UserRole {
  switch (level) {
    case 0:
      return 'command_director';
    case 1:
      return 'transport_bureau';
    case 2:
      return 'transport_bureau';
    default:
      return 'command_director';
  }
}

export function canUserPerformAction(
  status: ApprovalStatus,
  action: ApprovalAction,
  userRole: UserRole
): boolean {
  switch (status) {
    case 'draft':
      if (action === 'submit') {
        return hasRequiredRole(userRole, 'command_director');
      }
      return false;

    case 'pending_command':
      if (action === 'approve' || action === 'reject') {
        return userRole === 'command_director';
      }
      return false;

    case 'approved_command':
      if (action === 'push') {
        return userRole === 'command_director';
      }
      return false;

    case 'rejected_command':
      if (action === 'rework') {
        return hasRequiredRole(userRole, 'command_director');
      }
      return false;

    case 'pending_bureau':
      if (action === 'approve' || action === 'reject') {
        return userRole === 'transport_bureau';
      }
      return false;

    case 'approved_bureau':
      if (action === 'push') {
        return userRole === 'transport_bureau';
      }
      return false;

    case 'rejected_bureau':
      if (action === 'rework') {
        return hasRequiredRole(userRole, 'command_director');
      }
      return false;

    case 'pending_government':
      if (action === 'approve' || action === 'reject') {
        return userRole === 'transport_bureau';
      }
      return false;

    case 'approved_government':
      if (action === 'implement') {
        return userRole === 'transport_bureau';
      }
      return false;

    case 'rejected_government':
      if (action === 'rework') {
        return hasRequiredRole(userRole, 'command_director');
      }
      return false;

    case 'implemented':
      return false;

    default:
      return false;
  }
}

export function getNextApprovalLevel(status: ApprovalStatus): number | null {
  switch (status) {
    case 'draft':
      return 0;
    case 'pending_command':
    case 'approved_command':
    case 'rejected_command':
      return 0;
    case 'pending_bureau':
    case 'approved_bureau':
    case 'rejected_bureau':
      return 1;
    case 'pending_government':
    case 'approved_government':
    case 'rejected_government':
      return 2;
    case 'implemented':
      return null;
    default:
      return null;
  }
}

export function getApprovalLevelDescription(level: number): string {
  switch (level) {
    case 0:
      return '一级:指挥中心';
    case 1:
      return '二级:交通局';
    case 2:
      return '三级:市政府';
    default:
      return '未知';
  }
}

export function getApprovalStatusName(status: ApprovalStatus): string {
  const statusNames: Partial<Record<ApprovalStatus, string>> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    draft: '草稿',
    pending_command: '待指挥中心审批',
    approved_command: '指挥中心已批准',
    rejected_command: '指挥中心已驳回',
    pending_bureau: '待交通局审批',
    approved_bureau: '交通局已批准',
    rejected_bureau: '交通局已驳回',
    pending_government: '待市政府审批',
    approved_government: '市政府已批准',
    rejected_government: '市政府已驳回',
    implemented: '已实施',
  };
  return statusNames[status] || '未知';
}

export function getAvailableActions(status: ApprovalStatus, userRole: UserRole): ApprovalAction[] {
  const allActions: ApprovalAction[] = ['submit', 'approve', 'reject', 'push', 'implement', 'rework'];
  return allActions.filter(action => canUserPerformAction(status, action, userRole));
}
