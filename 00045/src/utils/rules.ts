import type { DamageLevel, BorrowRecord, BorrowEligibility } from '@/types';
import { getOverdueDays, isOverdue } from './date';

export const calculateDamageFee = (damageLevel: DamageLevel, bookPrice: number): number => {
  switch (damageLevel) {
    case 'none':
      return 0;
    case 'minor':
      return Math.round(bookPrice * 0.3);
    case 'moderate':
      return Math.round(bookPrice * 0.6);
    case 'severe':
      return Math.round(bookPrice);
    default:
      return 0;
  }
};

export const getDamageDescription = (damageLevel: DamageLevel): string => {
  switch (damageLevel) {
    case 'none':
      return '无损坏';
    case 'minor':
      return '轻微损坏（封面划痕、页角折损）';
    case 'moderate':
      return '中度损坏（页面缺失、水印）';
    case 'severe':
      return '严重损坏（无法阅读）';
    default:
      return '无损坏';
  }
};

export const checkBorrowEligibility = (borrowRecords: BorrowRecord[]): BorrowEligibility => {
  const overdueRecords = borrowRecords.filter(
    (record) => record.status === 'borrowed' && isOverdue(record.dueDate)
  );

  const overdueCount = overdueRecords.length;

  if (overdueCount === 0) {
    return { eligible: true };
  }

  const maxOverdueDays = Math.max(...overdueRecords.map((r) => getOverdueDays(r.dueDate)));

  if (overdueCount > 3) {
    return {
      eligible: false,
      reason: `逾期图书超过3本（当前${overdueCount}本），请先归还后再借阅`,
    };
  }

  if (maxOverdueDays > 30) {
    return {
      eligible: false,
      reason: `有图书逾期超过30天（最长${maxOverdueDays}天），请先归还后再借阅`,
    };
  }

  return { eligible: true };
};

export const calculateOverdueFine = (dueDate: string, bookPrice: number): number => {
  const days = getOverdueDays(dueDate);
  if (days <= 0) return 0;
  return Math.min(days * 0.5, bookPrice * 2);
};

export const BOOK_CATEGORIES = [
  '文学小说',
  '历史传记',
  '哲学宗教',
  '社会科学',
  '自然科学',
  '工程技术',
  '计算机科学',
  '经济管理',
  '艺术设计',
  '外语学习',
  '教材教辅',
  '其他',
];

export const BOOK_LOCATIONS = [
  'A区-中文图书',
  'B区-外文图书',
  'C区-期刊杂志',
  'D区-工具书',
  'E区-特藏图书',
  'F区-电子阅览',
];
