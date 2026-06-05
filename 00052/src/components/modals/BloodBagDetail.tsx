import React, { useState } from 'react';
import { Droplets, Calendar, MapPin, User, AlertCircle, Activity, FileText } from 'lucide-react';
import type { BloodBag } from '@/types';
import { BLOOD_TYPE_LABELS, COMPONENT_LABELS, STATUS_LABELS, BLOOD_TYPE_COLORS } from '@/types';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { TestReportChart } from './TestReportChart';
import { formatDate, getDaysDifference } from '@/utils/dateUtils';
import { getDaysOfSupply } from '@/utils/bloodTypeUtils';

interface BloodBagDetailProps {
  isOpen: boolean;
  onClose: () => void;
  bloodBag: BloodBag | null;
}

export const BloodBagDetail: React.FC<BloodBagDetailProps> = ({ isOpen, onClose, bloodBag }) => {
  const [activeTab, setActiveTab] = useState('info');

  if (!bloodBag) return null;

  const bloodTypeColor = BLOOD_TYPE_COLORS[bloodBag.bloodType];
  const daysToExpiry = getDaysDifference(new Date(), bloodBag.expiryDate);
  const isExpiringSoon = daysToExpiry <= 7;
  const isExpired = daysToExpiry <= 0;

  const getStatusBadge = () => {
    switch (bloodBag.status) {
      case 'available':
        return <Badge variant="success">{STATUS_LABELS[bloodBag.status]}</Badge>;
      case 'allocated':
        return <Badge variant="info" pulse>{STATUS_LABELS[bloodBag.status]}</Badge>;
      case 'used':
        return <Badge variant="default">{STATUS_LABELS[bloodBag.status]}</Badge>;
      case 'expired':
        return <Badge variant="danger" pulse>{STATUS_LABELS[bloodBag.status]}</Badge>;
      case 'quarantine':
        return <Badge variant="warning" pulse>{STATUS_LABELS[bloodBag.status]}</Badge>;
      default:
        return null;
    }
  };

  const infoTab = {
    id: 'info',
    label: '基本信息',
    icon: <FileText size={14} />,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Droplets size={12} /> 血型
            </p>
            <p className="text-lg font-bold" style={{ color: bloodTypeColor }}>
              {BLOOD_TYPE_LABELS[bloodBag.bloodType]}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Activity size={12} /> 成分
            </p>
            <p className="text-lg font-bold text-slate-200">
              {COMPONENT_LABELS[bloodBag.component]}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Droplets size={12} /> 容量
            </p>
            <p className="text-lg font-bold text-slate-200 font-mono">
              {bloodBag.volume} ml
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400">状态</p>
            <div>{getStatusBadge()}</div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> 采血日期
            </p>
            <p className="text-sm text-slate-200 font-mono">
              {formatDate(bloodBag.collectionDate)}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> 有效期至
            </p>
            <div className="flex items-center gap-2">
              <p className={cn(
                'text-sm font-mono',
                isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-slate-200'
              )}>
                {formatDate(bloodBag.expiryDate)}
              </p>
              {isExpiringSoon && !isExpired && (
                <Badge variant="warning" pulse>即将过期</Badge>
              )}
              {isExpired && (
                <Badge variant="danger" pulse>已过期</Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <User size={12} /> 捐赠者编号
            </p>
            <p className="text-sm text-slate-200 font-mono">{bloodBag.donorId}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin size={12} /> 存储位置
            </p>
            <p className="text-sm text-slate-200 font-mono">
              {bloodBag.storageLocation.row}排
              {bloodBag.storageLocation.col}列
              {bloodBag.storageLocation.shelf}层
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">血袋编号</p>
              <p className="text-sm font-mono text-slate-300">{bloodBag.id}</p>
            </div>
          </div>
        </div>
        
        {daysToExpiry > 0 && (
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-xs text-blue-400">
              距离有效期还有 <span className="font-bold text-blue-300">{daysToExpiry}</span> 天
            </p>
          </div>
        )}
      </div>
    )
  };

  const reportTab = {
    id: 'reports',
    label: '检测报告',
    icon: <Activity size={14} />,
    content: (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-300">近7天检测数据</h4>
          {bloodBag.testReports.length > 0 && (
            <Badge variant="success">
              {bloodBag.testReports[bloodBag.testReports.length - 1].infectiousDisease ? '不合格' : '检测合格'}
            </Badge>
          )}
        </div>
        <TestReportChart reports={bloodBag.testReports} />
      </div>
    )
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="血袋详情" size="lg">
      <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ backgroundColor: `${bloodTypeColor}15`, border: `1px solid ${bloodTypeColor}40` }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: bloodTypeColor }}>
          <Droplets size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ color: bloodTypeColor }}>
            {BLOOD_TYPE_LABELS[bloodBag.bloodType]}型 {COMPONENT_LABELS[bloodBag.component]}
          </h3>
          <p className="text-sm text-slate-400">{bloodBag.volume}ml · {getStatusBadge()}</p>
        </div>
      </div>
      
      <Tabs
        tabs={[infoTab, reportTab]}
        defaultTab={activeTab}
      />
    </Modal>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
