import dayjs from 'dayjs';
import { UserRole } from '@prisma/client';

export const calculateDueDate = (role: UserRole): Date => {
  const days = role === 'TEACHER' ? 60 : 30;
  return dayjs().add(days, 'day').toDate();
};

export const getOverdueDays = (dueDate: Date): number => {
  const today = dayjs();
  const due = dayjs(dueDate);
  if (today.isAfter(due)) {
    return today.diff(due, 'day');
  }
  return 0;
};

export const isExpiringSoon = (dueDate: Date, days: number = 3): boolean => {
  const today = dayjs();
  const due = dayjs(dueDate);
  const diff = due.diff(today, 'day');
  return diff >= 0 && diff <= days;
};

export const calculateDamageFee = (price: number, damageLevel: string): number => {
  const rates: Record<string, number> = {
    none: 0,
    minor: 0.3,
    moderate: 0.6,
    severe: 1.0,
  };
  return price * (rates[damageLevel] || 0);
};

export const calculateOverdueFine = (overdueDays: number): number => {
  const dailyRate = 0.5;
  return overdueDays * dailyRate;
};

export const checkBorrowEligibility = (
  overdueCount: number,
  maxOverdueDays: number
): { eligible: boolean; reason?: string } => {
  if (overdueCount > 3) {
    return { eligible: false, reason: '逾期图书超过3本，禁止借阅' };
  }
  if (maxOverdueDays > 30) {
    return { eligible: false, reason: '有图书逾期超过30天，禁止借阅' };
  }
  return { eligible: true };
};

export const BOOK_CATEGORIES = [
  '文学小说',
  '科学技术',
  '历史人文',
  '经济管理',
  '计算机科学',
  '教育学习',
  '艺术设计',
  '医药卫生',
  '政治法律',
  '其他',
];
