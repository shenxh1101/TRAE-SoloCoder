import { useState } from 'react';
import { Card, Row, Col, Descriptions, Tag, Button, message, Modal } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  BarcodeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '@/store/bookStore';
import { useBorrowStore } from '@/store/borrowStore';
import { useReservationStore } from '@/store/reservationStore';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/date';

const { confirm } = Modal;

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBookById, updateAvailableCopies, updateBook } = useBookStore();
  const { borrowBook, checkEligibility } = useBorrowStore();
  const { reserveBook } = useReservationStore();
  const { sendMessage } = useMessageStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const book = id ? getBookById(id) : undefined;

  if (!book) {
    return (
      <Card className="text-center py-20">
        <p className="text-gray-500">图书不存在</p>
        <Button type="primary" className="mt-4" onClick={() => navigate('/reader')}>
          返回首页
        </Button>
      </Card>
    );
  }

  const canBorrow = book.availableCopies > 0;
  const hasReservation = book.availableCopies === 0 && book.totalCopies > 0;

  const handleBorrow = () => {
    if (!user) return;

    confirm({
      title: '确认借阅',
      content: `您确定要借阅《${book.title}》吗？`,
      onOk: async () => {
        setLoading(true);
        
        const eligibility = checkEligibility(user.id);
        if (!eligibility.eligible) {
          message.error(eligibility.reason || '借阅资格检查失败');
          setLoading(false);
          return;
        }

        const result = borrowBook(user.id, book.id, user, book);
        if (result.success) {
          updateAvailableCopies(book.id, -1);
          updateBook(book.id, { borrowCount: book.borrowCount + 1 });
          sendMessage(
            user.id,
            '借阅成功提醒',
            `您已成功借阅《${book.title}》，请按时归还。`,
            'borrow'
          );
          message.success('借阅成功！');
        } else {
          message.error(result.reason || '借阅失败');
        }
        setLoading(false);
      },
    });
  };

  const handleReserve = () => {
    if (!user) return;

    confirm({
      title: '确认预约',
      content: `您确定要预约《${book.title}》吗？图书归还后系统将自动通知您。`,
      onOk: () => {
        setLoading(true);
        const result = reserveBook(user.id, book.id, user, book);
        if (result.success) {
          sendMessage(
            user.id,
            '预约成功提醒',
            `您已成功预约《${book.title}》，图书归还后我们将通知您。`,
            'reserve'
          );
          message.success('预约成功！');
        } else {
          message.error(result.reason || '预约失败');
        }
        setLoading(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <Button type="link" onClick={() => navigate(-1)} className="mb-4">
        ← 返回
      </Button>

      <Card>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <div className="sticky top-24">
              <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-6 space-y-3">
                {canBorrow ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    loading={loading}
                    onClick={handleBorrow}
                  >
                    立即借阅
                  </Button>
                ) : hasReservation ? (
                  <Button
                    type="primary"
                    size="large"
                    block
                    loading={loading}
                    onClick={handleReserve}
                  >
                    预约图书
                  </Button>
                ) : (
                  <Button type="primary" size="large" block disabled>
                    暂无馆藏
                  </Button>
                )}
                <div className="flex justify-center gap-4 text-sm">
                  <Tag color={canBorrow ? 'success' : 'warning'}>
                    {canBorrow ? `可借 ${book.availableCopies} 本` : '已借出'}
                  </Tag>
                  <Tag>馆藏 {book.totalCopies} 本</Tag>
                </div>
              </div>
            </div>
          </Col>

          <Col xs={24} md={16}>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{book.title}</h1>
            <p className="text-gray-500 mb-6">{book.category}</p>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item
                label={
                  <span className="flex items-center">
                    <UserOutlined className="mr-2" />
                    作者
                  </span>
                }
              >
                {book.author}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span className="flex items-center">
                    <ShopOutlined className="mr-2" />
                    出版社
                  </span>
                }
              >
                {book.publisher}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span className="flex items-center">
                    <CalendarOutlined className="mr-2" />
                    出版日期
                  </span>
                }
              >
                {formatDate(book.publishDate)}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span className="flex items-center">
                    <BarcodeOutlined className="mr-2" />
                    ISBN
                  </span>
                }
              >
                {book.isbn}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span className="flex items-center">
                    <EnvironmentOutlined className="mr-2" />
                    馆藏位置
                  </span>
                }
              >
                {book.location}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <span className="flex items-center">
                    <BookOutlined className="mr-2" />
                    借阅次数
                  </span>
                }
              >
                {book.borrowCount} 次
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">图书简介</h3>
              <p className="text-gray-600 leading-relaxed">{book.description}</p>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BookDetail;
