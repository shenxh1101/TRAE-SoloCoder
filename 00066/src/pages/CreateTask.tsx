import { useState } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Loader2
} from 'lucide-react';
import { taskApi, uploadApi } from '../services/taskApi';
import type { SourceParameters, PurposeCategory } from '../types';

const purposeOptions: { value: PurposeCategory; label: string }[] = [
  { value: 'concert_hall', label: '音乐厅' },
  { value: 'recording_studio', label: '录音棚' },
  { value: 'office', label: '办公室' },
  { value: 'classroom', label: '教室' },
  { value: 'auditorium', label: '报告厅' },
  { value: 'home_theater', label: '家庭影院' },
  { value: 'restaurant', label: '餐厅' },
];

export default function CreateTask() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    roomName: '',
    purposeCategory: '' as PurposeCategory | '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    },
    sourceParameters: {
      frequencyHz: 1000,
      soundPowerLevelDb: 85,
      sourceType: 'point' as SourceParameters['sourceType'],
      sourcePosition: [5, 1.5, 3] as [number, number, number],
    },
    priority: 'normal' as 'low' | 'normal' | 'high',
    notes: '',
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ['.skp', '.obj', '.stl', '.cad', '.dwg'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (validTypes.includes(ext)) {
        setUploadedFile(file);
      } else {
        setError('请上传有效的3D模型文件 (.skp, .obj, .stl, .cad, .dwg)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (!uploadedFile || !formData.roomName) {
        setError('请填写完整信息并上传模型文件');
        return;
      }

      const createResponse = await taskApi.createTask({
        roomId: `room-${Date.now()}`,
        roomName: formData.roomName,
        sourceParameters: formData.sourceParameters,
      });

      const newTaskId = createResponse.data.task.id;
      setTaskId(newTaskId);

      await uploadApi.uploadModel(uploadedFile, newTaskId);

      setEstimatedTime(45);
      setSuccess(true);

      setTimeout(() => {
        window.location.href = `/tasks/${newTaskId}`;
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (success && taskId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-12 text-center">
          <CheckCircle className="w-20 h-20 mx-auto mb-4 text-acoustic-success animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-4">任务创建成功！</h2>
          <p className="text-gray-400 mb-6">
            任务ID: <span className="font-mono text-acoustic-cyber">{taskId}</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">正在跳转到任务详情页...</p>
          <Loader2 className="w-6 h-6 text-acoustic-cyber animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">新建模拟任务</h1>
          <p className="text-gray-400 text-sm">上传房间几何模型并配置声源参数以启动声场模拟</p>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 border-l-4 border-l-acoustic-danger bg-acoustic-danger/10">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-acoustic-danger flex-shrink-0" />
            <p className="text-sm text-acoustic-danger">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-acoustic-danger hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all
                  ${currentStep >= step
                    ? 'bg-gradient-to-r from-acoustic-cyber to-acoustic-neon text-acoustic-deep shadow-glow-cyber'
                    : 'bg-acoustic-steel/20 text-gray-500'
                  }`}>
                  {currentStep > step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div className={`w-24 h-0.5 mx-2 ${currentStep > step ? 'bg-acoustic-cyber' : 'bg-acoustic-steel/20'}`}></div>
                )}
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-400 font-mono">
            步骤 {currentStep} / 3
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Upload className="w-6 h-6 mr-2 text-acoustic-cyber" />
              上传房间几何模型
            </h2>

            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300
                ${dragActive ? 'border-acoustic-cyber bg-acoustic-cyber/5' : 'border-acoustic-steel/40 hover:border-acoustic-cyber/50'}
                ${uploadedFile ? 'border-acoustic-success bg-acoustic-success/5' : ''}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".skp,.obj,.stl,.cad,.dwg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {!uploadedFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-acoustic-steel/20 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-acoustic-cyber" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white mb-1">
                      拖拽文件到此处或点击上传
                    </p>
                    <p className="text-sm text-gray-500">
                      支持 .SKP, .OBJ, .STL, .CAD, .DWG 格式，最大 100MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <CheckCircle className="w-16 h-16 mx-auto text-acoustic-success" />
                  <div>
                    <p className="font-medium text-acoustic-success">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · 已就绪
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    className="text-sm text-acoustic-danger hover:underline mt-2"
                  >
                    移除文件
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">房间名称</label>
                <input
                  type="text"
                  value={formData.roomName}
                  onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                  placeholder="例如：音乐厅A厅"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">房间用途</label>
                <select
                  value={formData.purposeCategory}
                  onChange={(e) => setFormData({ ...formData, purposeCategory: e.target.value as PurposeCategory })}
                  className="input-field"
                >
                  <option value="">选择房间类型...</option>
                  {purposeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">长度 (m)</label>
                <input
                  type="number"
                  value={formData.dimensions.length}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, length: e.target.value }
                  })}
                  placeholder="10.0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">宽度 (m)</label>
                <input
                  type="number"
                  value={formData.dimensions.width}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, width: e.target.value }
                  })}
                  placeholder="8.0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">高度 (m)</label>
                <input
                  type="number"
                  value={formData.dimensions.height}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, height: e.target.value }
                  })}
                  placeholder="3.5"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Zap className="w-6 h-6 mr-2 text-acoustic-warning" />
              配置声源参数
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    频率范围 (Hz)
                  </label>
                  <input
                    type="number"
                    value={formData.sourceParameters.frequencyHz}
                    onChange={(e) => setFormData({
                      ...formData,
                      sourceParameters: {
                        ...formData.sourceParameters,
                        frequencyHz: Number(e.target.value)
                      }
                    })}
                    min={20}
                    max={20000}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1 font-mono">范围: 20 Hz - 20 kHz</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    声功率级 (dB)
                  </label>
                  <input
                    type="number"
                    value={formData.sourceParameters.soundPowerLevelDb}
                    onChange={(e) => setFormData({
                      ...formData,
                      sourceParameters: {
                        ...formData.sourceParameters,
                        soundPowerLevelDb: Number(e.target.value)
                      }
                    })}
                    min={50}
                    max={120}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1 font-mono">范围: 50 - 120 dB</p>

                  {formData.sourceParameters.soundPowerLevelDb > 90 && (
                    <div className="mt-2 p-2 bg-acoustic-warning/10 border border-acoustic-warning/30 rounded flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-acoustic-warning mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-acoustic-warning">
                        高声功率级可能产生较高SPL值，请注意听力安全阈值(&lt;85 dBA)
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    声源类型
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['point', 'line', 'surface'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setFormData({
                          ...formData,
                          sourceParameters: { ...formData.sourceParameters, sourceType: type }
                        })}
                        className={`py-2 px-3 rounded border text-sm font-medium capitalize transition-all
                          ${formData.sourceParameters.sourceType === type
                            ? 'border-acoustic-cyber bg-acoustic-cyber/10 text-acoustic-cyber'
                            : 'border-acoustic-steel/40 text-gray-400 hover:border-acoustic-steel'
                          }`}
                      >
                        {type === 'point' ? '点声源' : type === 'line' ? '线声源' : '面声源'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 bg-acoustic-midnight/30">
                <h3 className="text-sm font-semibold text-white mb-4">声源位置坐标 (m)</h3>

                <div className="space-y-3">
                  {[
                    { label: 'X轴 (长度方向)', value: formData.sourceParameters.sourcePosition[0], index: 0 as const },
                    { label: 'Y轴 (高度方向)', value: formData.sourceParameters.sourcePosition[1], index: 1 as const },
                    { label: 'Z轴 (宽度方向)', value: formData.sourceParameters.sourcePosition[2], index: 2 as const },
                  ].map((axis) => (
                    <div key={axis.index}>
                      <label className="block block text-xs text-gray-400 mb-1">{axis.label}</label>
                      <input
                        type="number"
                        value={axis.value}
                        onChange={(e) => {
                          const newPos = [...formData.sourceParameters.sourcePosition];
                          newPos[axis.index] = Number(e.target.value);
                          setFormData({
                            ...formData,
                            sourceParameters: {
                              ...formData.sourceParameters,
                              sourcePosition: newPos as [number, number, number]
                            }
                          });
                        }}
                        step={0.1}
                        className="input-field text-sm py-2"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-acoustic-steel/30">
                  <p className="text-xs text-gray-500">
                    💡 提示：坐标原点位于房间左下角后墙角落
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">优先级</label>
              <div className="flex space-x-3">
                {(['low', 'normal', 'high'] as const).map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`px-4 py-2 rounded border text-sm font-medium transition-all
                      ${formData.priority === priority
                        ? priority === 'high'
                          ? 'border-acoustic-danger bg-acoustic-danger/10 text-acoustic-danger'
                          : priority === 'low'
                          ? 'border-gray-500 bg-gray-500/10 text-gray-400'
                          : 'border-acoustic-cyber bg-acoustic-cyber/10 text-acoustic-cyber'
                        : 'border-acoustic-steel/40 text-gray-400 hover:border-acoustic-steel'
                      }`}
                  >
                    {priority === 'high' ? '高优先级' : priority === 'low' ? '低优先级' : '普通'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">备注说明</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="添加特殊要求或注意事项..."
                rows={3}
                className="input-field resize-none"
              ></textarea>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-acoustic-success" />
              确认并提交任务
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="glass-card p-4 bg-acoustic-midnight/30">
                  <h3 className="text-sm font-semibold text-acoustic-cyber mb-3 uppercase tracking-wider">
                    房间信息
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">名称</dt>
                      <dd className="font-medium text-white">{formData.roomName || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">用途</dt>
                      <dd className="font-medium text-white">
                        {purposeOptions.find(o => o.value === formData.purposeCategory)?.label || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">尺寸</dt>
                      <dd className="font-mono text-white">
                        {formData.dimensions.length || '-'} × {formData.dimensions.width || '-'} × {formData.dimensions.height || '-'} m
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">模型文件</dt>
                      <dd className="font-medium text-acoustic-success">{uploadedFile?.name || '未选择'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="glass-card p-4 bg-acoustic-midnight/30">
                  <h3 className="text-sm font-semibold text-acoustic-warning mb-3 uppercase tracking-wider">
                    声源配置
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">频率</dt>
                      <dd className="data-value text-white">{formData.sourceParameters.frequencyHz} Hz</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">声功率级</dt>
                      <dd className={`data-value ${
                        formData.sourceParameters.soundPowerLevelDb > 90 ? 'text-acoustic-warning' : 'text-white'
                      }`}>
                        {formData.sourceParameters.soundPowerLevelDb} dB
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">类型</dt>
                      <dd className="text-white">
                        {formData.sourceParameters.sourceType === 'point' ? '点声源' :
                         formData.sourceParameters.sourceType === 'line' ? '线声源' : '面声源'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">位置</dt>
                      <dd className="data-value text-white">
                        ({formData.sourceParameters.sourcePosition.join(', ')})
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">优先级</dt>
                      <dd className={`font-medium ${
                        formData.priority === 'high' ? 'text-acoustic-danger' :
                        formData.priority === 'low' ? 'text-gray-400' : 'text-acoustic-cyber'
                      }`}>
                        {formData.priority === 'high' ? '高' : formData.priority === 'low' ? '低' : '普通'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="glass-card p-6 bg-gradient-to-br from-acoustic-cyber/5 to-acoustic-neon/5 border-acoustic-cyber/20">
                <h3 className="text-lg font-semibold text-white mb-4">预计计算时间</h3>

                <div className="space-y-4">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-bold data-value text-acoustic-cyber glow-text">
                      ~{estimatedTime || 45}
                    </span>
                    <span className="text-xl text-gray-400">分钟</span>
                  </div>

                  <p className="text-sm text-gray-400">
                    基于当前参数和中等复杂度模型的预估时间。实际时长可能因网格密度和服务器负载而异。
                  </p>

                  <div className="pt-4 border-t border-acoustic-steel/30 space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>几何校验</span>
                      <span className="font-mono text-gray-300">~5 分钟</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BEM计算</span>
                      <span className="font-mono text-gray-300">~35 分钟</span>
                    </div>
                    <div className="flex justify-between">
                      <span>结果可视化</span>
                      <span className="font-mono text-gray-300">~5 分钟</span>
                    </div>
                  </div>
                </div>

                {formData.notes && (
                  <div className="mt-4 pt-4 border-t border-acoustic-steel/30">
                    <p className="text-xs text-gray-500 mb-1">备注:</p>
                    <p className="text-sm text-gray-300">{formData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-acoustic-steel/30">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>上一步</span>
          </button>

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !uploadedFile}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>下一步</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>提交中...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>提交任务</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
