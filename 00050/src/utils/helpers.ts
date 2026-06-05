import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';

export function formatDate(date: string | Date, fmt: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: zhCN });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    completed: '已完成',
    normal: '正常',
    warning: '预警',
    danger: '危险',
    assigned: '已派单',
    accepted: '已接单',
    in_progress: '进行中',
    cancelled: '已取消',
    signed: '已签署',
    confirmed: '已确认',
    waiting: '候补',
    checked_in: '已签到',
    occupied: '已占用',
    available: '可预订',
    reserved: '已预留',
    locked: '已锁定',
    busy: '忙碌',
    offline: '离线',
  };
  return statusMap[status] || status;
}

export function getStatusClass(status: string): string {
  const classMap: Record<string, string> = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    completed: 'status-approved',
    normal: 'status-normal',
    warning: 'status-warning',
    danger: 'status-danger',
    assigned: 'status-pending',
    accepted: 'status-approved',
    in_progress: 'status-pending',
    cancelled: 'status-rejected',
    signed: 'status-approved',
    confirmed: 'status-approved',
    waiting: 'status-pending',
    checked_in: 'status-approved',
    occupied: 'status-rejected',
    available: 'status-approved',
    reserved: 'status-pending',
    locked: 'status-pending',
    busy: 'status-pending',
    offline: 'status-rejected',
  };
  return classMap[status] || 'status-pending';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
}

export function downloadFile(content: string, filename: string, type: string = 'application/pdf'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateVoucherHtml(data: Record<string, unknown>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>凭证</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #165DFF; padding-bottom: 20px; }
        .content { margin-top: 30px; }
        .row { display: flex; margin-bottom: 15px; }
        .label { width: 150px; font-weight: bold; color: #333; }
        .value { flex: 1; color: #666; }
        .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>智慧会展中心 - 系统凭证</h1>
        <p>凭证编号：${generateId()}</p>
      </div>
      <div class="content">
        ${Object.entries(data)
          .map(([key, value]) => `
          <div class="row">
            <div class="label">${key}：</div>
            <div class="value">${value}</div>
          </div>
        `)
          .join('')}
      </div>
      <div class="footer">
        <p>生成时间：${formatDateTime(new Date())}</p>
        <p>本凭证由系统自动生成，具有同等法律效力</p>
      </div>
    </body>
    </html>
  `;
}
