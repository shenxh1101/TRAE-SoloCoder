import { create } from 'zustand';
import type { FinanceReport } from '../types';
import { generateFinanceReports } from '../utils/mockData';
import { generateId } from '../utils/helpers';

interface FinanceState {
  reports: FinanceReport[];
  selectedMonth: number;
  selectedYear: number;
  getReportsByMonth: (month: number, year: number) => FinanceReport[];
  getReportByHall: (hallId: string, month: number, year: number) => FinanceReport | undefined;
  generateMonthlyReport: (month: number, year: number) => FinanceReport[];
  getTotalBoothIncome: (month: number, year: number) => number;
  getTotalServiceIncome: (month: number, year: number) => number;
  getTotalIncome: (month: number, year: number) => number;
  getAverageUtilization: (month: number, year: number) => number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  exportReport: (reportId: string) => string;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  reports: generateFinanceReports(),
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),

  getReportsByMonth: (month, year) =>
    get().reports.filter((r) => r.month === month && r.year === year),

  getReportByHall: (hallId, month, year) =>
    get().reports.find((r) => r.hallId === hallId && r.month === month && r.year === year),

  generateMonthlyReport: (month, year) => {
    const existingReports = get().getReportsByMonth(month, year);
    if (existingReports.length > 0) {
      return existingReports;
    }

    const baseHalls = [
      { id: 'hall-1', name: '1号馆·科技主题馆' },
      { id: 'hall-2', name: '2号馆·智能制造馆' },
      { id: 'hall-3', name: '3号馆·新能源馆' },
      { id: 'hall-4', name: '4号馆·智慧城市馆' },
      { id: 'hall-5', name: '5号馆·综合服务馆' },
    ];

    const newReports: FinanceReport[] = baseHalls.map((hall) => {
      const boothIncome = 800000 + Math.floor(Math.random() * 1500000);
      const serviceIncome = 200000 + Math.floor(Math.random() * 500000);
      const utilizationRate = Math.round((0.7 + Math.random() * 0.25) * 100) / 100;

      return {
        id: generateId(),
        month,
        year,
        hallId: hall.id,
        hallName: hall.name,
        boothIncome,
        serviceIncome,
        utilizationRate,
        totalIncome: boothIncome + serviceIncome,
      };
    });

    set((state) => ({
      reports: [...state.reports, ...newReports],
    }));

    return newReports;
  },

  getTotalBoothIncome: (month, year) =>
    get()
      .getReportsByMonth(month, year)
      .reduce((sum, r) => sum + r.boothIncome, 0),

  getTotalServiceIncome: (month, year) =>
    get()
      .getReportsByMonth(month, year)
      .reduce((sum, r) => sum + r.serviceIncome, 0),

  getTotalIncome: (month, year) =>
    get()
      .getReportsByMonth(month, year)
      .reduce((sum, r) => sum + r.totalIncome, 0),

  getAverageUtilization: (month, year) => {
    const reports = get().getReportsByMonth(month, year);
    if (reports.length === 0) return 0;
    const sum = reports.reduce((sum, r) => sum + r.utilizationRate, 0);
    return Math.round((sum / reports.length) * 100) / 100;
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  setSelectedYear: (year) => set({ selectedYear: year }),

  exportReport: (reportId) => {
    const report = get().reports.find((r) => r.id === reportId);
    if (!report) return '';

    return `
      财务报表详情
      ======================================
      报告月份: ${report.year}年${report.month}月
      展馆: ${report.hallName}
      ======================================
      展位收入: ¥${report.boothIncome.toLocaleString()}
      服务收入: ¥${report.serviceIncome.toLocaleString()}
      总收入: ¥${report.totalIncome.toLocaleString()}
      展位利用率: ${(report.utilizationRate * 100).toFixed(1)}%
      ======================================
      生成时间: ${new Date().toLocaleString('zh-CN')}
    `;
  },
}));
