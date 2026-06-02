import ImageUploader from '../components/upload/ImageUploader';
import PixelSlider from '../components/control/PixelSlider';
import ToneSelector from '../components/control/ToneSelector';
import BrightnessContrastSlider from '../components/control/BrightnessContrastSlider';
import DecorationPanel from '../components/control/DecorationPanel';
import PixelPreview from '../components/preview/PixelPreview';

export default function SingleMode() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3 space-y-4">
          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-3 text-xs text-purple-400">上传图片</h3>
            <ImageUploader />
          </div>

          <div className="pixel-card p-4">
            <h3 className="font-pixel mb-3 text-xs text-purple-400">参数调节</h3>
            <div className="space-y-4">
              <PixelSlider />
              <ToneSelector />
              <BrightnessContrastSlider />
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="pixel-card p-5">
            <h3 className="font-pixel mb-4 text-sm text-purple-400">预览</h3>
            <PixelPreview />
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="pixel-card p-4">
            <DecorationPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
