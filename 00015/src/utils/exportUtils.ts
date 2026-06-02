import { SceneRefs } from '@/components/Scene3D'

export function captureScreenshot(refs: SceneRefs | null): void {
  if (!refs || !refs.canvas) {
    console.error('[captureScreenshot] canvas is null')
    return
  }

  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const dataURL = refs.canvas.toDataURL('image/png')
          if (dataURL === 'data:,') {
            console.error('[captureScreenshot] got empty dataURL')
            return
          }
          const anchor = document.createElement('a')
          anchor.href = dataURL
          anchor.download = `glass-ball-memory-${Date.now()}.png`
          document.body.appendChild(anchor)
          anchor.click()
          document.body.removeChild(anchor)
          console.log('[captureScreenshot] screenshot saved successfully')
        } catch (err) {
          console.error('[captureScreenshot] toDataURL failed:', err)
        }
      })
    })
  } catch (err) {
    console.error('[captureScreenshot] failed:', err)
  }
}

export interface ExportedBallItem {
  id: string;
  name: string;
  modelType: string;
  description: string;
  position: [number, number, number];
  isCustom: boolean;
}

export interface ExportedConfig {
  year: number;
  color: string;
  items: ExportedBallItem[];
  createdAt: string;
}

export function exportConfigToJSON(config: ExportedConfig): void {
  try {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `glass-ball-config-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    console.log('[exportConfigToJSON] config saved successfully')
  } catch (err) {
    console.error('[exportConfigToJSON] failed:', err)
  }
}

export function importConfigFromJSON(): Promise<ExportedConfig | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = JSON.parse(e.target?.result as string);
          console.log('[importConfigFromJSON] config loaded:', result)
          resolve(result as ExportedConfig);
        } catch (err) {
          console.error('[importConfigFromJSON] parse failed:', err)
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };

    input.click();
  });
}
