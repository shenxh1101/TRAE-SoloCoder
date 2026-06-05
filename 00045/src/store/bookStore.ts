import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book } from '@/types';
import { mockBooks } from '@/utils/mock';

interface BookState {
  books: Book[];
  loading: boolean;
  fetchBooks: () => Promise<void>;
  searchBooks: (keyword: string, category?: string) => Book[];
  getBookById: (id: string) => Book | undefined;
  addBook: (book: Omit<Book, 'id' | 'borrowCount' | 'createdAt'>) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  importBooks: (books: Partial<Book>[]) => void;
  updateAvailableCopies: (bookId: string, delta: number) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      books: mockBooks,
      loading: false,
      
      fetchBooks: async () => {
        set({ loading: true });
        await new Promise((resolve) => setTimeout(resolve, 300));
        set({ loading: false });
      },
      
      searchBooks: (keyword, category) => {
        const { books } = get();
        return books.filter((book) => {
          const matchKeyword = !keyword || 
            book.title.toLowerCase().includes(keyword.toLowerCase()) ||
            book.author.toLowerCase().includes(keyword.toLowerCase()) ||
            book.isbn.includes(keyword);
          const matchCategory = !category || book.category === category;
          return matchKeyword && matchCategory;
        });
      },
      
      getBookById: (id) => {
        return get().books.find((book) => book.id === id);
      },
      
      addBook: (book) => {
        const newBook: Book = {
          ...book,
          id: generateId(),
          borrowCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        } as Book;
        set((state) => ({ books: [...state.books, newBook] }));
      },
      
      updateBook: (id, updates) => {
        set((state) => ({
          books: state.books.map((book) =>
            book.id === id ? { ...book, ...updates } : book
          ),
        }));
      },
      
      deleteBook: (id) => {
        set((state) => ({
          books: state.books.filter((book) => book.id !== id),
        }));
      },
      
      importBooks: (importedBooks) => {
        const newBooks = importedBooks.map((book) => ({
          ...book,
          id: generateId(),
          borrowCount: 0,
          availableCopies: book.totalCopies || 1,
          createdAt: new Date().toISOString().split('T')[0],
          cover: mockBooks[Math.floor(Math.random() * mockBooks.length)].cover,
        })) as Book[];
        set((state) => ({ books: [...state.books, ...newBooks] }));
      },
      
      updateAvailableCopies: (bookId, delta) => {
        set((state) => ({
          books: state.books.map((book) =>
            book.id === bookId
              ? { ...book, availableCopies: Math.max(0, book.availableCopies + delta) }
              : book
          ),
        }));
      },
    }),
    {
      name: 'library-book-storage',
    }
  )
);
