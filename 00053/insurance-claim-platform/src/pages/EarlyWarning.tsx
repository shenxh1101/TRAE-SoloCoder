import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Tag, Row, Col, Statistic, Button, Select, Space, Modal, message, Badge, Skeleton } from 'antd'
import ReactECharts from 'echarts-for-react'
import {
  AlertOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  SolutionOutlined,
  PushpinOutlined,
  SendOutlined,
} from '@ant-design/icons'
import api from '../services/api'
import type { EarlyWarning } from '../types'

const cardShadow: React.CSSProperties = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderRadius: 8,
}

const statusConfig: Record<EarlyWarning['status'], { color: string; label: string }> = {
  active: { color: 'red', label: '活跃' },
  acknowledged: { color: 'orange', label: '已确认' },
  resolved: { color: 'green', label: '已解决' },
}

const levelConfig: Record<EarlyWarning['level'], { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'blue', label: '低' },
}

function generateTrendData(branch: string) {
  const days = 14
  const dates: string[] = []
  const actual: number[] = []
  const threshold: number[] = []
  let seed = 0
  for (let i = 0; i < branch.length; i++) seed += branch.charCodeAt(i)
  const base = 3 + (seed % 5)
  const thresh = base * 2
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
    seed = (seed * 9301 + 49297) % 233280
    const spike = (seed / 233280) > 0.6 ? (seed / 233280) * thresh * 0.8 : 0
    seed = (seed * 9301 + 49297) % 233280
    actual.push(parseFloat((base + (seed / 233280) * base + spike).toFixed(1)))
    threshold.push(parseFloat(thresh.toFixed(1)))
  }
  return { dates, actual, threshold }
}

const EarlyWarningPage: React.FC = () => {
  const [data, setData] = useState<EarlyWarning[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined)
  const [selectedBranch, setSelectedBranch] = useState<string>('')

  const fetchWarnings = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (statusFilter) params.status = statusFilter
      if (levelFilter) params.level = levelFilter
      const result = await api.warnings.getList(params)
      setData(result || [])
      if (result && result.length > 0 && !selectedBranch) {
        setSelectedBranch(result[0].branch)
      }
    } catch (error) {
      console.error('Failed to fetch warnings:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWarnings()
  }, [statusFilter, levelFilter])

  const filteredData = useMemo(() => {
    return data
  }, [data])

  const summaryStats = useMemo(() => {
    const active = data.filter((w) => w.status === 'active').length
    const high = data.filter((w) => w.level === 'high').length
    const acknowledged = data.filter((w) => w.status === 'acknowledged').length
    const resolved = data.filter((w) => w.status === 'resolved').length
    return { active, high, acknowledged, resolved }
  }, [data])

  const branchOptions = useMemo(() => {
    const branches = [...new Set(data.map((w) => w.branch))]
    return branches.map((b) => ({ label: b, value: b }))
  }, [data])

  const trendOption = useMemo(() => {
    const trend = generateTrendData(selectedBranch || '默认支公司')
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['异常数量', '阈值线'],
        textStyle: { color: '#666' },
      },
      grid: { top: 40, bottom: 30, left: 50, right: 30 },
      xAxis: {
        type: 'category',
        data: trend.dates,
        axisLabel: { color: '#999' },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#999' },
        name: '异常数量',
        nameTextStyle: { color: '#666' },
      },
      series: [
        {
          name: '异常数量',
          type: 'line',
          data: trend.actual,
          smooth: true,
          itemStyle: { color: '#5470c6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(84,112,198,0.3)' },
                { offset: 1, color: 'rgba(84,112,198,0.02)' },
              ],
            },
          },
        },
        {
          name: '阈值线',
          type: 'line',
          data: trend.threshold,
          lineStyle: { color: '#ee6666', type: 'dashed', width: 2 },
          itemStyle: { color: '#ee6666' },
          symbol: 'none',
        },
      ],
    }
  }, [selectedBranch])

  const handleAcknowledge = (record: EarlyWarning) => {
    Modal.confirm({
      title: '确认预警',
      icon: <ExclamationCircleOutlined />,
      content: `确认预警 ${record.id}（${record.branch} - ${record.insuranceType}）？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.warnings.acknowledge(record.id)
          setData((prev) =>
            prev.map((w) =>
              w.id === record.id ? { ...w, status: 'acknowledged' as const } : w
            )
          )
          message.success(`预警 ${record.id} 已确认`)
        } catch (error) {
          message.error('确认失败，请重试')
        }
      },
    })
  }

  const handleResolve = (record: EarlyWarning) => {
    Modal.confirm({
      title: '解决预警',
      icon: <CheckCircleOutlined />,
      content: `将预警 ${record.id}（${record.branch} - ${record.insuranceType}）标记为已解决？`,
      okText: '解决',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.warnings.resolve(record.id)
          setData((prev) =>
            prev.map((w) =>
              w.id === record.id ? { ...w, status: 'resolved' as const } : w
            )
          )
          message.success(`预警 ${record.id} 已解决`)
        } catch (error) {
          message.error('操作失败，请重试')
        }
      },
    })
  }

  const handlePush = (record: EarlyWarning) => {
    Modal.confirm({
      title: '推送通知',
      icon: <SendOutlined />,
      content: `将预警 ${record.id} 推送给 ${record.assignee}？`,
      okText: '推送',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.warnings.push(record.id)
          message.success(`预警 ${record.id} 已推送给 ${record.assignee}`)
        } catch (error) {
          message.error('推送失败，请重试')
        }
      },
    })
  }

  const columns = [
    {
      title: '预警ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '支公司',
      dataIndex: 'branch',
      key: 'branch',
      width: 120,
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      width: 90,
    },
    {
      title: '险种',
      dataIndex: 'insuranceType',
      key: 'insuranceType',
      width: 80,
    },
    {
      title: '事故类型',
      dataIndex: 'accidentType',
      key: 'accidentType',
      width: 100,
    },
    {
      title: '异常天数',
      dataIndex: 'anomalyDays',
      key: 'anomalyDays',
      width: 90,
      render: (val: number) => (
        <span style={{ color: val >= 7 ? '#ee6666' : '#333', fontWeight: val >= 7 ? 600 : 400 }}>
          {val}天
        </span>
      ),
    },
    {
      title: '当前/历史均值',
      key: 'ratio',
      width: 130,
      render: (_: unknown, record: EarlyWarning) => (
        <span>
          <span style={{ color: '#ee6666', fontWeight: 600 }}>{record.avgAnomalyCount.toFixed(1)}</span>
          <span style={{ color: '#999' }}> / </span>
          <span style={{ color: '#666' }}>{record.historicalAvg.toFixed(1)}</span>
        </span>
      ),
    },
    {
      title: '触发日期',
      dataIndex: 'triggerDate',
      key: 'triggerDate',
      width: 110,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: EarlyWarning['status']) => (
        <Tag color={statusConfig[status].color}>{statusConfig[status].label}</Tag>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 70,
      render: (level: EarlyWarning['level']) => (
        <Tag color={levelConfig[level].color}>{levelConfig[level].label}</Tag>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: EarlyWarning) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PushpinOutlined />}
            disabled={record.status !== 'active'}
            onClick={() => handleAcknowledge(record)}
          >
            确认
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={record.status === 'resolved'}
            onClick={() => handleResolve(record)}
          >
            解决
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            onClick={() => handlePush(record)}
          >
            推送
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 0 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={loading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>活跃预警</span>}
                value={summaryStats.active}
                suffix="条"
                prefix={<AlertOutlined style={{ color: '#ee6666' }} />}
                styles={{ content: { color: '#ee6666', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={loading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>高级别预警</span>}
                value={summaryStats.high}
                suffix="条"
                prefix={<ExclamationCircleOutlined style={{ color: '#ee6666' }} />}
                styles={{ content: { color: '#ee6666', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={loading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>已确认</span>}
                value={summaryStats.acknowledged}
                suffix="条"
                prefix={<SolutionOutlined style={{ color: '#fa8c16' }} />}
                styles={{ content: { color: '#fa8c16', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={loading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>已解决</span>}
                value={summaryStats.resolved}
                suffix="条"
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                styles={{ content: { color: '#52c41a', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Space>
            <span style={{ color: '#666' }}>状态：</span>
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 130 }}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: '活跃', value: 'active' },
                { label: '已确认', value: 'acknowledged' },
                { label: '已解决', value: 'resolved' },
              ]}
            />
            <span style={{ color: '#666' }}>级别：</span>
            <Select
              allowClear
              placeholder="全部级别"
              style={{ width: 130 }}
              value={levelFilter}
              onChange={(val) => setLevelFilter(val)}
              options={[
                { label: '高', value: 'high' },
                { label: '中', value: 'medium' },
                { label: '低', value: 'low' },
              ]}
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>
                <Badge status="error" style={{ marginRight: 6 }} />
                风险预警列表
              </span>
            }
            style={cardShadow}
            styles={{ body: { padding: 0 } }}
          >
            <Skeleton active loading={loading}>
              <Table<EarlyWarning>
                rowKey="id"
                columns={columns}
                dataSource={filteredData}
                pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
                scroll={{ x: 1200 }}
                size="middle"
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <span style={{ fontWeight: 600 }}>异常趋势图</span>
                <Select
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  style={{ width: 160 }}
                  options={branchOptions}
                />
              </Space>
            }
            style={cardShadow}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Skeleton active loading={loading}>
              <ReactECharts option={trendOption} style={{ height: 320 }} />
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default EarlyWarningPage
