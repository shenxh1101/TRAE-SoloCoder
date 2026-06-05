import { useEffect, useState } from 'react';
import { Download, Eye, FileText, CheckCheck, Bell, RefreshCw } from 'lucide-react';
import { useStore, Message, MessageType } from '@/store';
import { cn } from '@/lib/utils';

const typeFilters: { key: MessageType | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'system', label: '系统通知' },
  { key: 'order', label: '订单通知' },
  { key: 'quality', label: '质检通知' },
  { key: 'warehouse', label: '仓储通知' },
  { key: 'approval', label: '审批通知' },
];

const typeBadgeClass: Record<string, string> = {
  system: 'bg-[var(--gray-100)] text-[var(--gray-500)]',
  report_ready: 'bg-[var(--purple-50)] text-purple-500',
  order: 'bg-[var(--blue-50)] text-[var(--blue-500)]',
  order_change: 'bg-[var(--blue-50)] text-[var(--blue-500)]',
  quality: 'bg-[var(--green-50)] text-[var(--green-500)]',
  quality_result: 'bg-[var(--green-50)] text-[var(--green-500)]',
  return_notice: 'bg-[var(--red-50)] text-[var(--red-500)]',
  warehouse: 'bg-amber-50 text-[var(--amber-500)]',
  approval: 'bg-[var(--yellow-50)] text-[var(--yellow-500)]',
  budget_alert: 'bg-[var(--red-50)] text-[var(--red-500)]',
};

const typeLabel: Record<string, string> = {
  system: '系统', report_ready: '报表', order: '订单', order_change: '订单',
  quality: '质检', quality_result: '质检', return_notice: '退货',
  warehouse: '仓储', approval: '审批', budget_alert: '预算预警',
};

export default function Messages() {
  const { messages, fetchMessages, markMessageRead, markAllMessagesRead, downloadAttachment, startPolling, stopPolling } = useStore();
  const [typeFilter, setTypeFilter] = useState<MessageType | ''>('');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    startPolling();
    return () => stopPolling();
  }, [fetchMessages, startPolling, stopPolling]);

  const filtered = messages.filter((m: Message) => !typeFilter || m.type === typeFilter);
  const unreadCount = messages.filter((m) => !m.read).length;

  const handleSelect = async (msg: Message) => {
    setSelectedMsg(msg);
    if (!msg.read) {
      await markMessageRead(msg.id);
    }
  };

  const handleDownload = async (msg: Message) => {
    setDownloading(msg.id);
    try {
      await downloadAttachment(msg.id);
    } catch {
      alert('下载失败，请重试');
    } finally {
      setDownloading(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markAllMessagesRead();
  };

  const handleRefresh = () => {
    fetchMessages();
  };

  const needsVoucher = (type: string): boolean => {
    return ['order_change', 'quality_result', 'return_notice', 'budget_alert', 'report_ready'].includes(type);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[var(--gray-700)]" />
          <h1 className="text-xl font-semibold text-[var(--gray-700)]">
            消息中心
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--red-500)] bg-[var(--red-50)] px-2 py-0.5 rounded-full">
                {unreadCount}条未读
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4" /> 全部已读
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                typeFilter === f.key ? 'bg-[var(--amber-500)] text-white' : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-[var(--gray-400)] flex items-center gap-1">
          <span className="w-2 h-2 bg-[var(--green-500)] rounded-full animate-pulse" />
          实时同步中（每10秒自动刷新）
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-2 card overflow-hidden">
          <div className="divide-y divide-[var(--gray-100)] max-h-[calc(100vh-320px)] overflow-y-auto">
            {filtered.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleSelect(msg)}
                className={cn(
                  'w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[var(--gray-50)] transition-colors relative',
                  selectedMsg?.id === msg.id && 'bg-amber-50/50 border-l-2 border-[var(--amber-500)]',
                  !msg.read && 'bg-[var(--blue-50)]/30'
                )}
              >
                <span className={cn(
                  'w-2 h-2 rounded-full mt-2 shrink-0',
                  msg.read ? 'bg-[var(--gray-300)]' : 'bg-[var(--amber-500)]'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('badge text-[10px]', typeBadgeClass[msg.type])}>{typeLabel[msg.type]}</span>
                    <span className="text-sm font-medium text-[var(--gray-700)] truncate">{msg.title}</span>
                  </div>
                  <div className="text-xs text-[var(--gray-400)] mt-1 truncate">{msg.content}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[var(--gray-300)]">
                      {new Date(msg.createdAt).toLocaleString('zh-CN')}
                    </span>
                    {needsVoucher(msg.type) && (
                      <span className="text-[10px] bg-[var(--gray-100)] text-[var(--gray-500)] px-1.5 py-0.5 rounded flex items-center gap-1">
                        <FileText className="w-3 h-3" /> 凭证
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[var(--gray-400)]">暂无消息</div>
            )}
          </div>
        </div>

        <div className="col-span-3 card p-6">
          {selectedMsg ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('badge', typeBadgeClass[selectedMsg.type])}>{typeLabel[selectedMsg.type]}</span>
                  <h2 className="text-lg font-semibold text-[var(--gray-700)]">{selectedMsg.title}</h2>
                </div>
                {!selectedMsg.read && (
                  <span className="text-xs text-[var(--red-500)] bg-[var(--red-50)] px-2 py-1 rounded">未读</span>
                )}
              </div>
              <div className="text-sm text-[var(--gray-400)]">
                {new Date(selectedMsg.createdAt).toLocaleString('zh-CN')}
              </div>
              <div className="text-sm text-[var(--gray-600)] leading-relaxed py-4 border-t border-b border-[var(--gray-100)] whitespace-pre-wrap">
                {selectedMsg.content}
              </div>

              {needsVoucher(selectedMsg.type) && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-[var(--gray-500)]">相关凭证</div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
                    <div className="w-12 h-12 rounded-lg bg-white border border-[var(--gray-200)] flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[var(--amber-500)]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--gray-700)]">业务凭证_{selectedMsg.id.slice(0, 8)}.txt</div>
                      <div className="text-xs text-[var(--gray-400)]">包含完整业务数据，具有法律效力</div>
                    </div>
                    <button
                      onClick={() => handleDownload(selectedMsg)}
                      disabled={downloading === selectedMsg.id}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      {downloading === selectedMsg.id ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> 生成中...</>
                      ) : (
                        <><Download className="w-4 h-4" /> 下载凭证</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedMsg.attachment && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-200)]">
                  <Eye className="w-5 h-5 text-[var(--gray-400)]" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{selectedMsg.attachment.name}</div>
                    <div className="text-xs text-[var(--gray-400)]">{selectedMsg.attachment.url}</div>
                  </div>
                  <a
                    href={selectedMsg.attachment.url}
                    download
                    className="btn-secondary flex items-center gap-1 text-sm py-1"
                  >
                    <Download className="w-4 h-4" /> 下载
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--gray-400)]">
              <Eye className="w-10 h-10 mb-2 text-[var(--gray-300)]" />
              <div>选择消息查看详情</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
