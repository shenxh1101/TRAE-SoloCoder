export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publishDate: string;
  category: string;
  location: string;
  totalCopies: number;
  availableCopies: number;
  cover: string;
  description: string;
  price: number;
  borrowCount: number;
  createdAt: string;
}

export type BorrowStatus = 'borrowed' | 'returned' | 'overdue';

export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  book: Book;
  user?: User;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  renewed: boolean;
  status: BorrowStatus;
  createdAt: string;
}

export type ReservationStatus = 'pending' | 'ready' | 'expired' | 'completed';

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  book: Book;
  user?: User;
  reserveDate: string;
  expireDate: string;
  status: ReservationStatus;
  createdAt: string;
}

export type FineType = 'overdue' | 'damage';
export type FineStatus = 'unpaid' | 'paid';
export type DamageLevel = 'none' | 'minor' | 'moderate' | 'severe';

export interface Fine {
  id: string;
  userId: string;
  borrowRecordId: string;
  bookTitle: string;
  user?: User;
  type: FineType;
  amount: number;
  reason: string;
  status: FineStatus;
  paidDate?: string;
  createdAt: string;
}

export type MessageType = 'borrow' | 'renew' | 'reserve' | 'fine' | 'reminder' | 'system';

export interface Message {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: MessageType;
  read: boolean;
  createdAt: string;
}

export interface MonthlyStats {
  month: string;
  totalBorrows: number;
  totalReturns: number;
  popularBooks: { bookId: string; title: string; count: number }[];
  readerTypeStats: { type: string; count: number }[];
  overdueRate: number;
  totalFines: number;
}

export interface BorrowEligibility {
  eligible: boolean;
  reason?: string;
}
