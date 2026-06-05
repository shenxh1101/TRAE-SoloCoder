import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  Radio,
  message,
  Tag,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useBookStore } from '@/store/bookStore';
import { useBorrowStore } from '@/store/borrowStore';
import { useReservationStore } from '@/store/reservationStore';
import { useMessageStore } from '@/store/messageStore';
import { mockUsers } from '@/utils/mock';
import { formatDate, isOverdue, getOverdueDays } from '@/utils/date';
import { getDamageDescription } from '@/utils/rules';
import type { User, Book, BorrowRecord, DamageLevel } from '@/types';

const { Search } = Input;
const { TextArea } = Input;

const BorrowManagement = () => {
  const { books, getBookById, updateAvailableCopies } = useBookStore();
  const { getAllBorrows, borrowBook, returnBook, checkEligibility } = useBorrowStore();
  const { notifyReserversOnReturn } = useReservationStore();
  const { sendMessage } = useMessageStore();

  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedBorrowRecord, setSelectedBorrowRecord] = useState<BorrowRecord | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [borrowForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [eligibilityCheck, setEligibilityCheck] = useState<{ eligible: boolean; reason?: string } | null>(null);

  const readers = mockUsers.filter((u) => u.role !== 'admin');
  const borrowRecords = getAllBorrows();
  const activeBorrows = borrowRecords.filter((r) => r.status !== 'returned');

  const handleBorrowModal = () => {
    borrowForm.resetFields();
    setEligibilityCheck(null);
    setBorrowModalOpen(true);
  };

  const handleUserChange = (userId: string) => {
    const result = checkEligibility(userId);
    setEligibilityCheck(result);
  };

  const handleBorrowSubmit = () => {
    borrowForm.validateFields().then((values) => {
      const user = readers.find((u) => u.id === values.userId) as User;
      const book = getBookById(values.bookId) as Book;

      if (book.availableCopies <= 0) {
        message.error('该书暂无库存');
        return;
      }

      const result = borrowBook(values.userId, values.bookId, user, book);
      if (result.success) {
        updateAvailableCopies(values.bookId, -1);
        sendMessage(
          values.userId,
          '借阅成功提醒',
          `您已成功借阅《${book.title}》，请按时归还。`,
          'borrow'
        );
        message.success('借阅成功');
        setBorrowModalOpen(false);
        borrowForm.resetFields();
      } else {
        message.error(result.reason || '借阅失败');
      }
    });
  };

  const handleReturn = (record: BorrowRecord) => {
    setSelectedBorrowRecord(record);
    returnForm.resetFields();
    setReturnModalOpen(true);
  };

  const handleReturnSubmit = () => {
    returnForm.validateFields().then((values) => {
      if (!selectedBorrowRecord) return;

      const result = returnBook(selectedBorrowRecord.id, values.damageLevel);
      if (result.success) {
        updateAvailableCopies(selectedBorrowRecord.bookId, 1);

        const reservation = notifyReserversOnReturn(selectedBorrowRecord.bookId);
        if (reservation) {
          sendMessage(
            reservation.userId,
            '预约图书可领取',
            `您预约的《${selectedBorrowRecord.book.title}》已归还，请在24小时内到馆领取。`,
            'reserve'
          );
        }

        sendMessage(
          selectedBorrowRecord.userId,
          '还书成功提醒',
          `您已归还《${selectedBorrowRecord.book.title}》${result.fineAmount && result.fineAmount > 0 ? `，产生罚款 ¥${result.fineAmount.toFixed(2)}` : ''}。`,
          'system'
        );

        if (result.fineAmount && result.fineAmount > 0) {
          message.success(`还书成功，产生罚款 ¥${result.fineAmount.toFixed(2)}`);
        } else {
          message.success('还书成功');
        }
        setReturnModalOpen(false);
        setSelectedBorrowRecord(null);
      }
    });
  };

  const columns = [
    {
      title: '图书名称',
      dataIndex: ['book', 'title'],
      key: 'title',
      ellipsis: true,
    },
    {
      title: '读者',
      key: 'user',
      render: (_: any, record: BorrowRecord) => record.user?.name || '-',
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
      render: (date: string) => {
        const overdue = isOverdue(date);
        return (
          <span className={overdue ? 'text-red-500' : ''}>
            {formatDate(date)}
            {overdue && ` (逾期${getOverdueDays(date)}天)`}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'overdue') {
          return <Tag color="error">已逾期</Tag>;
        }
        return <Tag color="blue">借阅中</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: BorrowRecord) => (
        <Button type="primary" size="small" onClick={() => handleReturn(record)}>
          还书
        </Button>
      ),
    },
  ];

  const availableBooks = books.filter((b) => b.availableCopies > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">借还管理</h1>
        <Space>
          <Search
            placeholder="搜索图书或读者"
            style={{ width: 300 }}
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </Space>
      </div>

      <Card
        tabList={[
          { key: 'borrow', label: <span><ArrowDownOutlined className="mr-1" />借书</span> },
          { key: 'return', label: <span><ArrowUpOutlined className="mr-1" />还书</span> },
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as 'borrow' | 'return')}
      >
        {activeTab === 'borrow' && (
          <div>
            <div className="mb-4">
              <Button type="primary" icon={<ArrowDownOutlined />} onClick={handleBorrowModal}>
                办理借书
              </Button>
            </div>
            <Table
              columns={columns}
              dataSource={activeBorrows}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {activeTab === 'return' && (
          <Table
            columns={columns}
            dataSource={activeBorrows}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* 借书弹窗 */}
      <Modal
        title="办理借书"
        open={borrowModalOpen}
        onOk={handleBorrowSubmit}
        onCancel={() => setBorrowModalOpen(false)}
        width={600}
        okText="确认借书"
      >
        <Form form={borrowForm} layout="vertical">
          <Form.Item
            name="userId"
            label="选择读者"
            rules={[{ required: true, message: '请选择读者' }]}
          >
            <Select
              placeholder="请选择读者"
              showSearch
              optionFilterProp="children"
              onChange={handleUserChange}
              options={readers.map((u) => ({
                label: `${u.name} (${u.role === 'student' ? '学生' : '教师'})`,
                value: u.id,
              }))}
            />
          </Form.Item>

          {eligibilityCheck && !eligibilityCheck.eligible && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center text-red-600">
                <ExclamationCircleOutlined className="mr-2" />
                {eligibilityCheck.reason}
              </div>
            </div>
          )}

          <Form.Item
            name="bookId"
            label="选择图书"
            rules={[{ required: true, message: '请选择图书' }]}
          >
            <Select
              placeholder="请选择图书"
              showSearch
              optionFilterProp="children"
              disabled={!eligibilityCheck?.eligible && eligibilityCheck !== null}
              options={availableBooks.map((b) => ({
                label: `${b.title} - ${b.author} (可借${b.availableCopies}本)`,
                value: b.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 还书弹窗 */}
      <Modal
        title="办理还书"
        open={returnModalOpen}
        onOk={handleReturnSubmit}
        onCancel={() => setReturnModalOpen(false)}
        width={600}
        okText="确认还书"
      >
        {selectedBorrowRecord && (
          <div className="space-y-4">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="图书名称">
                {selectedBorrowRecord.book.title}
              </Descriptions.Item>
              <Descriptions.Item label="读者">
                {selectedBorrowRecord.user?.name}
              </Descriptions.Item>
              <Descriptions.Item label="借阅日期">
                {formatDate(selectedBorrowRecord.borrowDate)}
              </Descriptions.Item>
              <Descriptions.Item label="应还日期">
                {formatDate(selectedBorrowRecord.dueDate)}
              </Descriptions.Item>
              {isOverdue(selectedBorrowRecord.dueDate) && (
                <Descriptions.Item label="逾期天数" className="text-red-500">
                  {getOverdueDays(selectedBorrowRecord.dueDate)} 天
                </Descriptions.Item>
              )}
            </Descriptions>

            <Form form={returnForm} layout="vertical">
              <Form.Item
                name="damageLevel"
                label="损坏程度"
                rules={[{ required: true, message: '请选择损坏程度' }]}
                initialValue="none"
              >
                <Radio.Group>
                  <Radio value="none">无损坏</Radio>
                  <Radio value="minor">轻微损坏 (赔偿书价30%)</Radio>
                  <Radio value="moderate">中度损坏 (赔偿书价60%)</Radio>
                  <Radio value="severe">严重损坏 (全额赔偿)</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BorrowManagement;
