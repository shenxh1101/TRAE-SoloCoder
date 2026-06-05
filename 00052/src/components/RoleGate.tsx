import React from 'react';
import { UserRole } from '@/types';
import { authService } from '@/services/authService';
import { useBloodBankStore } from '@/store';

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const useHasRole = (allowedRoles: UserRole[]): boolean => {
  const { currentUser } = useBloodBankStore();
  const storedUser = authService.getCurrentUser();

  const userRole = (storedUser?.role as UserRole) || (currentUser.role as UserRole);

  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

export const RoleGate: React.FC<RoleGateProps> = ({
  allowedRoles,
  children,
  fallback = null
}) => {
  const hasPermission = useHasRole(allowedRoles);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
