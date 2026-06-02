import { Palette, AlertTriangle } from 'lucide-react';
import type { DailyInfo as DailyInfoType } from '../utils/fortuneEngine';

interface DailyInfoProps {
  info: DailyInfoType;
}

export default function DailyInfo({ info }: DailyInfoProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
        <h3 className="text-xl font-bold text-white text-center mb-6">✨ 今日特别提示 ✨</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-900" />
              </div>
              <h4 className="text-lg font-semibold text-white">今日幸运色</h4>
            </div>
            
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl shadow-lg border-2 border-white/30"
                style={{ backgroundColor: info.luckyColor.hex }}
              />
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-5 rounded shadow-md border border-white/30"
                  style={{ backgroundColor: info.luckyColor.hex }}
                />
                <div>
                  <p className="text-2xl font-bold text-white">{info.luckyColor.name}</p>
                  <p className="text-sm text-white/60 mt-1">穿戴此颜色可增加好运</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">今日不宜</h4>
            </div>
            
            <div className="pl-1">
              <p className="text-lg text-white/90 leading-relaxed">
                {info.avoidDoing}
              </p>
              <p className="text-sm text-white/50 mt-2">
                小心驶得万年船，避开霉运
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
