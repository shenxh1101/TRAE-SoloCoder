import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Tag, Row, Col, Statistic, Breadcrumb, Skeleton } from 'antd'
import ReactECharts from 'echarts-for-react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import api from '../services/api'
import type { HandlerEfficiency } from '../types'

const cardShadow: React.CSSProperties = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderRadius: 8,
}

const tagColors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b8d0',
  '#7b9ce1', '#bd6d6c', '#75d874', '#e0c78e', '#d2694f',
]

const DrillDown: React.FC = () => {
  const [searchParams] = useSearchParams()
  const insuranceType = searchParams.get('type') || '车险'

  const [handlersLoading, setHandlersLoading] = useState(true)
  const [rejectReasonsLoading, setRejectReasonsLoading] = useState(true)
  const [handlers, setHandlers] = useState<HandlerEfficiency[]>([])
  const [rejectReasons, setRejectReasons] = useState<any[]>([])

  useEffect(() => {
    const fetchHandlers = async () => {
      setHandlersLoading(true)
      try {
        const params: Record<string, any> = {}
        if (insuranceType) {
          params.insuranceType = insuranceType
        }
        const data = await api.efficiency.getHandlers(params)
        setHandlers(data || [])
      } catch (error) {
        console.error('Failed to fetch handlers:', error)
        setHandlers([])
      } finally {
        setHandlersLoading(false)
      }
    }

    const fetchRejectReasons = async () => {
      setRejectReasonsLoading(true)
      try {
        const params: Record<string, any> = {}
        if (insuranceType) {
          params.insuranceType = insuranceType
        }
        const data = await api.efficiency.getRejectReasons(params)
        setRejectReasons(data || [])
      } catch (error) {
        console.error('Failed to fetch reject reasons:', error)
        setRejectReasons([])
      } finally {
        setRejectReasonsLoading(false)
      }
    }

    fetchHandlers()
    fetchRejectReasons()
  }, [insuranceType])

  const filteredHandlers = useMemo(() => {
    return handlers
  }, [handlers])

  const kpiData = useMemo(() => {
    const totalCases = filteredHandlers.reduce((s, h) => s + (h.totalCases || 0), 0)
    const closedCases = filteredHandlers.reduce((s, h) => s + (h.closedCases || 0), 0)
    const avgDays = filteredHandlers.length > 0
      ? (filteredHandlers.reduce((s, h) => s + (h.avgProcessingDays || 0), 0) / filteredHandlers.length).toFixed(1)
      : '0.0'
    const avgRejection = filteredHandlers.length > 0
      ? (filteredHandlers.reduce((s, h) => s + (h.rejectionRate || 0), 0) / filteredHandlers.length).toFixed(1)
      : '0.0'
    return { totalCases, closedCases, avgDays, avgRejection }
  }, [filteredHandlers])

  const columns = [
    {
      title: '理赔员',
      dataIndex: 'handler',
      key: 'handler',
      width: 100,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '所属支公司',
      dataIndex: 'branch',
      key: 'branch',
      width: 130,
    },
    {
      title: '总案件数',
      dataIndex: 'totalCases',
      key: 'totalCases',
      width: 100,
      sorter: (a: HandlerEfficiency, b: HandlerEfficiency) => (a.totalCases || 0) - (b.totalCases || 0),
      render: (val: number) => `${val}件`,
    },
    {
      title: '已结案',
      dataIndex: 'closedCases',
      key: 'closedCases',
      width: 90,
      sorter: (a: HandlerEfficiency, b: HandlerEfficiency) => (a.closedCases || 0) - (b.closedCases || 0),
      render: (val: number) => `${val}件`,
    },
    {
      title: '平均处理天数',
      dataIndex: 'avgProcessingDays',
      key: 'avgProcessingDays',
      width: 120,
      sorter: (a: HandlerEfficiency, b: HandlerEfficiency) => (a.avgProcessingDays || 0) - (b.avgProcessingDays || 0),
      render: (val: number) => (
        <span style={{ color: val > 15 ? '#ee6666' : val > 10 ? '#fac858' : '#91cc75', fontWeight: 600 }}>
          {val}天
        </span>
      ),
    },
    {
      title: '拒赔率',
      dataIndex: 'rejectionRate',
      key: 'rejectionRate',
      width: 100,
      sorter: (a: HandlerEfficiency, b: HandlerEfficiency) => (a.rejectionRate || 0) - (b.rejectionRate || 0),
      render: (val: number) => (
        <span style={{ color: val > 20 ? '#ee6666' : val > 10 ? '#fac858' : '#52c41a', fontWeight: 600 }}>
          {val}%
        </span>
      ),
    },
    {
      title: '通过率',
      dataIndex: 'approvalRate',
      key: 'approvalRate',
      width: 100,
      sorter: (a: HandlerEfficiency, b: HandlerEfficiency) => (a.approvalRate || 0) - (b.approvalRate || 0),
      render: (val: number) => (
        <span style={{ color: val > 85 ? '#52c41a' : val > 75 ? '#fac858' : '#ee6666', fontWeight: 600 }}>
          {val}%
        </span>
      ),
    },
  ]

  const rejectReasonMap = useMemo(() => {
    if (rejectReasons.length > 0) {
      return rejectReasons
        .map((r: any) => [r.reason || r.name, r.count || r.value])
        .sort((a: any, b: any) => b[1] - a[1])
    }
    const map: Record<string, number> = {}
    filteredHandlers.forEach((h) => {
      if (h.rejectReasons) {
        h.rejectReasons.forEach((r) => {
          map[r.reason] = (map[r.reason] || 0) + r.count
        })
      }
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [rejectReasons, filteredHandlers])

  const maxCount = rejectReasonMap.length > 0 ? (rejectReasonMap[0][1] as number) : 1

  const barOption = useMemo(() => {
    const sorted = [...filteredHandlers].sort((a, b) => (b.avgProcessingDays || 0) - (a.avgProcessingDays || 0))
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0]
          return `${p.name}<br/>平均处理天数：${p.value}天`
        },
      },
      grid: { top: 20, bottom: 10, left: 80, right: 30, containLabel: true },
      xAxis: {
        type: 'value',
        name: '天数',
        nameTextStyle: { color: '#999' },
        axisLabel: { color: '#999' },
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((h) => h.handler),
        axisLabel: { color: '#666', fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((h) => ({
            value: h.avgProcessingDays || 0,
            itemStyle: {
              color: (h.avgProcessingDays || 0) > 15 ? '#ee6666' : (h.avgProcessingDays || 0) > 10 ? '#fac858' : '#91cc75',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            formatter: '{c}天',
            fontSize: 11,
            color: '#666',
          },
        },
      ],
    }
  }, [filteredHandlers])

  return (
    <div style={{ padding: 0 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/">首页</Link> },
          { title: <span style={{ color: '#5470c6', fontWeight: 600 }}>{insuranceType} - 理赔员效率分析</span> },
        ]}
      />

      <Card
        style={{ ...cardShadow, marginBottom: 16, background: 'linear-gradient(135deg, #5470c6 0%, #3ba272 100%)' }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>
          {insuranceType} · 理赔员效率下钻分析
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0', fontSize: 13 }}>
          查看各理赔员案件处理效率、拒赔原因分布及处理时长对比
        </p>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={handlersLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>总案件数</span>}
                value={kpiData.totalCases}
                suffix="件"
                prefix={<TeamOutlined style={{ color: '#5470c6' }} />}
                styles={{ content: { color: '#333', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={handlersLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>已结案</span>}
                value={kpiData.closedCases}
                suffix="件"
                prefix={<CheckCircleOutlined style={{ color: '#91cc75' }} />}
                styles={{ content: { color: '#91cc75', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={handlersLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>平均处理天数</span>}
                value={kpiData.avgDays}
                suffix="天"
                prefix={<ClockCircleOutlined style={{ color: '#fac858' }} />}
                styles={{ content: { color: '#333', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={handlersLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>平均拒赔率</span>}
                value={kpiData.avgRejection}
                suffix="%"
                prefix={<CloseCircleOutlined style={{ color: '#ee6666' }} />}
                styles={{ content: { color: '#ee6666', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600 }}>理赔员效率明细</span>}
            style={cardShadow}
            styles={{ body: { padding: 0 } }}
          >
            <Skeleton active loading={handlersLoading}>
              <Table
                dataSource={filteredHandlers}
                columns={columns}
                rowKey="handler"
                pagination={false}
                size="middle"
                scroll={{ x: 740 }}
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 600 }}>拒赔原因分布</span>}
            style={cardShadow}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Skeleton active loading={rejectReasonsLoading}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                {rejectReasonMap.map((item: any, idx: number) => {
                  const reason = item[0] as string
                  const count = item[1] as number
                  const ratio = count / maxCount
                  const fontSize = Math.round(12 + ratio * 20)
                  const color = tagColors[idx % tagColors.length]
                  return (
                    <Tag
                      key={reason}
                      color={color}
                      style={{
                        fontSize,
                        lineHeight: `${fontSize + 10}px`,
                        padding: '2px 12px',
                        margin: 0,
                        borderRadius: 4,
                        cursor: 'default',
                      }}
                    >
                      {reason} ({count})
                    </Tag>
                  )
                })}
                {rejectReasonMap.length === 0 && (
                  <span style={{ color: '#999' }}>暂无拒赔原因数据</span>
                )}
              </div>
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ fontWeight: 600 }}>理赔员处理时长对比</span>}
            style={cardShadow}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Skeleton active loading={handlersLoading}>
              <ReactECharts option={barOption} style={{ height: 380 }} />
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DrillDown
