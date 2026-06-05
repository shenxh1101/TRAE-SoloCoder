import { useState, useEffect } from 'react';
import { Plus, Edit, Search, Ban, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useVehicleStore } from '@/store/vehicleStore';
import { useAuthStore } from '@/store/authStore';
import { Vehicle, VehicleStatus } from '@/types';
import { formatDate } from '@/utils/date';
import { Navigate } from 'react-router-dom';

const Vehicles = () => {
  const { user } = useAuthStore();
  const { vehicles, loading, fetchVehicles, addVehicle, updateVehicle, toggleVehicleStatus } =
    useVehicleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    seats: 5,
    status: 'idle' as VehicleStatus,
    currentMileage: 0,
    fuelLevel: 100,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingVehicle) {
      await updateVehicle(editingVehicle.id, formData);
    } else {
      await addVehicle(formData);
    }

    setShowModal(false);
    setEditingVehicle(null);
    resetForm();
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plateNumber: vehicle.plateNumber,
      model: vehicle.model,
      seats: vehicle.seats,
      status: vehicle.status,
      currentMileage: vehicle.currentMileage,
      fuelLevel: vehicle.fuelLevel,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      plateNumber: '',
      model: '',
      seats: 5,
      status: 'idle',
      currentMileage: 0,
      fuelLevel: 100,
    });
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    resetForm();
    setShowModal(true);
  };

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">车辆管理</h1>
          <p className="text-slate-500 text-sm mt-1">管理企业车辆信息</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="mr-2" size={18} />
          添加车辆
        </Button>
      </div>

      <Card>
        <Card.Body className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="搜索车牌号或车型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Cell header>车牌号</Table.Cell>
                <Table.Cell header>车型</Table.Cell>
                <Table.Cell header>座位数</Table.Cell>
                <Table.Cell header>当前里程</Table.Cell>
                <Table.Cell header>油量</Table.Cell>
                <Table.Cell header>状态</Table.Cell>
                <Table.Cell header>录入时间</Table.Cell>
                <Table.Cell header className="text-right">操作</Table.Cell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredVehicles.map((vehicle) => (
                <Table.Row key={vehicle.id}>
                  <Table.Cell className="font-medium">{vehicle.plateNumber}</Table.Cell>
                  <Table.Cell>{vehicle.model}</Table.Cell>
                  <Table.Cell>{vehicle.seats}座</Table.Cell>
                  <Table.Cell>{vehicle.currentMileage.toLocaleString()} km</Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            vehicle.fuelLevel > 50
                              ? 'bg-emerald-500'
                              : vehicle.fuelLevel > 20
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${vehicle.fuelLevel}%` }}
                        />
                      </div>
                      <span className="text-xs">{vehicle.fuelLevel}%</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={vehicle.status} />
                  </Table.Cell>
                  <Table.Cell>{formatDate(vehicle.createdAt)}</Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant={vehicle.status === 'disabled' ? 'success' : 'danger'}
                        size="sm"
                        onClick={() => toggleVehicleStatus(vehicle.id)}
                      >
                        {vehicle.status === 'disabled' ? (
                          <Check size={16} />
                        ) : (
                          <Ban size={16} />
                        )}
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
              {filteredVehicles.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={8} className="text-center py-8 text-slate-400">
                    暂无车辆数据
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </Card.Body>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingVehicle ? '编辑车辆' : '添加车辆'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="车牌号"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={(e) =>
                setFormData({ ...formData, plateNumber: e.target.value })
              }
              placeholder="请输入车牌号"
              required
            />
            <Input
              label="车型"
              name="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="请输入车型"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="座位数"
              name="seats"
              type="number"
              min="1"
              max="50"
              value={formData.seats}
              onChange={(e) =>
                setFormData({ ...formData, seats: parseInt(e.target.value) || 5 })
              }
              required
            />
            <Select
              label="状态"
              name="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as VehicleStatus,
                })
              }
              options={[
                { label: '空闲', value: 'idle' },
                { label: '使用中', value: 'in_use' },
                { label: '维修中', value: 'maintenance' },
                { label: '已禁用', value: 'disabled' },
              ]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="当前里程(km)"
              name="currentMileage"
              type="number"
              min="0"
              value={formData.currentMileage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentMileage: parseFloat(e.target.value) || 0,
                })
              }
              required
            />
            <Input
              label="油量(%)"
              name="fuelLevel"
              type="number"
              min="0"
              max="100"
              value={formData.fuelLevel}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fuelLevel: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              取消
            </Button>
            <Button type="submit" loading={loading}>
              {editingVehicle ? '保存修改' : '添加车辆'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vehicles;
