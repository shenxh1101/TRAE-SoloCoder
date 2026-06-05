import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Select, Button, Row, Col, Statistic, List, Divider, Typography, Space, message, Skeleton } from 'antd'
import ReactECharts from 'echarts-for-react'
import { DownloadOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Title } = Typography

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
const insuranceTypes = ['车险', '健康险', '意外险', '责任险', '财产险']
const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']

const cardShadow = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderRadius: 8,
}

const Report = () => {
  const [selectedMonth, setSelectedMonth] = useState('2026-05')
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState([])
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const res = await api.reports.getMonthly(selectedMonth)
        if (res && res.success && res.data) {
          setMonthlyData(res.data.items || res.data || [])
        } else {
          setMonthlyData([])
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error)
        setMonthlyData([])
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [selectedMonth])

  const kpiSummary = useMemo(() => {
    return {
      totalClaims: 50,
      payoutRate: 45.2,
      avgDays: 8.5,
      fraudRate: 3.2,
    }
  }, [])

  const payoutTrendOption = useMemo(() => {
    const series = insuranceTypes.map((insType, idx) => ({
      name: insType,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: months.map(() => 30 + Math.random() * 40),
      itemStyle: { color: colors[idx] },
      lineStyle: { width: 2 },
    }))
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let html = `<b>${params[0].name}</b><br/>`
          params.forEach((p) => {
            html += `${p.seriesName}：${p.value}%<br/>`
          })
          return html
        },
      },
      legend: {
        data: insuranceTypes,
        bottom: 0,
        textStyle: { color: '#666' },
      },
      grid: { top: 20, bottom: 40, left: 50, right: 20 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#666' },
      },
      yAxis: {
        type: 'value',
        name: '赔付率(%)',
      },
      series,
    }
  }, [])

  const processingDaysOption = useMemo(() => {
    return {
      tooltip: { trigger: 'axis' },
      grid: { top: 20, bottom: 10, left: 80, right: 40 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: insuranceTypes,
        axisLabel: { color: '#666' },
      },
      series: [
        {
          type: 'bar',
          data: insuranceTypes.map((_, idx) => ({
            value: 5 + Math.random() * 15,
            itemStyle: { color: colors[idx], borderRadius: [0, 4, 4, 0] },
          })),
        },
      ],
    }
  }, [])

  const fraudRateOption = useMemo(() => {
    return {
      tooltip: { trigger: 'axis' },
      grid: { top: 20, bottom: 10, left: 80, right: 40 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: insuranceTypes,
        axisLabel: { color: '#666' },
      },
      series: [
        {
          type: 'bar',
          data: insuranceTypes.map((_, idx) => ({
            value: 1 + Math.random() * 6,
            itemStyle: { color: colors[idx], borderRadius: [0, 4, 4, 0] },
          })),
        },
      ],
    }
  }, [])

  const allSuggestions = useMemo(() => {
    return [
      '整体赔付率处于合理区间，建议持续监控即可',
      '平均结案时长8.5天，处理效率良好',
      '疑似欺诈率3.2%，风险可控',
      '建议继续保持当前核赔标准',
    ]
  }, [])

  const columns = [
    {
      title: '险种',
      dataIndex: 'insuranceType',
      key: 'insuranceType',
      width: 100,
      render: (val) => <span style={{ fontWeight: 600 }}>{val || '-'}</span>,
    },
    {
      title: '理赔总量',
      dataIndex: 'totalClaims',
      key: 'totalClaims',
      width: 100,
      render: (val) => `${val || 10}件`,
    },
    {
      title: '赔付率',
      dataIndex: 'payoutRate',
      key: 'payoutRate',
      width: 100,
      render: (val) => `${val || 45}%`,
    },
    {
      title: '平均结案天数',
      dataIndex: 'avgProcessingDays',
      key: 'avgProcessingDays',
      width: 120,
      render: (val) => `${val || 8}天`,
    },
  ]

  const handleExport = () => {
    messageApi.success(`${selectedMonth} 月度效率报告已生成，正在下载...`)
  }

  return (
    <div style={{ padding: 0 }}>
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle" justify="space-between">
        <Col>
          <Space size="middle">
            <Title level={4} style={{ margin: 0 }}>月度效率报告</Title>
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: 140 }}
              options={months.map((m) => ({ label: m, value: m }))}
            />
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出报告
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' }}}>
            <Skeleton active loading={loading}>
              <Statistic
                title="理赔总量"
                value={kpiSummary.totalClaims}
                suffix="件"
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' }}}>
            <Skeleton active loading={loading}>
              <Statistic
                title="综合赔付率"
                value={kpiSummary.payoutRate}
                suffix="%"
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' }}}>
            <Skeleton active loading={loading}>
              <Statistic
                title="平均结案天数"
                value={kpiSummary.avgDays}
                suffix="天"
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' }}}>
            <Skeleton active loading={loading}>
              <Statistic
                title="疑似欺诈率"
                value={kpiSummary.fraudRate}
                suffix="%"
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card title="赔付率趋势" style={cardShadow}>
            <Skeleton active loading={loading}>
              <ReactECharts option={payoutTrendOption} style={{ height: 320 }} />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="结案时长分布" style={cardShadow}>
            <Skeleton active loading={loading}>
              <ReactECharts option={processingDaysOption} style={{ height: 300 }} />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="疑似欺诈率" style={cardShadow}>
            <Skeleton active loading={loading}>
              <ReactECharts option={fraudRateOption} style={{ height: 300 }} />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card title={`${selectedMonth} 月度明细`} style={cardShadow}>
            <Skeleton active loading={loading}>
              <Table
                columns={columns}
                dataSource={insuranceTypes.map((t, i) => ({
                  key: i, insuranceType: t
                }))}
                pagination={false}
                size="middle"
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="改进建议" style={cardShadow}>
            <Divider style={{ margin: '0 0 16px' }} />
            <Skeleton active loading={loading}>
              <List
                dataSource={allSuggestions}
                renderItem={(item, idx) => (
                  <List.Item style={{ padding: '8px 0', border: 'none' }}>
                    <span style={{ color: '#5470c6', fontWeight: 600, marginRight: 12 }}>{idx + 1}.</span>
                    <span style={{ color: '#333' }}>{item}</span>
                  </List.Item>
                )}
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Report
