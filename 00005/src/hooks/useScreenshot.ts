import { useCallback } from 'react';
import type { GlWithRefs } from '../components/Scene';

export const useScreenshot = (gl: GlWithRefs | null) => {
  const takeScreenshot = useCallback(() => {
    if (!gl || !gl.sceneRef || !gl.cameraRef) return;

    gl.render(gl.sceneRef, gl.cameraRef);

    const dataURL = gl.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `dream-fragments-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }, [gl]);

  return takeScreenshot;
};
