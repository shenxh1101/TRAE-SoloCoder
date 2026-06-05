import { create } from 'zustand';
import dayjs from 'dayjs';
import type { MonthlyStats, BorrowRecord, Book, Fine, User } from '@/types';
import { getCurrentMonth } from '@/utils/date';

interface StatisticsState {
  monthlyStats: MonthlyStats | null;
  generateMonthlyReport: (
    borrowRecords: BorrowRecord[],
    books: Book[],
    fines: Fine[],
    users: User[]
  ) => MonthlyStats;
  getPopularBooks: (books: Book[], limit?: number) => { bookId: string; title: string; count: number }[];
  getReaderTypeStats: (borrowRecords: BorrowRecord[], users: User[]) => { type: string; count: number }[];
  getOverdueRate: (borrowRecords: BorrowRecord[]) => number;
  getDailyBorrows: (borrowRecords: BorrowRecord[], days?: number) => { date: string; count: number }[];
  getTodayStats: (borrowRecords: BorrowRecord[], fines: Fine[], books: Book[]) => {
    todayBorrows: number;
    todayReturns: number;
    totalBorrowed: number;
    overdueCount: number;
    totalFines: number;
    totalBooks: number;
  };
}

export const useStatisticsStore = create<StatisticsState>()((_, get) => ({
  monthlyStats: null,
  
  generateMonthlyReport: (borrowRecords, books, fines, users) => {
    const currentMonth = getCurrentMonth();
    const monthBorrows = borrowRecords.filter((r) =>
      dayjs(r.borrowDate).format('YYYY-MM') === currentMonth
    );
    const monthReturns = borrowRecords.filter(
      (r) => r.returnDate && dayjs(r.returnDate).format('YYYY-MM') === currentMonth
    );
    const monthFines = fines.filter((f) =>
      dayjs(f.createdAt).format('YYYY-MM') === currentMonth
    );

    const stats: MonthlyStats = {
      month: currentMonth,
      totalBorrows: monthBorrows.length,
      totalReturns: monthReturns.length,
      popularBooks: get().getPopularBooks(books, 10),
      readerTypeStats: get().getReaderTypeStats(monthBorrows, users),
      overdueRate: get().getOverdueRate(borrowRecords),
      totalFines: monthFines.reduce((sum, f) => sum + f.amount, 0),
    };

    return stats;
  },
  
  getPopularBooks: (books, limit = 10) => {
    return [...books]
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, limit)
      .map((book) => ({
        bookId: book.id,
        title: book.title,
        count: book.borrowCount,
      }));
  },
  
  getReaderTypeStats: (borrowRecords, users) => {
    const stats: Record<string, number> = {
      student: 0,
      teacher: 0,
    };

    borrowRecords.forEach((record) => {
      const user = users.find((u) => u.id === record.userId);
      if (user && user.role !== 'admin') {
        stats[user.role] = (stats[user.role] || 0) + 1;
      }
    });

    return [
      { type: '学生', count: stats.student },
      { type: '教师', count: stats.teacher },
    ];
  },
  
  getOverdueRate: (borrowRecords) => {
    const totalBorrowed = borrowRecords.filter(
      (r) => r.status === 'borrowed' || r.status === 'overdue'
    ).length;
    const overdueCount = borrowRecords.filter((r) => r.status === 'overdue').length;
    return totalBorrowed > 0 ? overdueCount / totalBorrowed : 0;
  },
  
  getDailyBorrows: (borrowRecords, days = 7) => {
    const result: { date: string; count: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const count = borrowRecords.filter((r) => r.borrowDate === date).length;
      result.push({ date, count });
    }
    
    return result;
  },
  
  getTodayStats: (borrowRecords, fines, books) => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayBorrows = borrowRecords.filter((r) => r.borrowDate === today).length;
    const todayReturns = borrowRecords.filter((r) => r.returnDate === today).length;
    const totalBorrowed = borrowRecords.filter(
      (r) => r.status === 'borrowed' || r.status === 'overdue'
    ).length;
    const overdueCount = borrowRecords.filter((r) => r.status === 'overdue').length;
    const totalFines = fines.filter((f) => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
    
    return {
      todayBorrows,
      todayReturns,
      totalBorrowed,
      overdueCount,
      totalFines,
      totalBooks: books.length,
    };
  },
}));
