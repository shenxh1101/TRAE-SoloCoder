import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  Upload,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ImportOutlined,
  ExportOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useBookStore } from '@/store/bookStore';
import { importBooksFromExcel, exportBooksToExcel } from '@/utils/excel';
import { BOOK_CATEGORIES, BOOK_LOCATIONS } from '@/utils/rules';
import type { Book } from '@/types';

const { Search } = Input;

const BookManagement = () => {
  const { books, addBook, updateBook, deleteBook, importBooks } = useBookStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [form] = Form.useForm();

  const filteredBooks = books.filter(
    (book) =>
      !searchKeyword ||
      book.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      book.author.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      book.isbn.includes(searchKeyword)
  );

  const handleAdd = () => {
    setEditingBook(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    form.setFieldsValue(book);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteBook(id);
    message.success('删除成功');
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingBook) {
        updateBook(editingBook.id, values);
        message.success('更新成功');
      } else {
        addBook({ ...values, availableCopies: values.totalCopies });
        message.success('添加成功');
      }
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const importedBooks = await importBooksFromExcel(file);
        importBooks(importedBooks);
        message.success(`成功导入 ${importedBooks.length} 本图书`);
      } catch (error) {
        message.error('导入失败，请检查文件格式');
      }
      return false;
    },
  };

  const handleExport = () => {
    exportBooksToExcel(books);
    message.success('导出成功');
  };

  const columns = [
    {
      title: '封面',
      dataIndex: 'cover',
      key: 'cover',
      width: 80,
      render: (cover: string) => (
        <img src={cover} alt="" className="w-12 h-16 object-cover rounded" />
      ),
    },
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'ISBN',
      dataIndex: 'isbn',
      key: 'isbn',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '馆藏位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '馆藏/可借',
      key: 'copies',
      render: (_: any, record: Book) => (
        <span>
          {record.totalCopies} / {record.availableCopies}
        </span>
      ),
    },
    {
      title: '借阅次数',
      dataIndex: 'borrowCount',
      key: 'borrowCount',
      sorter: (a: Book, b: Book) => a.borrowCount - b.borrowCount,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Book) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这本图书吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">图书管理</h1>
        <Space>
          <Search
            placeholder="搜索书名、作者或ISBN"
            style={{ width: 300 }}
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </Space>
      </div>

      <Card>
        <div className="flex justify-between mb-4">
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增图书
            </Button>
            <Upload {...uploadProps}>
              <Button icon={<ImportOutlined />}>
                <UploadOutlined /> Excel导入
              </Button>
            </Upload>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              Excel导出
            </Button>
          </Space>
          <span className="text-gray-500">共 {filteredBooks.length} 本图书</span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredBooks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingBook ? '编辑图书' : '新增图书'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="书名"
            rules={[{ required: true, message: '请输入书名' }]}
          >
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="author"
              label="作者"
              rules={[{ required: true, message: '请输入作者' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="isbn"
              label="ISBN"
              rules={[{ required: true, message: '请输入ISBN' }]}
            >
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="publisher"
              label="出版社"
              rules={[{ required: true, message: '请输入出版社' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="publishDate"
              label="出版日期"
              rules={[{ required: true, message: '请输入出版日期' }]}
            >
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="category"
              label="分类"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select options={BOOK_CATEGORIES.map((c) => ({ label: c, value: c }))} />
            </Form.Item>
            <Form.Item
              name="location"
              label="馆藏位置"
              rules={[{ required: true, message: '请选择馆藏位置' }]}
            >
              <Select options={BOOK_LOCATIONS.map((l) => ({ label: l, value: l }))} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="totalCopies"
              label="馆藏数量"
              rules={[{ required: true, message: '请输入馆藏数量' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="price"
              label="价格"
              rules={[{ required: true, message: '请输入价格' }]}
            >
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookManagement;
