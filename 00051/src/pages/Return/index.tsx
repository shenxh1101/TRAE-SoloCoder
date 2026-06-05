import { useState, useEffect, useRef } from 'react';
import { Car, Camera, Wrench, CheckCircle, X, Upload } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { uploadApi } from '@/services/api';
import { formatDateTime, formatDuration } from '@/utils/date';
import { Application } from '@/types';

const Return = () => {
  const { user } = useAuthStore();
  const { vehicles } = useVehicleStore();
  const {
    applications,
    loading,
    fetchApplications,
    returnVehicle,
    createMaintenance,
  } = useApplicationStore();

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    actualMileage: 0,
    fuelLevel: 100,
    inspectionPhotos: [] as string[],
    hasDamage: false,
    damageDescription: '',
  });
  const [maintenanceDescription, setMaintenanceDescription] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const myActiveApplications = applications.filter(
    (app) =>
      app.userId === user?.id &&
      ['approved', 'in_progress'].includes(app.status)
  );

  const handleSelectApplication = (app: Application) => {
    setSelectedApp(app);
    const vehicle = vehicles.find((v) => v.id === app.vehicleId);
    setFormData({
      actualMileage: vehicle?.currentMileage || 0,
      fuelLevel: vehicle?.fuelLevel || 100,
      inspectionPhotos: [],
      hasDamage: false,
      damageDescription: '',
    });
    setShowModal(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadApi.uploadPhoto(file));
      const results = await Promise.all(uploadPromises);
      const photoUrls = results.map((r: any) => r.url);
      setFormData(prev => ({
        ...prev,
        inspectionPhotos: [...prev.inspectionPhotos, ...photoUrls],
      }));
    } catch (error) {
      console.error('上传照片失败:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inspectionPhotos: prev.inspectionPhotos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!selectedApp) return;

    const success = await returnVehicle({
      applicationId: selectedApp.id,
      actualMileage: formData.actualMileage,
      fuelLevel: formData.fuelLevel,
      inspectionPhotos: formData.inspectionPhotos,
      hasDamage: formData.hasDamage,
      damageDescription: formData.damageDescription || undefined,
    });

    if (success) {
      if (formData.hasDamage) {
        setShowMaintenanceModal(true);
      } else {
        setShowModal(false);
        setSelectedApp(null);
      }
    }
  };

  const handleCreateMaintenance = async () => {
    if (!selectedApp || !maintenanceDescription.trim()) return;

    await createMaintenance({
      vehicleId: selectedApp.vehicleId,
      applicationId: selectedApp.id,
      description: maintenanceDescription,
      estimatedCost: 500,
    });

    setShowMaintenanceModal(false);
    setShowModal(false);
    setSelectedApp(null);
    setMaintenanceDescription('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">还车管理</h1>
        <p className="text-slate-500 text-sm mt-1">登记还车信息，如有损坏可发起维修申请</p>
      </div>

      {myActiveApplications.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
            <p className="text-slate-600 font-medium">暂无待还车辆</p>
            <p className="text-slate-400 text-sm mt-1">您当前没有正在使用的车辆</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myActiveApplications.map((app) => (
            <Card key={app.id} hover>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>{app.vehiclePlate}</Card.Title>
                  <StatusBadge status={app.status} />
                </div>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Car className="text-slate-400" size={18} />
                    <span className="text-slate-600">{app.vehicleModel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-slate-400" size={18} />
                    <span className="text-slate-600">{app.purpose}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                      用车时长：{formatDuration(app.startTime, app.endTime)}
                    </p>
                    <p className="text-sm text-slate-500">
                      应还时间：{formatDateTime(app.endTime)}
                    </p>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button className="w-full" onClick={() => handleSelectApplication(app)}>
                  登记还车
                </Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="还车登记"
        size="lg"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800">
                {selectedApp.vehiclePlate} - {selectedApp.vehicleModel}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                事由：{selectedApp.purpose}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="实际里程(km)"
                type="number"
                min="0"
                value={formData.actualMileage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actualMileage: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
              <Input
                label="剩余油量(%)"
                type="number"
                min="0"
                max="100"
                value={formData.fuelLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fuelLevel: Math.min(
                      100,
                      Math.max(0, parseInt(e.target.value) || 0)
                    ),
                  })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                验车照片
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-sm text-slate-500">
                  {uploading ? '上传中...' : '点击上传验车照片'}
                </p>
                <p className="text-xs text-slate-400 mt-1">支持JPG、PNG格式，单文件最大5MB</p>
              </div>
              {formData.inspectionPhotos.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {formData.inspectionPhotos.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`http://localhost:3001${url}`}
                        alt={`验车照片 ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasDamage"
                checked={formData.hasDamage}
                onChange={(e) =>
                  setFormData({ ...formData, hasDamage: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="hasDamage" className="text-sm font-medium text-slate-700">
                车辆有损坏
              </label>
            </div>

            {formData.hasDamage && (
              <Textarea
                label="损坏描述"
                value={formData.damageDescription}
                onChange={(e) =>
                  setFormData({ ...formData, damageDescription: e.target.value })
                }
                placeholder="请详细描述车辆损坏情况..."
                rows={3}
                required
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} loading={loading}>
                确认还车
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title="发起维修申请"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Wrench className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-red-800">车辆损坏维修</p>
                <p className="text-sm text-red-600 mt-1">
                  {selectedApp?.vehiclePlate} - {selectedApp?.vehicleModel}
                </p>
              </div>
            </div>
          </div>

          <Textarea
            label="维修说明"
            value={maintenanceDescription || formData.damageDescription}
            onChange={(e) => setMaintenanceDescription(e.target.value)}
            placeholder="请详细描述维修内容..."
            rows={4}
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>
              跳过
            </Button>
            <Button
              variant="danger"
              onClick={handleCreateMaintenance}
              loading={loading}
              disabled={!maintenanceDescription.trim()}
            >
              提交维修申请
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Return;
