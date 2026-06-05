export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text';

export interface ToolProperties {
  size: number;
  color: string;
  opacity: number;
  fill?: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export interface HistoryEntry {
  id: string;
  layerId: string;
  actionType: string;
  previousState: string;
  nextState: string;
  createdAt: number;
}

export interface Layer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  opacity: number;
  imageData: string;
  history: HistoryEntry[];
  historyIndex: number;
  backgroundImage?: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  joinedAt?: number;
}

export interface CanvasState {
  layers: Layer[];
  activeLayerId: string | null;
  offset: { x: number; y: number };
  zoom: number;
  users: User[];
}

export interface BaseMessage {
  type: string;
  roomId: string;
  userId: string;
  timestamp: number;
}

export interface JoinMessage extends BaseMessage {
  type: 'user:join';
  userName: string;
}

export interface LeaveMessage extends BaseMessage {
  type: 'user:leave';
}

export interface DrawMessage extends BaseMessage {
  type: 'draw:action';
  layerId: string;
  toolType: ToolType;
  points: Point[];
  properties: ToolProperties;
}

export interface LayerMessage extends BaseMessage {
  type: 'layer:create' | 'layer:delete' | 'layer:update' | 'layer:reorder';
  layerId: string;
  data: Partial<Layer>;
}

export interface ViewMessage extends BaseMessage {
  type: 'view:update';
  offset: { x: number; y: number };
  zoom: number;
}

export interface HistoryMessage extends BaseMessage {
  type: 'history:undo' | 'history:redo';
  layerId: string;
}

export interface SyncMessage extends BaseMessage {
  type: 'sync:full';
  state: CanvasState;
}

export interface CursorMessage extends BaseMessage {
  type: 'cursor:update';
  position: Point;
  toolType: ToolType;
}

export type WebSocketMessage =
  | JoinMessage
  | LeaveMessage
  | DrawMessage
  | LayerMessage
  | ViewMessage
  | HistoryMessage
  | SyncMessage
  | CursorMessage;
