import { create } from 'zustand'
import { getItemsForYear, ModelType, eraItems } from '@/data/eraMapping'
import { ExportedConfig, ExportedBallItem } from '@/utils/exportUtils'

function safeModelType(type: string): ModelType {
  const validTypes: ModelType[] = ['phone', 'tape', 'tv', 'camera', 'computer', 'radio', 'walkman', 'floppy', 'gameboy', 'cd', 'pager', 'vhs', 'newspaper', 'typewriter', 'custom']
  return validTypes.includes(type as ModelType) ? (type as ModelType) : 'custom'
}

function convertImportedItem(item: ExportedBallItem): BallItem {
  return {
    ...item,
    modelType: safeModelType(item.modelType)
  }
}

export interface BallItem {
  id: string
  name: string
  modelType: ModelType
  description: string
  position: [number, number, number]
  isCustom: boolean
}

export interface GlassBallConfig {
  year: number
  color: string
  items: BallItem[]
  createdAt: string
}

interface GlassBallState {
  year: number
  color: string
  items: BallItem[]
  isGenerated: boolean
  selectedItem: BallItem | null
  showItemTooltip: boolean
  showAddItemModal: boolean
  setYear: (year: number) => void
  setColor: (color: string) => void
  generateBall: () => void
  selectItem: (item: BallItem | null) => void
  setShowItemTooltip: (show: boolean) => void
  setShowAddItemModal: (show: boolean) => void
  addCustomItem: (name: string, description: string) => void
  removeItem: (id: string) => void
  exportConfig: () => GlassBallConfig
  importConfig: (config: ExportedConfig) => void
}

const randomPosition = (): [number, number, number] => {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.random() * 1.0
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  ]
}

export const useGlassBallStore = create<GlassBallState>((set, get) => ({
  year: 1999,
  color: '#4fc3f7',
  items: [],
  isGenerated: false,
  selectedItem: null,
  showItemTooltip: false,
  showAddItemModal: false,
  setYear: (year) => set({ year }),
  setColor: (color) => set({ color }),
  generateBall: () => {
    console.log('[Store] generateBall called with year:', get().year)
    const matchedItems = getItemsForYear(get().year)
    console.log('[Store] matched items count:', matchedItems.length)
    const newItems = matchedItems.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      modelType: item.modelType,
      description: item.descriptions[Math.floor(Math.random() * item.descriptions.length)],
      position: randomPosition(),
      isCustom: false
    }))
    console.log('[Store] generated items:', newItems)
    set((state) => ({ items: [...state.items.filter(i => i.isCustom), ...newItems], isGenerated: true }))
    console.log('[Store] state updated, isGenerated:', true, 'items count:', get().items.length)
  },
  selectItem: (item) => set({ selectedItem: item }),
  setShowItemTooltip: (show) => set({ showItemTooltip: show }),
  setShowAddItemModal: (show) => set({ showAddItemModal: show }),
  addCustomItem: (name, description) => {
    console.log('[Store] addCustomItem called:', name, description)
    const item: BallItem = {
      id: crypto.randomUUID(),
      name,
      modelType: 'custom' as ModelType,
      description,
      position: randomPosition(),
      isCustom: true
    }
    set((state) => ({ items: [...state.items, item], isGenerated: true }))
    console.log('[Store] custom item added, total items:', get().items.length)
  },
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  exportConfig: () => ({
    year: get().year,
    color: get().color,
    items: get().items,
    createdAt: new Date().toISOString()
  }),
  importConfig: (config: ExportedConfig) => {
    console.log('[Store] importConfig called:', config)
    set({
      year: config.year,
      color: config.color,
      items: config.items.map(convertImportedItem),
      isGenerated: true
    })
    console.log('[Store] config imported, items count:', get().items.length)
  }
}))
