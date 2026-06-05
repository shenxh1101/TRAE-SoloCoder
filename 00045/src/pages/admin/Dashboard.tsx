import { Row, Col, Card, Statistic } from 'antd';
import {
  BookOutlined,
  ShoppingCartOutlined,
  WarningOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useBookStore } from '@/store/bookStore';
import { useBorrowStore } from '@/store/borrowStore';
import { useStatisticsStore } from '@/store/statisticsStore';
import { mockUsers } from '@/utils/mock';

const Dashboard = () => {
  const { books } = useBookStore();
  const { getAllBorrows, getAllFines } = useBorrowStore();
  const { getTodayStats } = useStatisticsStore();

  const borrowRecords = getAllBorrows();
  const fines = getAllFines();
  const stats = getTodayStats(borrowRecords, fines, books);

  const availableBooks = books.filter((b) => b.availableCopies > 0).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">数据概览</h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="今日借阅"
              value={stats.todayBorrows}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#165DFF' }}
              suffix={
                <span className="text-sm text-gray-500 font-normal">
                  <ArrowUpOutlined className="text-green-500 text-xs" /> 较昨日
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="图书总量"
              value={stats.totalBooks}
              prefix={<BookOutlined className="text-green-500" />}
              valueStyle={{ color: '#00B42A' }}
              suffix={<span className="text-sm text-gray-500 font-normal">可借 {availableBooks}</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="在借图书"
              value={stats.totalBorrowed}
              prefix={<ArrowDownOutlined className="text-orange-500" />}
              valueStyle={{ color: '#FFAA00' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title="逾期数量"
              value={stats.overdueCount}
              prefix={<WarningOutlined className="text-red-500" />}
              valueStyle={{ color: '#F53F3F' }}
              suffix={<span className="text-sm text-gray-500 font-normal">本</span>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="借阅用户统计" className="shadow-sm">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="学生读者"
                  value={mockUsers.filter((u) => u.role === 'student').length}
                  valueStyle={{ fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="教师读者"
                  value={mockUsers.filter((u) => u.role === 'teacher').length}
                  valueStyle={{ fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="罚款统计" className="shadow-sm">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="待缴罚款"
                  prefix={<DollarOutlined />}
                  value={stats.totalFines}
                  precision={2}
                  valueStyle={{ color: '#F53F3F', fontSize: '20px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="罚款单数量"
                  value={fines.filter((f) => f.status === 'unpaid').length}
                  valueStyle={{ fontSize: '20px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card title="快捷操作" className="shadow-sm">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Card
              hoverable
              className="text-center cursor-pointer bg-blue-50 border-blue-200"
              onClick={() => (window.location.hash = '#/admin/borrow')}
            >
              <ShoppingCartOutlined className="text-3xl text-blue-500 mb-2" />
              <p className="text-sm text-gray-700">借还管理</p>
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card
              hoverable
              className="text-center cursor-pointer bg-green-50 border-green-200"
              onClick={() => (window.location.hash = '#/admin/books')}
            >
              <BookOutlined className="text-3xl text-green-500 mb-2" />
              <p className="text-sm text-gray-700">图书管理</p>
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card
              hoverable
              className="text-center cursor-pointer bg-orange-50 border-orange-200"
              onClick={() => (window.location.hash = '#/admin/statistics')}
            >
              <WarningOutlined className="text-3xl text-orange-500 mb-2" />
              <p className="text-sm text-gray-700">统计报表</p>
            </Card>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Card
              hoverable
              className="text-center cursor-pointer bg-purple-50 border-purple-200"
              onClick={() => (window.location.hash = '#/admin/books')}
            >
              <DollarOutlined className="text-3xl text-purple-500 mb-2" />
              <p className="text-sm text-gray-700">批量导入</p>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;
