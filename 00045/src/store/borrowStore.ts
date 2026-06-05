import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type { BorrowRecord, Fine, DamageLevel, User } from '@/types';
import { mockBorrowRecords, mockFines, mockUsers } from '@/utils/mock';
import { calculateDueDate, calculateRenewDueDate, formatDate, isOverdue } from '@/utils/date';
import { calculateDamageFee, checkBorrowEligibility } from '@/utils/rules';

interface BorrowState {
  borrowRecords: BorrowRecord[];
  fines: Fine[];
  borrowBook: (userId: string, bookId: string, user: User, book: any) => { success: boolean; reason?: string };
  returnBook: (recordId: string, damageLevel: DamageLevel) => { success: boolean; fineAmount?: number };
  renewBook: (recordId: string) => { success: boolean; reason?: string };
  getUserBorrows: (userId: string) => BorrowRecord[];
  getUserFines: (userId: string) => Fine[];
  payFine: (fineId: string) => void;
  checkEligibility: (userId: string) => { eligible: boolean; reason?: string };
  getAllBorrows: () => BorrowRecord[];
  getAllFines: () => Fine[];
  getUserById: (userId: string) => User | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useBorrowStore = create<BorrowState>()(
  persist(
    (set, get) => ({
      borrowRecords: mockBorrowRecords,
      fines: mockFines,
      
      borrowBook: (userId, bookId, user, book) => {
        const userBorrows = get().getUserBorrows(userId);
        const eligibility = checkBorrowEligibility(userBorrows);
        
        if (!eligibility.eligible) {
          return { success: false, reason: eligibility.reason };
        }
        
        const dueDate = calculateDueDate(user.role);
        const newRecord: BorrowRecord = {
          id: generateId(),
          userId,
          bookId,
          book,
          user,
          borrowDate: formatDate(new Date()),
          dueDate,
          renewed: false,
          status: 'borrowed',
          createdAt: formatDate(new Date()),
        };
        
        set((state) => ({
          borrowRecords: [...state.borrowRecords, newRecord],
        }));
        
        return { success: true };
      },
      
      returnBook: (recordId, damageLevel) => {
        const record = get().borrowRecords.find((r) => r.id === recordId);
        if (!record) return { success: false };
        
        let fineAmount = 0;
        const fines: Fine[] = [];
        
        if (isOverdue(record.dueDate)) {
          const overdueDays = dayjs().diff(dayjs(record.dueDate), 'day');
          const overdueFine = Math.min(overdueDays * 0.5, record.book.price * 2);
          if (overdueFine > 0) {
            fineAmount += overdueFine;
            fines.push({
              id: generateId(),
              userId: record.userId,
              borrowRecordId: recordId,
              bookTitle: record.book.title,
              user: record.user,
              type: 'overdue',
              amount: overdueFine,
              reason: `逾期${overdueDays}天`,
              status: 'unpaid',
              createdAt: formatDate(new Date()),
            });
          }
        }
        
        const damageFee = calculateDamageFee(damageLevel, record.book.price);
        if (damageFee > 0) {
          fineAmount += damageFee;
          fines.push({
            id: generateId(),
            userId: record.userId,
            borrowRecordId: recordId,
            bookTitle: record.book.title,
            user: record.user,
            type: 'damage',
            amount: damageFee,
            reason: damageLevel === 'minor' ? '轻微损坏' : damageLevel === 'moderate' ? '中度损坏' : '严重损坏',
            status: 'unpaid',
            createdAt: formatDate(new Date()),
          });
        }
        
        set((state) => ({
          borrowRecords: state.borrowRecords.map((r) =>
            r.id === recordId
              ? { ...r, status: 'returned', returnDate: formatDate(new Date()) }
              : r
          ),
          fines: [...state.fines, ...fines],
        }));
        
        return { success: true, fineAmount };
      },
      
      renewBook: (recordId) => {
        const record = get().borrowRecords.find((r) => r.id === recordId);
        if (!record) return { success: false, reason: '借阅记录不存在' };
        if (record.renewed) return { success: false, reason: '已续借过一次，无法再次续借' };
        if (record.status !== 'borrowed') return { success: false, reason: '该图书已归还' };
        
        const newDueDate = calculateRenewDueDate(record.dueDate);
        
        set((state) => ({
          borrowRecords: state.borrowRecords.map((r) =>
            r.id === recordId
              ? { ...r, renewed: true, dueDate: newDueDate }
              : r
          ),
        }));
        
        return { success: true };
      },
      
      getUserBorrows: (userId) => {
        return get().borrowRecords.filter((r) => r.userId === userId);
      },
      
      getUserFines: (userId) => {
        return get().fines.filter((f) => f.userId === userId);
      },
      
      payFine: (fineId) => {
        set((state) => ({
          fines: state.fines.map((f) =>
            f.id === fineId
              ? { ...f, status: 'paid', paidDate: formatDate(new Date()) }
              : f
          ),
        }));
      },
      
      checkEligibility: (userId) => {
        const userBorrows = get().getUserBorrows(userId);
        return checkBorrowEligibility(userBorrows);
      },
      
      getAllBorrows: () => get().borrowRecords,
      getAllFines: () => get().fines,
      
      getUserById: (userId) => {
        return mockUsers.find((u) => u.id === userId);
      },
    }),
    {
      name: 'library-borrow-storage',
    }
  )
);
