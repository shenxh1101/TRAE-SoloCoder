import { User, UserRole } from '../types';

export const hasPermission = (user: User | null, requiredRole: UserRole | UserRole[]): boolean => {
  if (!user) return false;
  
  const roles: UserRole[] = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  const roleHierarchy: Record<UserRole, number> = {
    employee: 1,
    manager: 2,
    admin: 3,
  };
  
  return roles.some(role => roleHierarchy[user.role] >= roleHierarchy[role]);
};

export const canViewAllVehicles = (user: User | null): boolean => {
  return hasPermission(user, 'admin');
};

export const canManageVehicles = (user: User | null): boolean => {
  return hasPermission(user, 'admin');
};

export const canApproveApplications = (user: User | null): boolean => {
  return hasPermission(user, ['manager', 'admin']);
};

export const canViewReports = (user: User | null): boolean => {
  return hasPermission(user, ['manager', 'admin']);
};

export const canViewAllHistory = (user: User | null): boolean => {
  return hasPermission(user, ['manager', 'admin']);
};

export const canManageMaintenance = (user: User | null): boolean => {
  return hasPermission(user, 'admin');
};

export const getRoleName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    employee: '普通员工',
    manager: '部门主管',
    admin: '车管员',
  };
  return roleNames[role];
};

export const getRoutePermissions = (): Record<string, UserRole[]> => {
  return {
    '/dashboard': ['employee', 'manager', 'admin'],
    '/vehicles': ['admin'],
    '/application': ['employee', 'manager', 'admin'],
    '/approval': ['manager', 'admin'],
    '/return': ['employee', 'manager', 'admin'],
    '/history': ['employee', 'manager', 'admin'],
    '/reports': ['manager', 'admin'],
    '/maintenance': ['admin'],
  };
};

export const canAccessRoute = (route: string, role: UserRole): boolean => {
  const permissions = getRoutePermissions();
  const allowedRoles = permissions[route] || [];
  
  if (allowedRoles.length === 0) return true;
  
  return hasPermission({ role } as User, allowedRoles);
};
