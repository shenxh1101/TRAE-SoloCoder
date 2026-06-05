import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  Eye,
  X,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  PenTool,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatCurrency } from '../../utils/pricing';
import { cn, downloadFile, generateVoucherHtml, formatDate, formatDateTime, getStatusText, getStatusClass } from '../../utils/helpers';
import type { Contract } from '../../types';

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '待签署', value: 'pending' },
  { label: '已签署', value: 'signed' },
  { label: '已拒绝', value: 'rejected' },
];

export default function Contracts() {
  const { currentUser } = useAuthStore();
  const { contracts, getBookingsByExhibitor, signContract } = useBoothStore();
  const { pushBookingNotification } = useNotificationStore();

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const bookings = currentUser ? getBookingsByExhibitor(currentUser.id) : [];

  const filteredContracts = contracts.filter((contract) => {
    const booking = bookings.find((b) => b.id === contract.bookingId);
    if (!booking) return false;

    if (activeFilter === 'all') return true;
    return contract.status === activeFilter;
  });

  const getBookingInfo = (bookingId: string) => {
    return bookings.find((b) => b.id === bookingId);
  };

  const handleSign = (contract: Contract) => {
    setSigningContract(contract);
    setShowSignModal(true);
  };

  const confirmSign = () => {
    if (!signingContract || !currentUser) return;

    signContract(signingContract.id);

    pushBookingNotification(
      currentUser.id,
      signingContract.bookingId,
      '合同签署成功',
      `您已成功签署合同，展位预订正式生效。`
    );

    setShowSignModal(false);
    setSigningContract(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDownload = (contract: Contract) => {
    const booking = getBookingInfo(contract.bookingId);
    const voucherContent = generateVoucherHtml({
      '合同编号': contract.id,
      '展位信息': booking ? `${booking.hallName} ${booking.boothCode}` : '-',
      '合同金额': formatCurrency(contract.amount),
      '签署状态': getStatusText(contract.status),
      '创建时间': formatDateTime(contract.createdAt),
      '签署时间': contract.signedAt ? formatDateTime(contract.signedAt) : '-',
      '合同内容': contract.content.substring(0, 200) + '...',
    });

    downloadFile(voucherContent, `合同_${contract.id}.html`, 'text/html');
  };

  const pendingCount = contracts.filter((c) => {
    const booking = bookings.find((b) => b.id === c.bookingId);
    return booking && c.status === 'pending';
  }).length;

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="合同管理"
        subtitle="管理您的展位租赁合同和相关协议"
        icon={<FileText className="w-7 h-7" />}
      />

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-2 glass-card-hover inline-flex"
        >
          {filterTabs.map((tab, index) => (
            <motion.button
              key={tab.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveFilter(tab.value)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'px-6 py-2 rounded-xl font-medium transition-all duration-300 relative',
                activeFilter === tab.value
                  ? 'bg-primary-500 text-white'
                  : 'text-dark-300 hover:text-white'
              )}
            >
              {tab.label}
              {tab.value === 'pending' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </motion.button>
          ))}
        </motion.div>

        <div className="space-y-4">
          {filteredContracts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <FileText className="w-16 h-16 mx-auto mb-4 text-dark-500" />
              <h3 className="text-xl font-semibold text-white mb-2">暂无合同</h3>
              <p className="text-dark-400">当前筛选条件下没有找到合同记录</p>
            </motion.div>
          ) : (
            filteredContracts.map((contract, index) => {
              const booking = getBookingInfo(contract.bookingId);
              const isPending = contract.status === 'pending';

              return (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'glass-card p-6 glass-card-hover transition-all duration-300',
                    isPending && 'border-warning-500/30 bg-warning-500/5'
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center',
                        isPending
                          ? 'bg-warning-500/20'
                          : contract.status === 'signed'
                          ? 'bg-success-500/20'
                          : 'bg-danger-500/20'
                      )}>
                        <FileText className={cn(
                          'w-7 h-7',
                          isPending
                            ? 'text-warning-400'
                            : contract.status === 'signed'
                            ? 'text-success-400'
                            : 'text-danger-400'
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-white">
                            展位租赁合同
                          </h4>
                          <span className={cn('status-badge', getStatusClass(contract.status))}>
                            {getStatusText(contract.status)}
                          </span>
                          {isPending && (
                            <span className="flex items-center gap-1 text-warning-400 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              待签署
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-400" />
                            <div>
                              <p className="text-dark-400">展位</p>
                              <p className="text-white">{booking?.boothCode || '-'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary-400" />
                            <div>
                              <p className="text-dark-400">展期</p>
                              <p className="text-white">
                                {booking ? `${formatDate(booking.startDate)}` : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-primary-400" />
                            <div>
                              <p className="text-dark-400">金额</p>
                              <p className="text-white font-semibold">{formatCurrency(contract.amount)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-400" />
                            <div>
                              <p className="text-dark-400">创建时间</p>
                              <p className="text-white">{formatDate(contract.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        查看详情
                      </button>
                      {isPending && (
                        <button
                          onClick={() => handleSign(contract)}
                          className="btn-success flex items-center gap-2"
                        >
                          <PenTool className="w-4 h-4" />
                          签署合同
                        </button>
                      )}
                      {contract.status === 'signed' && (
                        <button
                          onClick={() => handleDownload(contract)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          下载凭证
                        </button>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-warning-500/20"
                    >
                      <div className="flex items-center gap-2 text-warning-400">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">请在 72 小时内完成签署，逾期合同将自动失效</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedContract && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedContract(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">合同详情</h3>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-dark-400 text-sm mb-1">合同编号</p>
                      <p className="text-white font-mono">{selectedContract.id}</p>
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm mb-1">状态</p>
                      <span className={cn('status-badge', getStatusClass(selectedContract.status))}>
                        {getStatusText(selectedContract.status)}
                      </span>
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm mb-1">金额</p>
                      <p className="text-xl font-bold gradient-text">{formatCurrency(selectedContract.amount)}</p>
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm mb-1">签署时间</p>
                      <p className="text-white">{selectedContract.signedAt ? formatDateTime(selectedContract.signedAt) : '-'}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-dark-400 text-sm mb-3">合同内容</p>
                    <div className="p-4 bg-white/5 rounded-xl whitespace-pre-line text-dark-200 text-sm leading-relaxed">
                      {selectedContract.content}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedContract(null)}
                  className="btn-secondary"
                >
                  关闭
                </button>
                {selectedContract.status === 'signed' && (
                  <button
                    onClick={() => handleDownload(selectedContract)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载凭证
                  </button>
                )}
                {selectedContract.status === 'pending' && (
                  <button
                    onClick={() => {
                      setSelectedContract(null);
                      handleSign(selectedContract);
                    }}
                    className="btn-success flex items-center gap-2"
                  >
                    <PenTool className="w-4 h-4" />
                    签署合同
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignModal && signingContract && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">签署确认</h3>
                <button
                  onClick={() => setShowSignModal(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-warning-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-warning-400" />
                  </div>
                  <h4 className="text-center text-xl font-semibold text-white mb-2">
                    确认签署合同？
                  </h4>
                  <p className="text-center text-dark-400 text-sm">
                    签署后合同将正式生效，具有法律效力。请确认您已阅读并同意合同内容。
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-dark-400">合同编号</span>
                    <span className="text-white font-mono text-sm">{signingContract.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">金额</span>
                    <span className="text-white font-semibold">{formatCurrency(signingContract.amount)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-primary-500/10 rounded-xl border border-primary-500/30">
                  <PenTool className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-primary-400 font-medium text-sm">电子签名说明</p>
                    <p className="text-dark-300 text-xs mt-1">
                      点击"确认签署"即视为您同意本合同条款，并使用您的账户信息进行电子签名，该签名与手写签名具有同等法律效力。
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSignModal(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmSign}
                  className="btn-success flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  确认签署
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-card p-6 flex items-center gap-4 border border-success-500/30 bg-success-500/10"
          >
            <div className="w-12 h-12 bg-success-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">合同签署成功</h4>
              <p className="text-sm text-dark-300">您的合同已成功签署，展位预订正式生效</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
