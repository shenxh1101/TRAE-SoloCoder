import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, LogIn, Copy, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoomStore } from '@/store/useRoomStore'
import { useWebSocket } from '@/hooks/useWebSocket'

type RoomAction = 'create' | 'join' | null

interface FormErrors {
  userName?: string
  roomCode?: string
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface CreateRoomResponse {
  roomId: string
  roomCode: string
  hostId: string
}

interface JoinRoomResponse {
  roomId: string
  roomCode: string
  userId: string
  isHost: boolean
}

export default function RoomEntry() {
  const navigate = useNavigate()
  const { setRoom, setConnectionStatus } = useRoomStore()
  const { connect, joinRoom, isConnected } = useWebSocket({ autoReconnect: false })

  const [userName, setUserName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [action, setAction] = useState<RoomAction>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)

  useEffect(() => {
    setConnectionStatus('idle')
  }, [setConnectionStatus])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!userName.trim()) {
      newErrors.userName = '请输入用户名'
    } else if (userName.trim().length > 20) {
      newErrors.userName = '用户名长度不能超过20个字符'
    }

    if (action === 'join') {
      if (!roomCode.trim()) {
        newErrors.roomCode = '请输入房间码'
      } else if (!/^[A-Z0-9]{6}$/i.test(roomCode.trim())) {
        newErrors.roomCode = '房间码格式不正确'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCopyRoomCode = async () => {
    if (createdRoomCode) {
      await navigator.clipboard.writeText(createdRoomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)

    if (!validateForm() || !action) return

    setIsLoading(true)

    try {
      if (action === 'create') {
        const response = await fetch('/api/rooms/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: userName.trim() }),
        })

        const data = (await response.json()) as ApiResponse<CreateRoomResponse>

        if (!data.success || !data.data) {
          throw new Error(data.error || '创建房间失败')
        }

        const { roomId, roomCode, hostId } = data.data

        setCreatedRoomCode(roomCode)

        connect()

        await new Promise<void>((resolve, reject) => {
          const checkConnection = setInterval(() => {
            if (isConnected) {
              clearInterval(checkConnection)
              resolve()
            }
          }, 100)

          setTimeout(() => {
            clearInterval(checkConnection)
            reject(new Error('连接超时'))
          }, 5000)
        })

        setRoom(roomId, roomCode, hostId, userName.trim(), true)
        joinRoom(roomId, userName.trim())

        setTimeout(() => {
          navigate(`/canvas/${roomId}`)
        }, 500)
      } else {
        const response = await fetch('/api/rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: userName.trim(),
            roomCode: roomCode.toUpperCase().trim(),
          }),
        })

        const data = (await response.json()) as ApiResponse<JoinRoomResponse>

        if (!data.success || !data.data) {
          throw new Error(data.error || '加入房间失败')
        }

        const { roomId, userId } = data.data

        connect()

        await new Promise<void>((resolve, reject) => {
          const checkConnection = setInterval(() => {
            if (isConnected) {
              clearInterval(checkConnection)
              resolve()
            }
          }, 100)

          setTimeout(() => {
            clearInterval(checkConnection)
            reject(new Error('连接超时'))
          }, 5000)
        })

        setRoom(roomId, roomCode, userId, userName.trim(), false)
        joinRoom(roomId, userName.trim())

        setTimeout(() => {
          navigate(`/canvas/${roomId}`)
        }, 500)
      }
    } catch (error) {
      console.error('Room operation failed:', error)
      setApiError(error instanceof Error ? error.message : '操作失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleActionSelect = (selectedAction: RoomAction) => {
    setAction(selectedAction)
    setErrors({})
    setApiError(null)
    setRoomCode('')
    setCreatedRoomCode(null)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/25">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">在线协作白板</h1>
          <p className="text-gray-400">创建或加入房间，开始实时协作</p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-sm opacity-75 animate-gradient" />
          <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
            {createdRoomCode ? (
              <div className="text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">房间创建成功！</h2>
                <p className="text-gray-400 mb-4">分享房间码给你的伙伴</p>
                <div className="flex items-center justify-center gap-2 bg-gray-800/50 rounded-xl px-4 py-3 mb-6">
                  <span className="text-2xl font-mono font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    {createdRoomCode}
                  </span>
                  <button
                    onClick={handleCopyRoomCode}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在进入房间...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="请输入你的用户名"
                    className={cn(
                      'w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-500',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
                      'transition-all duration-200',
                      errors.userName ? 'border-red-500/50' : 'border-white/10'
                    )}
                    maxLength={20}
                  />
                  {errors.userName && (
                    <p className="mt-1 text-sm text-red-400">{errors.userName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    选择操作
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleActionSelect('create')}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200',
                        'hover:scale-[1.02] active:scale-[0.98]',
                        action === 'create'
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                          : 'bg-gray-800/30 border-white/10 hover:bg-gray-800/50 hover:border-white/20'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center mb-2',
                        action === 'create'
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                          : 'bg-gray-700/50'
                      )}>
                        <Plus className={cn(
                          'w-5 h-5',
                          action === 'create' ? 'text-white' : 'text-gray-400'
                        )} />
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        action === 'create' ? 'text-white' : 'text-gray-400'
                      )}>
                        创建房间
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleActionSelect('join')}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200',
                        'hover:scale-[1.02] active:scale-[0.98]',
                        action === 'join'
                          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-lg shadow-green-500/10'
                          : 'bg-gray-800/30 border-white/10 hover:bg-gray-800/50 hover:border-white/20'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center mb-2',
                        action === 'join'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                          : 'bg-gray-700/50'
                      )}>
                        <LogIn className={cn(
                          'w-5 h-5',
                          action === 'join' ? 'text-white' : 'text-gray-400'
                        )} />
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        action === 'join' ? 'text-white' : 'text-gray-400'
                      )}>
                        加入房间
                      </span>
                    </button>
                  </div>
                </div>

                {action === 'join' && (
                  <div className="animate-slide-down">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      房间码
                    </label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="请输入6位房间码"
                      className={cn(
                        'w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-white placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50',
                        'transition-all duration-200 uppercase tracking-widest font-mono text-center text-xl',
                        errors.roomCode ? 'border-red-500/50' : 'border-white/10'
                      )}
                      maxLength={6}
                    />
                    {errors.roomCode && (
                      <p className="mt-1 text-sm text-red-400">{errors.roomCode}</p>
                    )}
                  </div>
                )}

                {apiError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-shake">
                    <p className="text-sm text-red-400">{apiError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !action}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl font-medium text-white',
                    'flex items-center justify-center gap-2',
                    'transition-all duration-200 transform',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                    action === 'create'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/25'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>处理中...</span>
                    </>
                  ) : (
                    <>
                      {action === 'create' ? (
                        <><Plus className="w-5 h-5" /> 创建房间</>
                      ) : action === 'join' ? (
                        <><LogIn className="w-5 h-5" /> 加入房间</>
                      ) : (
                        '请选择操作'
                      )}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          加入房间即表示同意我们的服务条款和隐私政策
        </p>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-gradient {
          animation: gradient 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
