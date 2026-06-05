import dayjs from 'dayjs';
import type { UserRole } from '@/types';

export const formatDate = (date: string | Date, format = 'YYYY-MM-DD') => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const calculateDueDate = (role: UserRole): string => {
  const days = role === 'teacher' ? 60 : 30;
  return dayjs().add(days, 'day').format('YYYY-MM-DD');
};

export const calculateRenewDueDate = (currentDueDate: string): string => {
  return dayjs(currentDueDate).add(15, 'day').format('YYYY-MM-DD');
};

export const getDaysUntilDue = (dueDate: string): number => {
  return dayjs(dueDate).diff(dayjs(), 'day');
};

export const getOverdueDays = (dueDate: string): number => {
  const days = dayjs().diff(dayjs(dueDate), 'day');
  return days > 0 ? days : 0;
};

export const isExpiringSoon = (dueDate: string, days = 3): boolean => {
  const daysUntil = getDaysUntilDue(dueDate);
  return daysUntil >= 0 && daysUntil <= days;
};

export const isOverdue = (dueDate: string): boolean => {
  return dayjs().isAfter(dayjs(dueDate), 'day');
};

export const generateReservationExpireDate = (): string => {
  return dayjs().add(1, 'day').add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
};

export const getCurrentMonth = (): string => {
  return dayjs().format('YYYY-MM');
};
