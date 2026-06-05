import { useState, useRef } from 'react'
import { Plus, Eye, EyeOff, ArrowUp, ArrowDown, Trash2, Pencil, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayerStore } from '@/store/useLayerStore'
import type { Layer } from '../../../shared/types'

export default function LayerPanel() {
  const {
    layers,
    activeLayerId,
    createLayer,
    deleteLayer,
    renameLayer,
    reorderLayers,
    setActiveLayer,
    toggleLayerVisibility,
  } = useLayerStore()

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)

  const sortedLayers = [...layers].sort((a, b) => b.order - a.order)

  const handleCreateLayer = () => {
    const newLayer = createLayer(`图层 ${layers.length + 1}`)
    setActiveLayer(newLayer.id)
  }

  const handleDeleteLayer = (layerId: string) => {
    deleteLayer(layerId)
  }

  const handleToggleVisibility = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation()
    toggleLayerVisibility(layerId)
  }

  const handleMoveUp = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation()
    const newOrder = layer.order + 1
    if (newOrder < layers.length) {
      reorderLayers(layer.id, newOrder)
    }
  }

  const handleMoveDown = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation()
    const newOrder = layer.order - 1
    if (newOrder >= 0) {
      reorderLayers(layer.id, newOrder)
    }
  }

  const handleStartRename = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation()
    setEditingLayerId(layer.id)
    setEditingName(layer.name)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleFinishRename = (layerId: string) => {
    if (editingName.trim()) {
      renameLayer(layerId, editingName.trim())
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, layerId: string) => {
    if (e.key === 'Enter') {
      handleFinishRename(layerId)
    } else if (e.key === 'Escape') {
      setEditingLayerId(null)
      setEditingName('')
    }
  }

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault()
    if (draggedLayerId && draggedLayerId !== layerId) {
      setDragOverLayerId(layerId)
    }
  }

  const handleDragLeave = () => {
    setDragOverLayerId(null)
  }

  const handleDrop = (e: React.DragEvent, targetLayer: Layer) => {
    e.preventDefault()
    if (draggedLayerId && draggedLayerId !== targetLayer.id) {
      reorderLayers(draggedLayerId, targetLayer.order)
    }
    setDraggedLayerId(null)
    setDragOverLayerId(null)
  }

  const handleDragEnd = () => {
    setDraggedLayerId(null)
    setDragOverLayerId(null)
  }

  const handleLayerClick = (layerId: string) => {
    if (editingLayerId !== layerId) {
      setActiveLayer(layerId)
    }
  }

  const LayerThumbnail = ({ imageData }: { imageData: string }) => (
    <div className="w-10 h-10 rounded bg-gray-700 border border-white/10 overflow-hidden shrink-0">
      {imageData ? (
        <img
          src={imageData}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-transparent" />
      )}
    </div>
  )

  return (
    <div className="w-64 bg-gray-800 border-l border-white/10 flex flex-col shrink-0">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-medium text-sm">图层</h3>
        <button
          onClick={handleCreateLayer}
          className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="新建图层"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedLayers.map((layer) => (
          <div
            key={layer.id}
            draggable
            onDragStart={(e) => handleDragStart(e, layer.id)}
            onDragOver={(e) => handleDragOver(e, layer.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layer)}
            onDragEnd={handleDragEnd}
            onClick={() => handleLayerClick(layer.id)}
            className={cn(
              'group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200',
              activeLayerId === layer.id
                ? 'bg-blue-500/20 ring-1 ring-blue-500/50'
                : 'hover:bg-gray-700/50',
              draggedLayerId === layer.id && 'opacity-50',
              dragOverLayerId === layer.id && 'ring-2 ring-blue-400/50',
              editingLayerId === layer.id && 'cursor-text'
            )}
          >
            <div className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <GripVertical className="w-3 h-3" />
            </div>

            <button
              onClick={(e) => handleToggleVisibility(e, layer.id)}
              className="text-gray-400 hover:text-white transition-colors shrink-0"
              title={layer.visible ? '隐藏图层' : '显示图层'}
            >
              {layer.visible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>

            <LayerThumbnail imageData={layer.imageData} />

            {editingLayerId === layer.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleFinishRename(layer.id)}
                onKeyDown={(e) => handleKeyDown(e, layer.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-blue-500 outline-none min-w-0"
              />
            ) : (
              <span
                className={cn(
                  'text-sm truncate flex-1',
                  layer.visible ? 'text-white' : 'text-gray-500'
                )}
              >
                {layer.name}
              </span>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleMoveUp(e, layer)}
                disabled={layer.order >= layers.length - 1}
                className={cn(
                  'w-6 h-6 rounded flex items-center justify-center transition-colors',
                  layer.order >= layers.length - 1
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                )}
                title="上移"
              >
                <ArrowUp className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => handleMoveDown(e, layer)}
                disabled={layer.order <= 0}
                className={cn(
                  'w-6 h-6 rounded flex items-center justify-center transition-colors',
                  layer.order <= 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                )}
                title="下移"
              >
                <ArrowDown className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => handleStartRename(e, layer)}
                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                title="重命名"
              >
                <Pencil className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteLayer(layer.id)
                }}
                className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                title="删除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {layers.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            暂无图层
          </div>
        )}
      </div>
    </div>
  )
}
