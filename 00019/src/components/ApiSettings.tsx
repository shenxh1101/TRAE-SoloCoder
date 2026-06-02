import { useState, useEffect } from 'react'
import { Settings, X, Check, AlertCircle } from 'lucide-react'
import type { LLMConfig } from '@/utils/types'
import { DEFAULT_LLM_CONFIG } from '@/utils/types'
import { loadLLMConfig, saveLLMConfig, isLLMReady } from '@/utils/llmService'

export default function ApiSettings() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setConfig(loadLLMConfig())
  }, [])

  const handleSave = () => {
    saveLLMConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const ready = isLLMReady(config)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        <span>{ready ? 'LLM已连接' : '本地模式'}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-400' : 'bg-gray-600'}`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#E63946]" />
                <h2 className="text-white font-bold text-lg">AI接口设置</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-[#D4A574]" />
                  <span className="text-xs text-[#D4A574] font-medium">说明</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  配置OpenAI兼容接口后，AI将使用真实大语言模型生成辩论回应，回应更自然、更有针对性。未配置时使用本地智能模板引擎生成回应。
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">启用LLM接口</span>
                <button
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${config.enabled ? 'bg-[#E63946]' : 'bg-[#2A2A2A]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className={!config.enabled ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-sm text-gray-300 mb-1.5">API Base URL</label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-[#E63946] transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">支持OpenAI、DeepSeek、通义千问等兼容接口</p>
              </div>

              <div className={!config.enabled ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-sm text-gray-300 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-[#E63946] transition-colors"
                />
              </div>

              <div className={!config.enabled ? 'opacity-40 pointer-events-none' : ''}>
                <label className="block text-sm text-gray-300 mb-1.5">模型名称</label>
                <input
                  type="text"
                  value={config.model}
                  onChange={e => setConfig({ ...config, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-[#E63946] transition-colors"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#2A2A2A] flex items-center gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#E63946] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#C62D3A] transition-colors"
              >
                {saved ? <Check className="w-4 h-4" /> : null}
                {saved ? '已保存' : '保存设置'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-[#2A2A2A] text-gray-300 px-5 py-2.5 rounded-xl hover:bg-[#333] transition-colors border border-[#333]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
