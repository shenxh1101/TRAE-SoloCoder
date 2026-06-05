import { Card, Tag, Button } from 'antd';
import { BookOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Book } from '@/types';

interface BookCardProps {
  book: Book;
  showActions?: boolean;
}

const BookCard = ({ book, showActions = true }: BookCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = () => {
    if (book.availableCopies > 0) return 'success';
    return 'warning';
  };

  const getStatusText = () => {
    if (book.availableCopies > 0) return `可借 ${book.availableCopies} 本`;
    return '已借出';
  };

  return (
    <Card
      hoverable
      className="h-full transition-all duration-300 hover:shadow-lg"
      cover={
        <div className="h-48 overflow-hidden bg-gray-100">
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      }
      actions={
        showActions
          ? [
              <Button
                key="view"
                type="text"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/reader/book/${book.id}`)}
              >
                查看详情
              </Button>,
            ]
          : undefined
      }
    >
      <Card.Meta
        title={
          <div className="flex items-start justify-between">
            <span className="font-medium truncate max-w-[180px]" title={book.title}>
              {book.title}
            </span>
            <Tag color={getStatusColor()} className="ml-2 flex-shrink-0">
              {getStatusText()}
            </Tag>
          </div>
        }
        description={
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <div className="flex items-center">
              <BookOutlined className="mr-2" />
              <span className="truncate" title={book.author}>
                {book.author}
              </span>
            </div>
            <div className="truncate" title={book.publisher}>
              {book.publisher}
            </div>
            <div className="text-xs text-gray-400">
              {book.category} · 借阅 {book.borrowCount} 次
            </div>
          </div>
        }
      />
    </Card>
  );
};

export default BookCard;
