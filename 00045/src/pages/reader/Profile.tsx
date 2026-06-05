import { useState, useEffect } from 'react';
import { Card, Tabs, Table, Tag, Button, message, Modal, List, Badge, Empty } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useBorrowStore } from '@/store/borrowStore';
import { useReservationStore } from '@/store/reservationStore';
import { useMessageStore } from '@/store/messageStore';
import { formatDate, formatDateTime, getDaysUntilDue, isOverdue } from '@/utils/date';

const { confirm } = Modal;

const Profile = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { getUserBorrows, getUserFines, renewBook, payFine } = useBorrowStore();
  const { getUserReservations, cancelReservation } = useReservationStore();
  const { getUserMessages, markAsRead, markAllAsRead, deleteMessage } = useMessageStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'borrow');

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'borrow');
  }, [searchParams]);

  const borrowRecords = user ? getUserBorrows(user.id) : [];
  const reservations = user ? getUserReservations(user.id) : [];
  const fines = user ? getUserFines(user.id) : [];
  const messages = user ? getUserMessages(user.id) : [];

  const currentBorrows = borrowRecords.filter(
    (r) => r.status === 'borrowed' || r.status === 'overdue'
  );
  const historyBorrows = borrowRecords.filter((r) => r.status === 'returned');

  const handleRenew = (recordId: string, bookTitle: string) => {
    confirm({
      title: '确认续借',
      content: `您确定要续借《${bookTitle}》吗？续借后将延长15天。`,
      onOk: () => {
        const result = renewBook(recordId);
        if (result.success) {
          message.success('续借成功！');
        } else {
          message.error(result.reason || '续借失败');
        }
      },
    });
  };

  const handleCancelReservation = (reservationId: string, bookTitle: string) => {
    confirm({
      title: '确认取消预约',
      content: `您确定要取消《${bookTitle}》的预约吗？`,
      onOk: () => {
        cancelReservation(reservationId);
        message.success('已取消预约');
      },
    });
  };

  const handlePayFine = (fineId: string) => {
    confirm({
      title: '确认支付',
      content: '确定要支付这笔罚款吗？',
      onOk: () => {
        payFine(fineId);
        message.success('支付成功！');
      },
    });
  };

  const borrowColumns = [
    {
      title: '图书名称',
      dataIndex: ['book', 'title'],
      key: 'title',
    },
    {
      title: '借阅日期',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
      render: (date: string) => formatDate(date),
    },
    {
      title: '应还日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string, record: any) => {
        const overdue = isOverdue(date);
        const daysLeft = getDaysUntilDue(date);
        return (
          <span className={overdue ? 'text-red-500' : daysLeft <= 3 ? 'text-yellow-500' : ''}>
            {formatDate(date)}
            {overdue && ' (已逾期)'}
            {!overdue && daysLeft <= 3 && daysLeft >= 0 && ` (还剩${daysLeft}天)`}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        if (status === 'overdue') {
          return <Tag color="error">已逾期</Tag>;
        }
        if (record.renewed) {
          return <Tag color="blue">已续借</Tag>;
        }
        return <Tag color="success">借阅中</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          disabled={record.renewed || record.status === 'overdue'}
          onClick={() => handleRenew(record.id, record.book.title)}
        >
          续借
        </Button>
      ),
    },
  ];

  const historyColumns = [
    {
      title: '图书名称',
      dataIndex: ['book', 'title'],
      key: 'title',
    },
    {
      title: '借阅日期',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
      render: (date: string) => formatDate(date),
    },
    {
      title: '归还日期',
      dataIndex: 'returnDate',
      key: 'returnDate',
      render: (date: string) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: () => <Tag color="default">已归还</Tag>,
    },
  ];

  const reservationColumns = [
    {
      title: '图书名称',
      dataIndex: ['book', 'title'],
      key: 'title',
    },
    {
      title: '预约时间',
      dataIndex: 'reserveDate',
      key: 'reserveDate',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'blue', text: '等待中' },
          ready: { color: 'success', text: '可领取' },
          expired: { color: 'default', text: '已过期' },
          completed: { color: 'green', text: '已完成' },
        };
        const s = statusMap[status] || statusMap.pending;
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) =>
        record.status === 'pending' ? (
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleCancelReservation(record.id, record.book.title)}
          >
            取消预约
          </Button>
        ) : null,
    },
  ];

  const fineColumns = [
    {
      title: '图书名称',
      dataIndex: 'bookTitle',
      key: 'bookTitle',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (type === 'overdue' ? '逾期罚款' : '损坏赔偿'),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <span className="text-red-500 font-medium">¥{amount.toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) =>
        status === 'unpaid' ? (
          <Tag color="warning">待支付</Tag>
        ) : (
          <Tag color="success">已支付</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) =>
        record.status === 'unpaid' ? (
          <Button type="primary" size="small" onClick={() => handlePayFine(record.id)}>
            支付
          </Button>
        ) : null,
    },
  ];

  const tabItems = [
    {
      key: 'borrow',
      label: (
        <span>
          <ClockCircleOutlined className="mr-2" />
          借阅记录
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="当前借阅" size="small">
            <Table
              columns={borrowColumns}
              dataSource={currentBorrows}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: '暂无借阅记录' }}
            />
          </Card>
          <Card title="历史记录" size="small">
            <Table
              columns={historyColumns}
              dataSource={historyBorrows}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '暂无历史记录' }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'reservation',
      label: (
        <span>
          <CalendarOutlined className="mr-2" />
          预约记录
        </span>
      ),
      children: (
        <Table
          columns={reservationColumns}
          dataSource={reservations}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无预约记录' }}
        />
      ),
    },
    {
      key: 'fine',
      label: (
        <span>
          <ExclamationCircleOutlined className="mr-2" />
          罚款记录
        </span>
      ),
      children: (
        <Table
          columns={fineColumns}
          dataSource={fines}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无罚款记录' }}
        />
      ),
    },
    {
      key: 'messages',
      label: (
        <span>
          <BellOutlined className="mr-2" />
          消息中心
          {messages.filter((m) => !m.read).length > 0 && (
            <Badge
              count={messages.filter((m) => !m.read).length}
              size="small"
              className="ml-2"
            />
          )}
        </span>
      ),
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="small" onClick={() => user && markAllAsRead(user.id)}>
              <CheckOutlined /> 全部已读
            </Button>
          </div>
          {messages.length > 0 ? (
            <List
              dataSource={messages}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`cursor-pointer ${!item.read ? 'bg-blue-50' : ''}`}
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(item.id);
                      }}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={!item.read}>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <BellOutlined className="text-blue-500" />
                        </div>
                      </Badge>
                    }
                    title={
                      <div className="flex items-center">
                        <span className={!item.read ? 'font-medium' : ''}>{item.title}</span>
                        <Tag className="ml-2 text-xs">
                          {item.type === 'borrow' && '借阅'}
                          {item.type === 'renew' && '续借'}
                          {item.type === 'reserve' && '预约'}
                          {item.type === 'fine' && '罚款'}
                          {item.type === 'reminder' && '提醒'}
                          {item.type === 'system' && '系统'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <p>{item.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(item.createdAt)}</p>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无消息" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="ml-6">
            <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
            <p className="text-gray-500">
              {user?.role === 'student' ? '学生' : user?.role === 'teacher' ? '教师' : '管理员'}
              {' · '}
              {user?.department}
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-blue-600">{currentBorrows.length}</div>
            <div className="text-sm text-gray-500">当前借阅</div>
          </div>
        </div>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />
      </Card>
    </div>
  );
};

export default Profile;
