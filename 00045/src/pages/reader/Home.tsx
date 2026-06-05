import { useState } from 'react';
import { Row, Col, Input, Card, List, Tag, Alert, Button } from 'antd';
import { SearchOutlined, BellOutlined, FireOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import BookCard from '@/components/common/BookCard';
import { useBookStore } from '@/store/bookStore';
import { useBorrowStore } from '@/store/borrowStore';
import { useAuthStore } from '@/store/authStore';
import { isExpiringSoon, isOverdue, getDaysUntilDue } from '@/utils/date';
import { BOOK_CATEGORIES } from '@/utils/rules';
import type { Book } from '@/types';

const { Search } = Input;

const ReaderHome = () => {
  const navigate = useNavigate();
  const { books, searchBooks } = useBookStore();
  const { getUserBorrows } = useBorrowStore();
  const { user } = useAuthStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const userBorrows = user ? getUserBorrows(user.id) : [];
  const expiringBooks = userBorrows.filter(
    (r) => r.status === 'borrowed' && isExpiringSoon(r.dueDate) && !isOverdue(r.dueDate)
  );
  const overdueBooks = userBorrows.filter((r) => r.status === 'overdue');

  const popularBooks: Book[] = [...books]
    .sort((a, b) => b.borrowCount - a.borrowCount)
    .slice(0, 6);

  const handleSearch = (value: string) => {
    if (value.trim()) {
      navigate(`/reader/search?keyword=${encodeURIComponent(value)}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    navigate(`/reader/search?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="space-y-8">
      {/* 搜索区域 */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-none">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-white mb-4">欢迎来到高校图书馆</h1>
          <p className="text-blue-100 mb-8">探索知识的海洋，开启智慧之旅</p>
          <Search
            placeholder="搜索书名、作者或ISBN..."
            size="large"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="max-w-2xl mx-auto"
            style={{ height: '52px' }}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {BOOK_CATEGORIES.slice(0, 8).map((category) => (
              <Tag
                key={category}
                className="cursor-pointer px-4 py-1 text-sm bg-white bg-opacity-20 text-white border-none hover:bg-opacity-30 transition-all"
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </Tag>
            ))}
          </div>
        </div>
      </Card>

      {/* 借阅提醒 */}
      {(expiringBooks.length > 0 || overdueBooks.length > 0) && (
        <div className="space-y-4">
          {overdueBooks.length > 0 && (
            <Alert
              message="逾期提醒"
              description={
                <List
                  dataSource={overdueBooks}
                  renderItem={(item) => (
                    <List.Item>
                      <span className="text-red-600 font-medium">
                        《{item.book.title}》已逾期，请尽快归还
                      </span>
                    </List.Item>
                  )}
                />
              }
              type="error"
              showIcon
              icon={<BellOutlined />}
              action={
                <Button type="primary" size="small" onClick={() => navigate('/reader/profile?tab=borrow')}>
                  查看详情
                </Button>
              }
            />
          )}
          {expiringBooks.length > 0 && (
            <Alert
              message="还书提醒"
              description={
                <List
                  dataSource={expiringBooks}
                  renderItem={(item) => (
                    <List.Item>
                      <span className="text-yellow-600">
                        《{item.book.title}》将在 {getDaysUntilDue(item.dueDate)} 天后到期
                      </span>
                    </List.Item>
                  )}
                />
              }
              type="warning"
              showIcon
              icon={<BellOutlined />}
              action={
                <Button type="primary" size="small" onClick={() => navigate('/reader/profile?tab=borrow')}>
                  办理续借
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* 热门图书 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FireOutlined className="text-orange-500 mr-2" />
            热门图书排行
          </h2>
          <Button type="link" onClick={() => navigate('/reader/search')}>
            查看更多
          </Button>
        </div>
        <Row gutter={[16, 16]}>
          {popularBooks.map((book) => (
            <Col key={book.id} xs={24} sm={12} md={8} lg={6} xl={4}>
              <BookCard book={book} />
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default ReaderHome;
