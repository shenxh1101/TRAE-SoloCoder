import { useRef, useCallback, useEffect } from 'react';
import {
  WebSocketMessage,
  JoinMessage,
  LeaveMessage,
  DrawMessage,
  LayerMessage,
  ViewMessage,
  HistoryMessage,
  CursorMessage,
  SyncMessage,
  Point,
  ToolType,
  ToolProperties,
  Layer,
} from '../../shared/types';
import { useRoomStore } from '../store/useRoomStore';
import { useLayerStore } from '../store/useLayerStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { drawPreview } from '../utils/drawing';

const getDefaultWsUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
};
const DEFAULT_WS_URL = typeof window !== 'undefined' ? getDefaultWsUrl() : 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 3000;

interface UseWebSocketOptions {
  url?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  sendMessage: (message: WebSocketMessage) => void;
  joinRoom: (roomId: string, userName: string) => void;
  leaveRoom: () => void;
  sendDrawAction: (layerId: string, toolType: ToolType, points: Point[], properties: ToolProperties) => void;
  sendLayerAction: (action: 'create' | 'delete' | 'update' | 'reorder', layerId: string, data: Partial<Layer>) => void;
  sendViewUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  sendHistoryAction: (action: 'undo' | 'redo', layerId: string) => void;
  sendCursorUpdate: (position: Point, toolType: ToolType) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = DEFAULT_WS_URL,
    autoReconnect = true,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS,
    reconnectInterval = RECONNECT_INTERVAL,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualDisconnectRef = useRef(false);

  const { roomId, userId } = useRoomStore();
  const setConnectionStatus = useRoomStore((state) => state.setConnectionStatus);
  const addUser = useRoomStore((state) => state.addUser);
  const removeUser = useRoomStore((state) => state.removeUser);
  const setRoom = useRoomStore((state) => state.setRoom);

  const {
    createLayer,
    deleteLayer,
    updateLayer,
    reorderLayers,
    undoLayer,
    redoLayer,
    setLayerImageData,
    setActiveLayer: _setActiveLayer,
    layers: _layers,
  } = useLayerStore();

  const { setOffset, setZoom, updateCursor, removeCursor, resetView: _resetView } = useCanvasStore();

  const applyRemoteDrawAction = useCallback(
    async (layerId: string, toolType: string, points: Point[], properties: ToolProperties) => {
      const state = useLayerStore.getState();
      const layer = state.layers.find((l) => l.id === layerId);
      if (!layer) return;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      const CANVAS_WIDTH = 1920;
      const CANVAS_HEIGHT = 1080;
      tempCanvas.width = CANVAS_WIDTH;
      tempCanvas.height = CANVAS_HEIGHT;

      if (layer.imageData && layer.imageData !== '') {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = layer.imageData;
        });
        tempCtx.drawImage(img, 0, 0);
      }

      tempCtx.save();
      drawPreview(tempCtx, points, properties, toolType);
      tempCtx.restore();

      const newImageData = tempCanvas.toDataURL('image/png');
      setLayerImageData(layerId, newImageData, true);
    },
    [setLayerImageData]
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'user:join': {
            const joinMsg = message as JoinMessage;
            addUser({
              id: joinMsg.userId,
              name: joinMsg.userName,
              isHost: false,
            });
            break;
          }

          case 'user:leave': {
            const leaveMsg = message as LeaveMessage;
            removeUser(leaveMsg.userId);
            removeCursor(leaveMsg.userId);
            break;
          }

          case 'draw:action': {
            const drawMsg = message as DrawMessage;
            if (drawMsg.userId !== userId) {
              applyRemoteDrawAction(
                drawMsg.layerId,
                drawMsg.toolType,
                drawMsg.points,
                drawMsg.properties
              );
            }
            break;
          }

          case 'layer:create': {
            const layerMsg = message as LayerMessage;
            createLayer(layerMsg.data.name, layerMsg.data.imageData);
            break;
          }

          case 'layer:delete': {
            const layerMsg = message as LayerMessage;
            deleteLayer(layerMsg.layerId);
            break;
          }

          case 'layer:update': {
            const layerMsg = message as LayerMessage;
            const { id, ...updates } = layerMsg.data;
            void id;
            updateLayer(layerMsg.layerId, updates);
            break;
          }

          case 'layer:reorder': {
            const layerMsg = message as LayerMessage;
            if (layerMsg.data.order !== undefined) {
              reorderLayers(layerMsg.layerId, layerMsg.data.order);
            }
            break;
          }

          case 'view:update': {
            const viewMsg = message as ViewMessage;
            if (viewMsg.userId !== userId) {
              const { followHost } = useRoomStore.getState();
              if (followHost) {
                setOffset(viewMsg.offset);
                setZoom(viewMsg.zoom);
              }
            }
            break;
          }

          case 'history:undo': {
            const historyMsg = message as HistoryMessage;
            if (historyMsg.userId !== userId) {
              undoLayer(historyMsg.layerId);
            }
            break;
          }

          case 'history:redo': {
            const historyMsg = message as HistoryMessage;
            if (historyMsg.userId !== userId) {
              redoLayer(historyMsg.layerId);
            }
            break;
          }

          case 'sync:full': {
            const syncMsg = message as SyncMessage;
            const { state } = syncMsg;
            
            const { reset: resetLayers, setActiveLayer: storeSetActiveLayer } = useLayerStore.getState();
            const { resetView: storeResetView } = useCanvasStore.getState();
            const { reset: _storeResetRoom, addUser: storeAddUser } = useRoomStore.getState();
            
            resetLayers();
            storeResetView();
            
            state.layers.forEach((layer) => {
              createLayer(layer.name, layer.imageData);
            });
            
            if (state.activeLayerId) {
              storeSetActiveLayer(state.activeLayerId);
            }
            
            setOffset(state.offset);
            setZoom(state.zoom);
            
            state.users.forEach((user) => {
              if (user.id !== userId) {
                storeAddUser(user);
              }
            });
            
            console.log('Full sync completed');
            break;
          }

          case 'cursor:update': {
            const cursorMsg = message as CursorMessage;
            if (cursorMsg.userId !== userId) {
              updateCursor(cursorMsg.userId, {
                position: cursorMsg.position,
                userId: cursorMsg.userId,
                toolType: cursorMsg.toolType,
              });
            }
            break;
          }

          default: {
            const unknownMsg = message as { type: string };
            console.warn('Unknown message type:', unknownMsg.type);
            break;
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
    [userId, addUser, removeUser, removeCursor, createLayer, deleteLayer, updateLayer, reorderLayers, setOffset, setZoom, undoLayer, redoLayer, updateCursor, applyRemoteDrawAction]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isManualDisconnectRef.current = false;
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        if (isManualDisconnectRef.current) {
          setConnectionStatus('idle');
          return;
        }

        setConnectionStatus('disconnected');

        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus('error');
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
      };

      ws.onmessage = handleMessage;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [url, autoReconnect, maxReconnectAttempts, reconnectInterval, setConnectionStatus, handleMessage]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
    setConnectionStatus('idle');
  }, [setConnectionStatus]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket is not connected. Message not sent:', message);
        return;
      }

      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    },
    []
  );

  const createBaseMessage = useCallback((): Partial<WebSocketMessage> => {
    return {
      roomId: roomId || '',
      userId: userId || '',
      timestamp: Date.now(),
    };
  }, [roomId, userId]);

  const joinRoom = useCallback(
    (roomId: string, userName: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
      }

      const newUserId = userId || `user_${Date.now()}`;

      setRoom(roomId, roomId, newUserId, userName, false);

      const message: JoinMessage = {
        type: 'user:join',
        roomId,
        userId: newUserId,
        userName,
        timestamp: Date.now(),
      };

      setTimeout(() => {
        sendMessage(message);
      }, 100);
    },
    [userId, connect, sendMessage, setRoom]
  );

  const leaveRoom = useCallback(() => {
    if (!roomId || !userId) return;

    const message: LeaveMessage = {
      type: 'user:leave',
      roomId,
      userId,
      timestamp: Date.now(),
    };

    sendMessage(message);
    disconnect();
  }, [roomId, userId, sendMessage, disconnect]);

  const sendDrawAction = useCallback(
    (layerId: string, toolType: ToolType, points: Point[], properties: ToolProperties) => {
      if (!roomId || !userId) return;

      const message: DrawMessage = {
        type: 'draw:action',
        ...createBaseMessage(),
        layerId,
        toolType,
        points,
        properties,
      } as DrawMessage;

      sendMessage(message);
    },
    [roomId, userId, createBaseMessage, sendMessage]
  );

  const sendLayerAction = useCallback(
    (action: 'create' | 'delete' | 'update' | 'reorder', layerId: string, data: Partial<Layer>) => {
      if (!roomId || !userId) return;

      const type = `layer:${action}` as LayerMessage['type'];

      const message: LayerMessage = {
        type,
        ...createBaseMessage(),
        layerId,
        data,
      } as LayerMessage;

      sendMessage(message);
    },
    [roomId, userId, createBaseMessage, sendMessage]
  );

  const sendViewUpdate = useCallback(
    (offset: { x: number; y: number }, zoom: number) => {
      if (!roomId || !userId) return;

      const message: ViewMessage = {
        type: 'view:update',
        ...createBaseMessage(),
        offset,
        zoom,
      } as ViewMessage;

      sendMessage(message);
    },
    [roomId, userId, createBaseMessage, sendMessage]
  );

  const sendHistoryAction = useCallback(
    (action: 'undo' | 'redo', layerId: string) => {
      if (!roomId || !userId) return;

      const type = `history:${action}` as HistoryMessage['type'];

      const message: HistoryMessage = {
        type,
        ...createBaseMessage(),
        layerId,
      } as HistoryMessage;

      sendMessage(message);
    },
    [roomId, userId, createBaseMessage, sendMessage]
  );

  const sendCursorUpdate = useCallback(
    (position: Point, toolType: ToolType) => {
      if (!roomId || !userId) return;

      const message: CursorMessage = {
        type: 'cursor:update',
        ...createBaseMessage(),
        position,
        toolType,
      } as CursorMessage;

      sendMessage(message);
    },
    [roomId, userId, createBaseMessage, sendMessage]
  );

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const isConnected = useRoomStore((state) => state.connectionStatus) === 'connected';

  return {
    sendMessage,
    joinRoom,
    leaveRoom,
    sendDrawAction,
    sendLayerAction,
    sendViewUpdate,
    sendHistoryAction,
    sendCursorUpdate,
    connect,
    disconnect,
    isConnected,
  };
};
