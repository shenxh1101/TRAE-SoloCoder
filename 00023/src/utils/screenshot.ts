export const takeScreenshot = (filename: string = 'pagoda-screenshot.png'): void => {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.error('No canvas element found');
    alert('未找到画布元素，请刷新页面重试');
    return;
  }

  try {
    const dataURL = canvas.toDataURL('image/png', 1.0);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(dataURL);
    }, 100);
    
    console.log('Screenshot saved:', filename);
  } catch (error) {
    console.error('Failed to take screenshot:', error);
    alert('截图失败：' + (error as Error).message);
  }
};
