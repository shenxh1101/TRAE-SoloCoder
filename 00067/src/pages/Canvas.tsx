import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, ZoomIn, ZoomOut, LogOut, Users, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Toolbar from '@/components/toolbar/Toolbar'
import PropertyPanel from '@/components/properties/PropertyPanel'
import LayerPanel from '@/components/layers/LayerPanel'
import { useRoomStore } from '@/store/useRoomStore'
import { useLayerStore } from '@/store/useLayerStore'
import { useCanvasStore } from '@/store/useCanvasStore'
import { useCanvasRenderer } from '@/hooks/useCanvasRenderer'
import { useDrawing } from '@/hooks/useDrawing'
import { useWebSocket } from '@/hooks/useWebSocket'

export default function Canvas() {
  const navigate = useNavigate()
  const { roomId } = useParams<{ roomId: string }>()
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const {
    roomId: currentRoomId,
    userName,
    userId,
    users,
    followHost,
    setFollowHost,
    connectionStatus,
    reset: resetRoom,
  } = useRoomStore()

  const {
    activeLayerId,
    layers,
    reset: resetLayers,
    createLayer,
    setActiveLayer,
  } = useLayerStore()

  const { offset, zoom, resetView } = useCanvasStore()

  const { setupCanvas, drawPreview, clearPreview, requestRender } = useCanvasRenderer()

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    isDraggingCanvas,
  } = useDrawing(drawPreview, clearPreview, requestRender)

  const {
    connect,
    joinRoom,
    leaveRoom,
    disconnect,
    isConnected,
  } = useWebSocket()

  useEffect(() => {
    if (!roomId) {
      navigate('/')
      return
    }

    const initRoom = async () => {
      try {
        if (!currentRoomId || currentRoomId !== roomId) {
          const storedUserName = localStorage.getItem('whiteboard_userName') || '匿名用户'
          const storedUserId = localStorage.getItem('whiteboard_userId')

          if (!isConnected) {
            connect()
          }

          await new Promise<void>((resolve) => {
            const checkConnection = setInterval(() => {
              if (useRoomStore.getState().connectionStatus === 'connected') {
                clearInterval(checkConnection)
                resolve()
              }
            }, 100)

            setTimeout(() => {
              clearInterval(checkConnection)
              resolve()
            }, 3000)
          })

          const newUserId = storedUserId || `user_${Date.now()}`
          if (!storedUserId) {
            localStorage.setItem('whiteboard_userId', newUserId)
          }
          localStorage.setItem('whiteboard_userName', storedUserName)

          joinRoom(roomId, storedUserName)
        }

        if (layers.length === 0) {
          const defaultLayer = createLayer('图层 1')
          setActiveLayer(defaultLayer.id)
        }

        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize room:', error)
        setIsInitialized(true)
      }
    }

    initRoom()
  }, [roomId, currentRoomId, isConnected, connect, joinRoom, createLayer, setActiveLayer, layers.length, navigate])

  useEffect(() => {
    const mainCanvas = mainCanvasRef.current
    const previewCanvas = previewCanvasRef.current

    if (mainCanvas && previewCanvas) {
      const cleanup = setupCanvas(mainCanvas, previewCanvas)
      return cleanup
    }
  }, [setupCanvas])

  const handleZoomIn = useCallback(() => {
    useCanvasStore.getState().zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    useCanvasStore.getState().zoomOut()
  }, [])

  const handleLeave = () => {
    leaveRoom()
    disconnect()
    resetRoom()
    resetLayers()
    resetView()
    navigate('/')
  }

  const toggleFollowHost = () => {
    setFollowHost(!followHost)
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-3.5 h-3.5 text-green-400" />
      case 'connecting':
        return <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
      case 'disconnected':
      case 'error':
        return <WifiOff className="w-3.5 h-3.5 text-red-400" />
      default:
        return <WifiOff className="w-3.5 h-3.5 text-gray-400" />
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接'
      case 'connecting':
        return '连接中...'
      case 'disconnected':
        return '已断开'
      case 'error':
        return '连接错误'
      default:
        return '未连接'
    }
  }

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-gray-400">正在加载白板...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <PropertyPanel />

        <div
          ref={canvasContainerRef}
          className={cn(
            'flex-1 relative overflow-hidden select-none',
            isDraggingCanvas ? 'cursor-grabbing' : 'cursor-crosshair'
          )}
        >
          <canvas
            ref={mainCanvasRef}
            id="main-canvas"
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <canvas
            ref={previewCanvasRef}
            id="preview-canvas"
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white rounded-lg flex items-center justify-center transition-colors backdrop-blur-sm"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="text-xs text-center text-gray-400 font-mono bg-gray-800/80 backdrop-blur-sm rounded px-2 py-1">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white rounded-lg flex items-center justify-center transition-colors backdrop-blur-sm"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute top-4 left-4 flex flex-col gap-2 max-w-48">
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-2">
              <h4 className="text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                在线用户 ({users.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                      user.id === userId ? 'bg-blue-500/20' : 'bg-gray-700/30'
                    )}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: user.color || '#3b82f6' }}
                    />
                    <span className="text-gray-300 truncate flex-1">
                      {user.name}
                      {user.id === userId && ' (你)'}
                      {user.isHost && ' (房主)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <LayerPanel />
      </div>

      <div className="h-8 bg-gray-800 border-t border-white/10 flex items-center justify-between px-4 text-xs text-gray-400 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {getConnectionStatusIcon()}
            <span>{getConnectionStatusText()}</span>
          </div>
          <span>用户: {userName || '未登录'}</span>
          <span>图层: {activeLayerId ? layers.find((l) => l.id === activeLayerId)?.name : '无'}</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleFollowHost}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors',
              followHost
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-gray-300'
            )}
            title={followHost ? '取消跟随房主视角' : '跟随房主视角'}
          >
            {followHost ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>{followHost ? '跟随中' : '未跟随'}</span>
          </button>

          <span>位置: ({Math.round(offset.x)}, {Math.round(offset.y)})</span>
          <span>缩放: {Math.round(zoom * 100)}%</span>

          <button
            onClick={handleLeave}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="离开房间"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>离开</span>
          </button>
        </div>
      </div>
    </div>
  )
}
