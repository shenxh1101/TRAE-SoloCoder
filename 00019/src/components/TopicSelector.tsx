import { useState } from 'react'
import { Star } from 'lucide-react'
import { TOPICS } from '@/utils/aiEngine'
import { useDebateStore } from '@/store/debateStore'

export default function TopicSelector() {
  const { selectTopic, setCustomTopic, currentSession } = useDebateStore()
  const [customInput, setCustomInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [picksPro, setPicksPro] = useState(true)
  const [customPicksPro, setCustomPicksPro] = useState(true)

  const handleTopicClick = (index: number) => {
    if (selectedIndex === index) {
      selectTopic(index, picksPro)
      return
    }
    setSelectedIndex(index)
    setPicksPro(true)
  }

  const handleConfirmTopic = (index: number) => {
    selectTopic(index, picksPro)
  }

  const handleCustomSubmit = () => {
    const topic = customInput.trim()
    if (!topic) return
    setCustomTopic(topic, customPicksPro)
    setCustomInput('')
  }

  if (currentSession) return null

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#0D0D0D] min-h-full">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-[#E63946]" />
        <h2 className="text-lg font-bold text-white">选择辩题</h2>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="输入自定义辩题..."
          className="flex-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#E63946] transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
        />
        <div className="flex items-center gap-1 bg-[#2A2A2A] border border-[#1A1A1A] rounded-lg px-2">
          <button
            onClick={() => setCustomPicksPro(true)}
            className={`px-2 py-1 text-sm rounded transition-colors ${customPicksPro ? 'bg-[#E63946] text-white' : 'text-gray-400'}`}
          >
            正方
          </button>
          <button
            onClick={() => setCustomPicksPro(false)}
            className={`px-2 py-1 text-sm rounded transition-colors ${!customPicksPro ? 'bg-[#E63946] text-white' : 'text-gray-400'}`}
          >
            反方
          </button>
        </div>
        <button
          onClick={handleCustomSubmit}
          className="bg-[#E63946] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#C62D3A] transition-colors"
        >
          确认
        </button>
      </div>

      <div className="grid gap-3">
        {TOPICS.map((topic, index) => {
          const isSelected = selectedIndex === index
          return (
            <div
              key={index}
              onClick={() => handleTopicClick(index)}
              className={`bg-[#2A2A2A] border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-[#E63946] shadow-[0_0_15px_rgba(230,57,70,0.3)]'
                  : 'border-[#1A1A1A] hover:border-[#E63946]/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm leading-snug mb-2">
                    {topic.title}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-emerald-400">
                      正方：{topic.proStance}
                    </span>
                    <span className="text-xs text-orange-400">
                      反方：{topic.conStance}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPicksPro(true)
                      }}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        picksPro
                          ? 'bg-[#E63946] text-white'
                          : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                      }`}
                    >
                      正方
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPicksPro(false)
                      }}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        !picksPro
                          ? 'bg-[#E63946] text-white'
                          : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
                      }`}
                    >
                      反方
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConfirmTopic(index)
                      }}
                      className="mt-1 px-3 py-1 text-xs rounded-md bg-[#E63946]/20 text-[#E63946] hover:bg-[#E63946]/30 transition-colors"
                    >
                      确认
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
