import { useRef, useCallback } from 'react'
import { Scene3D, SceneRefs } from '@/components/Scene3D'
import { ControlPanel } from '@/components/ControlPanel'
import { ItemTooltip } from '@/components/ItemTooltip'
import { AddItemModal } from '@/components/AddItemModal'
import { useGlassBallStore } from '@/store/useGlassBallStore'
import { captureScreenshot, exportConfigToJSON, importConfigFromJSON } from '@/utils/exportUtils'

export default function App() {
  const sceneRefsRef = useRef<SceneRefs | null>(null)
  const exportConfig = useGlassBallStore((s) => s.exportConfig)
  const importConfig = useGlassBallStore((s) => s.importConfig)

  const handleRefsReady = useCallback((refs: SceneRefs) => {
    sceneRefsRef.current = refs
  }, [])

  const handleScreenshot = useCallback(() => {
    captureScreenshot(sceneRefsRef.current)
  }, [])

  const handleExportConfig = useCallback(() => {
    const config = exportConfig()
    exportConfigToJSON(config)
  }, [exportConfig])

  const handleImportConfig = useCallback(async () => {
    const config = await importConfigFromJSON()
    if (config) {
      importConfig(config)
    }
  }, [importConfig])

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <Scene3D onRefsReady={handleRefsReady} />
      <ControlPanel onScreenshot={handleScreenshot} onExportConfig={handleExportConfig} />
      <ItemTooltip />
      <AddItemModal />

      <button
        onClick={handleImportConfig}
        className="fixed bottom-6 right-6 bg-[rgba(10,14,39,0.85)] backdrop-blur-xl border border-[rgba(201,169,110,0.2)] text-white/60 hover:text-white/90 rounded-xl px-4 py-2.5 text-sm hover:bg-[rgba(201,169,110,0.1)] transition-colors"
      >
        导入配置
      </button>
    </div>
  )
}
