import ImageUploader from '../components/upload/ImageUploader';
import PixelSlider from '../components/control/PixelSlider';
import BrightnessContrastSlider from '../components/control/BrightnessContrastSlider';
import MemeGrid from '../components/preview/MemeGrid';

export default function MemeMode() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-3 text-xs text-purple-400">上传表情</h3>
            <ImageUploader />
          </div>

          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-3 text-xs text-purple-400">像素参数</h3>
            <div className="space-y-4">
              <PixelSlider />
              <BrightnessContrastSlider />
            </div>
          </div>

          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-2 text-xs text-purple-400">趣味模式说明</h3>
            <p className="font-vt text-sm text-gray-400 leading-relaxed">
              上传一张脸部照片，系统将自动生成9种不同表情的像素风表情包。每种表情使用独特的色彩变换和几何变形，让你的像素头像活起来！
            </p>
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2 font-vt text-sm text-purple-300/60">
                <span>😄</span> 开心 → 暖色调 + 拉伸变形
              </div>
              <div className="flex items-center gap-2 font-vt text-sm text-purple-300/60">
                <span>😠</span> 生气 → 红色调 + 压缩变形
              </div>
              <div className="flex items-center gap-2 font-vt text-sm text-purple-300/60">
                <span>😢</span> 伤心 → 蓝色调 + 延展变形
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="pixel-card p-5">
            <h3 className="font-pixel mb-4 text-sm text-purple-400">
              表情包九宫格
            </h3>
            <MemeGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
