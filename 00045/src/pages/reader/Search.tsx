import { useState, useEffect } from 'react';
import { Row, Col, Input, Select, Empty, Spin, Pagination } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import BookCard from '@/components/common/BookCard';
import { useBookStore } from '@/store/bookStore';
import { BOOK_CATEGORIES } from '@/utils/rules';
import type { Book } from '@/types';

const { Search } = Input;

const ReaderSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { books, loading, fetchBooks } = useBookStore();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    setKeyword(searchParams.get('keyword') || '');
    setCategory(searchParams.get('category') || '');
    setPage(1);
  }, [searchParams]);

  const filteredBooks: Book[] = books.filter((book) => {
    const matchKeyword =
      !keyword ||
      book.title.toLowerCase().includes(keyword.toLowerCase()) ||
      book.author.toLowerCase().includes(keyword.toLowerCase()) ||
      book.isbn.includes(keyword);
    const matchCategory = !category || book.category === category;
    return matchKeyword && matchCategory;
  });

  const paginatedBooks = filteredBooks.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (value: string) => {
    const params: Record<string, string> = {};
    if (value) params.keyword = value;
    if (category) params.category = category;
    setSearchParams(params);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const params: Record<string, string> = {};
    if (keyword) params.keyword = keyword;
    if (value) params.category = value;
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Search
          placeholder="搜索书名、作者或ISBN..."
          size="large"
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1"
        />
        <Select
          placeholder="选择分类"
          size="large"
          allowClear
          value={category || undefined}
          onChange={handleCategoryChange}
          className="w-full sm:w-48"
          options={BOOK_CATEGORIES.map((c) => ({ label: c, value: c }))}
        />
      </div>

      {/* 搜索结果 */}
      <div>
        <p className="text-gray-500 mb-4">
          共找到 <span className="text-blue-600 font-medium">{filteredBooks.length}</span> 本图书
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : paginatedBooks.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {paginatedBooks.map((book) => (
                <Col key={book.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <BookCard book={book} />
                </Col>
              ))}
            </Row>
            {filteredBooks.length > pageSize && (
              <div className="flex justify-center mt-8">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={filteredBooks.length}
                  onChange={setPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        ) : (
          <Empty
            description="没有找到相关图书"
            className="py-20"
          />
        )}
      </div>
    </div>
  );
};

export default ReaderSearch;
