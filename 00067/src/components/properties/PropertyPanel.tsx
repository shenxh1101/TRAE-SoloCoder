import { cn } from '@/lib/utils'
import { useToolStore, type ToolType } from '@/store/useToolStore'

const presetColors = [
  '#000000',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
]

const fontFamilies = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimSun', label: '宋体' },
  { value: 'SimHei', label: '黑体' },
  { value: 'KaiTi', label: '楷体' },
]

const toolLabels: Record<ToolType, string> = {
  pen: '画笔',
  eraser: '橡皮擦',
  line: '直线',
  rectangle: '矩形',
  circle: '圆形',
  text: '文字',
}

const toolsWithStroke: ToolType[] = ['pen', 'eraser', 'line', 'rectangle', 'circle']
const toolsWithFill: ToolType[] = ['rectangle', 'circle']
const toolsWithText: ToolType[] = ['text']

export default function PropertyPanel() {
  const { currentTool, properties, updateProperty } = useToolStore()

  const showStroke = toolsWithStroke.includes(currentTool)
  const showFill = toolsWithFill.includes(currentTool)
  const showText = toolsWithText.includes(currentTool)

  return (
    <div className="w-56 bg-gray-800 border-r border-white/10 flex flex-col shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-medium mb-1 text-sm">属性面板</h3>
        <p className="text-xs text-gray-400">当前工具: {toolLabels[currentTool]}</p>
      </div>

      <div className="p-4 space-y-5">
        {showStroke && (
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
              基本属性
            </h4>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">粗细</label>
                <span className="text-xs text-blue-400 font-mono">
                  {properties.size}px
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={properties.size}
                onChange={(e) => updateProperty('size', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">颜色</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded border border-white/20"
                    style={{ backgroundColor: properties.color }}
                  />
                  <input
                    type="color"
                    value={properties.color}
                    onChange={(e) => updateProperty('color', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                    title="自定义颜色"
                  />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateProperty('color', color)}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all hover:scale-105',
                      properties.color === color
                        ? 'border-blue-500 scale-110 ring-2 ring-blue-500/30'
                        : 'border-white/10 hover:border-white/30'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">不透明度</label>
                <span className="text-xs text-blue-400 font-mono">
                  {Math.round(properties.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={properties.opacity * 100}
                onChange={(e) => updateProperty('opacity', Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {showFill && (
          <div className="space-y-4 pt-2 border-t border-white/10">
            <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
              形状属性
            </h4>

            <div className="flex items-center justify-between">
              <label htmlFor="fill-toggle" className="text-xs text-gray-400">
                填充形状
              </label>
              <button
                id="fill-toggle"
                onClick={() => updateProperty('fill', !properties.fill)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors duration-200',
                  properties.fill ? 'bg-blue-500' : 'bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow',
                    properties.fill ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </div>
        )}

        {showText && (
          <div className="space-y-4">
            <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
              文字属性
            </h4>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">字体大小</label>
                <span className="text-xs text-blue-400 font-mono">
                  {properties.fontSize}px
                </span>
              </div>
              <input
                type="range"
                min="12"
                max="72"
                value={properties.fontSize}
                onChange={(e) => updateProperty('fontSize', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>12</span>
                <span>72</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">字体</label>
              <select
                value={properties.fontFamily}
                onChange={(e) => updateProperty('fontFamily', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 appearance-none cursor-pointer"
                style={{ fontFamily: properties.fontFamily }}
              >
                {fontFamilies.map((font) => (
                  <option
                    key={font.value}
                    value={font.value}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">颜色</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded border border-white/20"
                    style={{ backgroundColor: properties.color }}
                  />
                  <input
                    type="color"
                    value={properties.color}
                    onChange={(e) => updateProperty('color', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                    title="自定义颜色"
                  />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateProperty('color', color)}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all hover:scale-105',
                      properties.color === color
                        ? 'border-blue-500 scale-110 ring-2 ring-blue-500/30'
                        : 'border-white/10 hover:border-white/30'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">不透明度</label>
                <span className="text-xs text-blue-400 font-mono">
                  {Math.round(properties.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={properties.opacity * 100}
                onChange={(e) => updateProperty('opacity', Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
