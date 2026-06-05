import { useState, useEffect } from 'react';
import { Car, CheckCircle, Info, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import CalendarComponent from '@/components/charts/Calendar';
import { useVehicleStore } from '@/store/vehicleStore';
import { useApplicationStore } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { combineDateAndTime, formatDuration } from '@/utils/date';
import { useNavigate } from 'react-router-dom';
import { Vehicle, CalendarEvent } from '@/types';
import { useDashboardStore } from '@/store/dashboardStore';

const Application = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { vehicles, fetchVehicles, getAvailableVehicles } = useVehicleStore();
  const { createApplication, loading, fetchApplications } = useApplicationStore();
  const { calendarEvents, getCalendarEvents } = useDashboardStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    purpose: '',
    peopleCount: 1,
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '18:00',
    vehicleId: '',
  });

  const [availableVehicles, setAvailableVehicles] = useState<
    { vehicle: Vehicle; matchScore: number }[]
  >([]);

  useEffect(() => {
    fetchVehicles();
    fetchApplications();
    getCalendarEvents();
  }, []);

  useEffect(() => {
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const startTime = combineDateAndTime(
        new Date(formData.startDate),
        formData.startTime
      );
      const endTime = combineDateAndTime(new Date(formData.endDate), formData.endTime);

      if (startTime < endTime && formData.peopleCount > 0) {
        getAvailableVehicles(startTime, endTime, formData.peopleCount).then(available => {
          setAvailableVehicles(available);
        });
      }
    }
  }, [formData.startDate, formData.startTime, formData.endDate, formData.endTime, formData.peopleCount, vehicles]);

  const handleSubmit = async () => {
    if (!user || !formData.vehicleId) return;

    const vehicle = vehicles.find((v) => v.id === formData.vehicleId);
    if (!vehicle) return;

    const startTime = combineDateAndTime(
      new Date(formData.startDate),
      formData.startTime
    );
    const endTime = combineDateAndTime(new Date(formData.endDate), formData.endTime);

    const success = await createApplication({
      userId: user.id,
      userName: user.name,
      userDepartment: user.department,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plateNumber,
      vehicleModel: vehicle.model,
      purpose: formData.purpose,
      peopleCount: formData.peopleCount,
      startTime,
      endTime,
      approvalLevel: 'department',
    });

    if (success) {
      navigate('/history');
    }
  };

  const canProceedToStep2 = () => {
    return (
      formData.purpose.trim() !== '' &&
      formData.peopleCount >= 1 &&
      formData.startDate &&
      formData.startTime &&
      formData.endDate &&
      formData.endTime
    );
  };

  const resolvedCalendarEvents = (calendarEvents || []).map((e: any) => ({
    ...e,
    type: e.type as 'booking' | 'maintenance',
    start: new Date(e.start),
    end: new Date(e.end),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">用车申请</h1>
        <p className="text-slate-500 text-sm mt-1">填写用车信息，系统将为您推荐合适的车辆</p>
      </div>

      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > s ? <CheckCircle size={20} /> : s}
            </div>
            {s < 2 && (
              <div
                className={`w-20 h-1 mx-2 transition-all duration-300 ${
                  step > s ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>{step === 1 ? '填写用车信息' : '选择车辆'}</Card.Title>
            </Card.Header>
            <Card.Body>
              {step === 1 ? (
                <div className="space-y-4">
                  <Textarea
                    label="用车事由"
                    name="purpose"
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData({ ...formData, purpose: e.target.value })
                    }
                    placeholder="请详细描述用车事由..."
                    rows={3}
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="乘车人数"
                      name="peopleCount"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.peopleCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          peopleCount: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="出发日期"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      required
                    />
                    <Select
                      label="出发时间"
                      name="startTime"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      options={Array.from({ length: 25 }, (_, i) => ({
                        label: `${i.toString().padStart(2, '0')}:00`,
                        value: `${i.toString().padStart(2, '0')}:00`,
                      }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="预计返回日期"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      required
                    />
                    <Select
                      label="预计返回时间"
                      name="endTime"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      options={Array.from({ length: 25 }, (_, i) => ({
                        label: `${i.toString().padStart(2, '0')}:00`,
                        value: `${i.toString().padStart(2, '0')}:00`,
                      }))}
                      required
                    />
                  </div>

                  {availableVehicles.length > 0 && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle size={18} />
                        <span className="font-medium">
                          检测到 {availableVehicles.length} 辆可用车辆
                        </span>
                      </div>
                    </div>
                  )}

                  {availableVehicles.length === 0 && formData.purpose && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle size={18} />
                        <span className="font-medium">
                          当前时段暂无可用车辆，请调整用车时间
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep(2)} disabled={!canProceedToStep2()}>
                      下一步：选择车辆
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex items-start gap-3">
                      <Info className="text-blue-600 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium text-blue-800">用车信息</p>
                        <p className="text-sm text-blue-600 mt-1">
                          事由：{formData.purpose}
                        </p>
                        <p className="text-sm text-blue-600">
                          人数：{formData.peopleCount}人 · 时长：
                          {formatDuration(
                            combineDateAndTime(
                              new Date(formData.startDate),
                              formData.startTime
                            ),
                            combineDateAndTime(
                              new Date(formData.endDate),
                              formData.endTime
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableVehicles.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Car size={48} className="mx-auto mb-3 opacity-50" />
                        <p>当前时段暂无可用车辆</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setStep(1)}
                        >
                          返回修改
                        </Button>
                      </div>
                    ) : (
                      availableVehicles.map(({ vehicle, matchScore }) => (
                        <div
                          key={vehicle.id}
                          onClick={() =>
                            setFormData({ ...formData, vehicleId: vehicle.id })
                          }
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            formData.vehicleId === vehicle.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-100 rounded-xl">
                                <Car className="text-slate-600" size={24} />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {vehicle.plateNumber}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {vehicle.model} · {vehicle.seats}座
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400 mb-1">
                                匹配度
                              </div>
                              <div className="text-lg font-bold text-blue-600">
                                {matchScore}%
                              </div>
                            </div>
                          </div>
                          {matchScore === 100 && (
                            <div className="mt-2 text-xs text-emerald-600 font-medium">
                              ✓ 座位数完全匹配
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      上一步
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.vehicleId}
                      loading={loading}
                    >
                      提交申请
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <Card.Title>车辆占用日历</Card.Title>
            </Card.Header>
            <Card.Body className="p-0">
              <CalendarComponent events={resolvedCalendarEvents} />
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Application;
