import { v4 as uuidv4 } from 'uuid';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function addDays(date: string | Date, days: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function addHours(date: string | Date, hours: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(d.getHours() + hours);
  return formatDateTime(d);
}

export function getDaysDifference(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isExpired(expiryDate: string | Date): boolean {
  const now = new Date();
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  return now > expiry;
}

export function generateId(prefix: string = ''): string {
  const uuid = uuidv4().replace(/-/g, '').substring(0, 16);
  return prefix ? `${prefix}_${uuid}` : uuid;
}
