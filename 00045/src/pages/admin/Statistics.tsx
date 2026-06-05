import { Card, Row, Col, Button, Table, Tag } from 'antd';
import { DownloadOutlined, TrophyOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useBookStore } from '@/store/bookStore';
import { useBorrowStore } from '@/store/borrowStore';
import { useStatisticsStore } from '@/store/statisticsStore';
import { mockUsers } from '@/utils/mock';
import { exportMonthlyStatsToExcel } from '@/utils/excel';
import { formatDate } from '@/utils/date';

const Statistics = () => {
  const { books } = useBookStore();
  const { getAllBorrows, getAllFines } = useBorrowStore();
  const { generateMonthlyReport, getPopularBooks, getReaderTypeStats, getOverdueRate, getDailyBorrows } = useStatisticsStore();

  const borrowRecords = getAllBorrows();
  const fines = getAllFines();

  const monthlyStats = generateMonthlyReport(borrowRecords, books, fines, mockUsers);
  const popularBooks = getPopularBooks(books, 10);
  const readerTypeStats = getReaderTypeStats(borrowRecords, mockUsers);
  const overdueRate = getOverdueRate(borrowRecords);
  const dailyBorrows = getDailyBorrows(borrowRecords, 7);

  const handleExport = () => {
    exportMonthlyStatsToExcel(monthlyStats);
  };

  const trendChartOption = {
    title: {
      text: '近7日借阅趋势',
      left: 'center',
      textStyle: { fontSize: 16 },
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: dailyBorrows.map((d) => formatDate(d.date, 'MM-DD')),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: dailyBorrows.map((d) => d.count),
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 93, 255, 0.5)' },
              { offset: 1, color: 'rgba(22, 93, 255, 0.05)' },
            ],
          },
        },
        lineStyle: {
          color: '#165DFF',
          width: 3,
        },
        itemStyle: {
          color: '#165DFF',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  };

  const readerTypeChartOption = {
    title: {
      text: '读者类型借阅分布',
      left: 'center',
      textStyle: { fontSize: 16 },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        data: readerTypeStats.map((item, index) => ({
          value: item.count,
          name: item.type,
          itemStyle: {
            color: index === 0 ? '#165DFF' : '#00B42A',
          },
        })),
      },
    ],
  };

  const categoryChartOption = {
    title: {
      text: '分类借阅排行',
      left: 'center',
      textStyle: { fontSize: 16 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
    },
    yAxis: {
      type: 'category',
      data: popularBooks.slice(0, 5).map((b) => b.title),
    },
    series: [
      {
        type: 'bar',
        data: popularBooks.slice(0, 5).map((b, index) => ({
          value: b.count,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: '#165DFF' },
                { offset: 1, color: '#69B1FF' },
              ],
            },
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: '60%',
      },
    ],
  };

  const popularBookColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_: any, __: any, index: number) => {
        if (index === 0) return <TrophyOutlined className="text-yellow-500 text-xl" />;
        if (index === 1) return <TrophyOutlined className="text-gray-400 text-xl" />;
        if (index === 2) return <TrophyOutlined className="text-orange-400 text-xl" />;
        return index + 1;
      },
    },
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '借阅次数',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">统计报表</h1>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出报表
        </Button>
      </div>

      {/* 概览卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <TrophyOutlined className="text-blue-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">本月借阅量</p>
                <p className="text-2xl font-bold text-gray-800">{monthlyStats.totalBorrows}</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <TeamOutlined className="text-green-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">读者人数</p>
                <p className="text-2xl font-bold text-gray-800">
                  {mockUsers.filter((u) => u.role !== 'admin').length}
                </p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <WarningOutlined className="text-red-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">逾期率</p>
                <p className="text-2xl font-bold text-gray-800">{(overdueRate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <DownloadOutlined className="text-orange-500 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">本月罚款</p>
                <p className="text-2xl font-bold text-gray-800">¥{monthlyStats.totalFines.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="shadow-sm h-full">
            <ReactECharts option={trendChartOption} style={{ height: '350px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="shadow-sm h-full">
            <ReactECharts option={readerTypeChartOption} style={{ height: '350px' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card className="shadow-sm h-full">
            <ReactECharts option={categoryChartOption} style={{ height: '350px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="热门图书排行 TOP10" className="shadow-sm">
            <Table
              columns={popularBookColumns}
              dataSource={popularBooks}
              rowKey="bookId"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Statistics;
