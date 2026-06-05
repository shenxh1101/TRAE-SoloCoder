import * as XLSX from 'xlsx';
import type { Book, MonthlyStats } from '@/types';

export const importBooksFromExcel = (file: File): Promise<Partial<Book>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const books: Partial<Book>[] = jsonData.map((row) => ({
          isbn: String(row.ISBN || row.isbn || ''),
          title: String(row.书名 || row.title || ''),
          author: String(row.作者 || row.author || ''),
          publisher: String(row.出版社 || row.publisher || ''),
          publishDate: String(row.出版日期 || row.publishDate || ''),
          category: String(row.分类 || row.category || ''),
          location: String(row.馆藏位置 || row.location || ''),
          totalCopies: Number(row.总数量 || row.totalCopies || 1),
          availableCopies: Number(row.可借数量 || row.availableCopies || 1),
          price: Number(row.价格 || row.price || 0),
          description: String(row.简介 || row.description || ''),
        }));

        resolve(books);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const exportBooksToExcel = (books: Book[]): void => {
  const data = books.map((book) => ({
    ISBN: book.isbn,
    书名: book.title,
    作者: book.author,
    出版社: book.publisher,
    出版日期: book.publishDate,
    分类: book.category,
    馆藏位置: book.location,
    总数量: book.totalCopies,
    可借数量: book.availableCopies,
    价格: book.price,
    借阅次数: book.borrowCount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '图书列表');
  XLSX.writeFile(workbook, `图书列表_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportMonthlyStatsToExcel = (stats: MonthlyStats): void => {
  const popularBooksData = stats.popularBooks.map((item, index) => ({
    排名: index + 1,
    书名: item.title,
    借阅次数: item.count,
  }));

  const readerTypeData = stats.readerTypeStats.map((item) => ({
    读者类型: item.type,
    借阅数量: item.count,
  }));

  const summaryData = [
    { 指标: '总借阅量', 数值: stats.totalBorrows },
    { 指标: '总归还量', 数值: stats.totalReturns },
    { 指标: '逾期率', 数值: `${(stats.overdueRate * 100).toFixed(2)}%` },
    { 指标: '罚款总额', 数值: `¥${stats.totalFines.toFixed(2)}` },
  ];

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, '统计概览');

  const popularSheet = XLSX.utils.json_to_sheet(popularBooksData);
  XLSX.utils.book_append_sheet(workbook, popularSheet, '热门图书排行');

  const readerSheet = XLSX.utils.json_to_sheet(readerTypeData);
  XLSX.utils.book_append_sheet(workbook, readerSheet, '读者类型统计');

  XLSX.writeFile(workbook, `月度统计报表_${stats.month}.xlsx`);
};
