import { useFinanceStore } from '../store/useFinanceStore';
import { useNotificationStore } from '../store/useNotificationStore';

let monthlyCheckInterval: number | null = null;
let lastCheckedMonth: number | null = null;

export function startAutoScheduler() {
  if (monthlyCheckInterval) return;

  checkMonthlyReport();

  monthlyCheckInterval = window.setInterval(() => {
    checkMonthlyReport();
  }, 60 * 1000);
}

export function stopAutoScheduler() {
  if (monthlyCheckInterval) {
    clearInterval(monthlyCheckInterval);
    monthlyCheckInterval = null;
  }
}

function checkMonthlyReport() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  if (lastCheckedMonth === currentMonth) return;

  if (currentDay >= 1) {
    generateMonthlyFinanceReport(currentMonth, currentYear);
    lastCheckedMonth = currentMonth;
  }
}

function generateMonthlyFinanceReport(month: number, year: number) {
  const reports = useFinanceStore.getState().generateMonthlyReport(month, year);

  if (reports.length === 0) return;

  const totalIncome = reports.reduce((sum, r) => sum + r.totalIncome, 0);
  const avgUtilization = reports.reduce((sum, r) => sum + r.utilizationRate, 0) / reports.length;

  useNotificationStore.getState().pushFinanceNotification(
    'finance-1',
    reports[0].id,
    `${year}年${month}月财务报表已生成`,
    `本月总收入: ¥${totalIncome.toLocaleString()}，平均展位利用率: ${(avgUtilization * 100).toFixed(1)}%，点击查看详细分场馆对比报表。`
  );
}

export function triggerMonthlyReportManually() {
  const now = new Date();
  generateMonthlyFinanceReport(now.getMonth() + 1, now.getFullYear());
}
