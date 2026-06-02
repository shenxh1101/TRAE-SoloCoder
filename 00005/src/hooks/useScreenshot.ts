import { useCallback } from 'react';
import type { GlWithRefs } from '../components/Scene';

const MAX_IMAGE_SIZE_MB = 8;

export const useScreenshot = (gl: GlWithRefs | null) => {
  const takeScreenshot = useCallback(() => {
    console.log('[截图] 开始执行截图...');
    console.log('[截图] gl 对象:', gl ? '存在' : 'null');
    console.log('[截图] gl.domElement:', gl?.domElement ? '存在' : 'null');
    console.log('[截图] gl.sceneRef:', gl?.sceneRef ? '存在' : 'null');
    console.log('[截图] gl.cameraRef:', gl?.cameraRef ? '存在' : 'null');

    if (!gl || !gl.domElement) {
      console.error('[截图] 失败：WebGLRenderer 或 domElement 未就绪');
      alert('截图失败：3D场景尚未就绪，请稍后再试');
      return;
    }

    try {
      const canvas = gl.domElement as HTMLCanvasElement;
      console.log('[截图] canvas 尺寸:', canvas.width, 'x', canvas.height);
      console.log('[截图] preserveDrawingBuffer:', gl.getContextAttributes()?.preserveDrawingBuffer);

      if (gl.sceneRef && gl.cameraRef) {
        console.log('[截图] 执行强制渲染一帧...');
        gl.render(gl.sceneRef, gl.cameraRef);
      }

      const dataURL = canvas.toDataURL('image/png');
      console.log('[截图] dataURL 长度:', dataURL.length);
      console.log('[截图] dataURL 前100字符:', dataURL.substring(0, 100));
      console.log('[截图] dataURL 是否为空:', dataURL === 'data:,');

      if (!dataURL || dataURL === 'data:,') {
        console.error('[截图] toDataURL 返回空数据');
        alert('截图失败：画布数据为空。可能原因：\n1. 场景未完成渲染\n2. 跨域资源污染了画布\n3. 浏览器安全限制');
        return;
      }

      if (!dataURL.startsWith('data:image/png')) {
        console.error('[截图] toDataURL 返回格式异常:', dataURL.substring(0, 30));
        alert('截图失败：返回数据格式异常');
        return;
      }

      const sizeMB = (dataURL.length * 0.75) / (1024 * 1024);
      console.log('[截图] 预估PNG大小:', sizeMB.toFixed(2), 'MB');

      if (sizeMB > MAX_IMAGE_SIZE_MB) {
        if (!confirm(`截图大小约 ${sizeMB.toFixed(1)}MB，确认下载？`)) {
          console.log('[截图] 用户取消大文件下载');
          return;
        }
      }

      downloadImage(dataURL);
      console.log('[截图] 截图下载已触发！');
    } catch (err) {
      console.error('[截图] 异常:', err);
      alert('截图失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  }, [gl]);

  return takeScreenshot;
};

const downloadImage = (dataURL: string) => {
  const link = document.createElement('a');
  link.download = `dream-fragments-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  link.href = dataURL;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 200);
};
