import { create } from 'zustand';

export type User = {
  id: string;
  name: string;
  color?: string;
  isHost: boolean;
};

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

type RoomState = {
  roomId: string | null;
  roomCode: string | null;
  userId: string | null;
  userName: string | null;
  users: User[];
  isHost: boolean;
  followHost: boolean;
  isFollowing: boolean;
  connectionStatus: ConnectionStatus;
};

type RoomActions = {
  setRoom: (roomId: string, roomCode: string, userId: string, userName: string, isHost: boolean) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setFollowHost: (follow: boolean) => void;
  setFollowing: (following: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  reset: () => void;
};

const initialState: RoomState = {
  roomId: null,
  roomCode: null,
  userId: null,
  userName: null,
  users: [],
  isHost: false,
  followHost: true,
  isFollowing: false,
  connectionStatus: 'idle',
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  setRoom: (roomId, roomCode, userId, userName, isHost) =>
    set({
      roomId,
      roomCode,
      userId,
      userName,
      isHost,
      connectionStatus: 'connected',
    }),

  addUser: (user) =>
    set((state) => ({
      users: [...state.users, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== userId),
    })),

  setFollowHost: (follow) =>
    set({
      followHost: follow,
    }),

  setFollowing: (following) =>
    set({
      isFollowing: following,
    }),

  setConnectionStatus: (status) =>
    set({
      connectionStatus: status,
    }),

  reset: () => set(initialState),
}));
