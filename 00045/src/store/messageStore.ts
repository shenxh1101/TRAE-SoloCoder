import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, MessageType } from '@/types';
import { mockMessages } from '@/utils/mock';
import { formatDateTime } from '@/utils/date';

interface MessageState {
  messages: Message[];
  sendMessage: (userId: string, title: string, content: string, type: MessageType) => void;
  getUserMessages: (userId: string) => Message[];
  getUnreadCount: (userId: string) => number;
  markAsRead: (messageId: string) => void;
  markAllAsRead: (userId: string) => void;
  deleteMessage: (messageId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      messages: mockMessages,
      
      sendMessage: (userId, title, content, type) => {
        const newMessage: Message = {
          id: generateId(),
          userId,
          title,
          content,
          type,
          read: false,
          createdAt: formatDateTime(new Date()),
        };
        set((state) => ({
          messages: [newMessage, ...state.messages],
        }));
      },
      
      getUserMessages: (userId) => {
        return get().messages.filter((m) => m.userId === userId);
      },
      
      getUnreadCount: (userId) => {
        return get().messages.filter((m) => m.userId === userId && !m.read).length;
      },
      
      markAsRead: (messageId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, read: true } : m
          ),
        }));
      },
      
      markAllAsRead: (userId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.userId === userId ? { ...m, read: true } : m
          ),
        }));
      },
      
      deleteMessage: (messageId) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== messageId),
        }));
      },
    }),
    {
      name: 'library-message-storage',
    }
  )
);
