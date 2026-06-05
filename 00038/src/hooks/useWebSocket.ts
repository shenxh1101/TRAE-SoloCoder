import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { updateSimulationStatus, updateProgress, updateGrowthRate, addNotification } =
    useSimulationStore();

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket('ws://localhost:3001');

      wsRef.current.onopen = () => {
        console.log('WebSocket 连接已建立');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'simulation:status': {
              const { id, status, message: msg } = message.data as {
                id: string;
                status: string;
                message: string;
              };
              updateSimulationStatus(id, status as never, msg);
              break;
            }
            case 'simulation:progress': {
              const { id, progress } = message.data as { id: string; progress: number };
              updateProgress(id, progress);
              break;
            }
            case 'simulation:instability': {
              const { id, rate } = message.data as { id: string; rate: number };
              updateGrowthRate(id, rate);
              break;
            }
            case 'notification:new': {
              addNotification(message.data as never);
              break;
            }
          }
        } catch (e) {
          console.error('消息解析失败:', e);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 错误:', error);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket 连接已关闭，5秒后重试...');
        setTimeout(connect, 5000);
      };
    } catch (e) {
      console.error('WebSocket 连接失败:', e);
    }
  }, [updateSimulationStatus, updateProgress, updateGrowthRate, addNotification]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const subscribe = useCallback((simulationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'simulation:subscribe',
          data: { simulationId },
        })
      );
    }
  }, []);

  const unsubscribe = useCallback((simulationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'simulation:unsubscribe',
          data: { simulationId },
        })
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, subscribe, unsubscribe };
}
