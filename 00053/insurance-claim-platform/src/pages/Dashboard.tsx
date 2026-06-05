import React, { useMemo, useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Radio, Select, Tag, Skeleton } from 'antd'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import api from '../services/api'
import { useAppStore } from '../stores/useAppStore'
import type { Period } from '../types'

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
const quarters = ['2026-Q1', '2026-Q2']
const quarterMonths: Record<string, string[]> = {
  '2026-Q1': ['2026-01', '2026-02', '2026-03'],
  '2026-Q2': ['2026-04', '2026-05'],
}
const insuranceTypes = ['车险', '健康险', '意外险', '责任险', '财产险']
const regions = ['华东', '华南', '华北', '华中', '西南', '西北', '东北']

const cardShadow: React.CSSProperties = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderRadius: 8,
}

function generateMockHeatmapData(): [number, number, number][] {
  const data: [number, number, number][] = []
  insuranceTypes.forEach((_, yIdx) => {
    months.forEach((_, xIdx) => {
      const value = Math.round(50 + Math.random() * 150)
      data.push([xIdx, yIdx, value])
    })
  })
  return data
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { period, selectedMonth, selectedRegion, setPeriod, setSelectedMonth, setSelectedRegion } = useAppStore()

  const [statisticsLoading, setStatisticsLoading] = useState(true)
  const [accidentDistributionLoading, setAccidentDistributionLoading] = useState(true)
  const [branchPerformanceLoading, setBranchPerformanceLoading] = useState(true)
  const [statistics, setStatistics] = useState<any>(null)
  const [accidentDistribution, setAccidentDistribution] = useState<any[]>([])
  const [branchPerformance, setBranchPerformance] = useState<any[]>([])

  const filteredMonths = useMemo(() => {
    if (period === 'quarter') {
      return quarterMonths[selectedMonth] || months
    }
    return [selectedMonth]
  }, [period, selectedMonth])

  useEffect(() => {
    const fetchStatistics = async () => {
      setStatisticsLoading(true)
      try {
        const params: Record<string, any> = { months: filteredMonths.join(',') }
        if (selectedRegion !== '全部') {
          params.region = selectedRegion
        }
        const data = await api.claims.getStatistics(params)
        setStatistics(data)
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
      } finally {
        setStatisticsLoading(false)
      }
    }

    const fetchAccidentDistribution = async () => {
      setAccidentDistributionLoading(true)
      try {
        const params: Record<string, any> = { months: filteredMonths.join(',') }
        if (selectedRegion !== '全部') {
          params.region = selectedRegion
        }
        const data = await api.claims.getAccidentDistribution(params)
        setAccidentDistribution(data || [])
      } catch (error) {
        console.error('Failed to fetch accident distribution:', error)
        setAccidentDistribution([])
      } finally {
        setAccidentDistributionLoading(false)
      }
    }

    fetchStatistics()
    fetchAccidentDistribution()
  }, [filteredMonths, selectedRegion])

  useEffect(() => {
    const fetchBranchPerformance = async () => {
      setBranchPerformanceLoading(true)
      try {
        const data = await api.claims.getBranchPerformance()
        setBranchPerformance(data || [])
      } catch (error) {
        console.error('Failed to fetch branch performance:', error)
        setBranchPerformance([])
      } finally {
        setBranchPerformanceLoading(false)
      }
    }

    fetchBranchPerformance()
  }, [])

  const kpiData = useMemo(() => {
    if (!statistics) {
      return { total: 0, payoutRate: '0.0', rejectionRate: '0.0', avgDays: '0.0' }
    }
    return {
      total: statistics.totalClaims || 0,
      payoutRate: statistics.payoutRate?.toFixed(1) || '0.0',
      rejectionRate: statistics.rejectionRate?.toFixed(1) || '0.0',
      avgDays: statistics.avgProcessingDays?.toFixed(1) || '0.0',
    }
  }, [statistics])

  const heatmapOption = useMemo(() => {
    const data = generateMockHeatmapData()
    const maxVal = Math.max(...data.map((d) => d[2]), 1)
    return {
      tooltip: {
        position: 'top',
        formatter: (params: { data: number[] }) => {
          const [x, y, val] = params.data
          return `${months[x]} / ${insuranceTypes[y]}<br/>赔付金额：${val.toFixed(1)}万元`
        },
      },
      grid: { top: 10, bottom: 60, left: 80, right: 40 },
      xAxis: {
        type: 'category',
        data: months,
        splitArea: { show: true },
        axisLabel: { color: '#666' },
      },
      yAxis: {
        type: 'category',
        data: insuranceTypes,
        splitArea: { show: true },
        axisLabel: { color: '#666' },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'] },
        text: ['高', '低'],
        textStyle: { color: '#666' },
      },
      series: [
        {
          type: 'heatmap',
          data,
          label: {
            show: true,
            formatter: (params: { data: number[] }) => params.data[2].toFixed(0),
            color: '#333',
            fontSize: 11,
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
          },
        },
      ],
    }
  }, [])

  const pieOption = useMemo(() => {
    const data = accidentDistribution
      .map((item: any) => ({
        name: item.accidentType || item.name,
        value: item.count || item.value,
      }))
      .filter((item: any) => item.value > 0)
      .sort((a: any, b: any) => b.value - a.value)

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}件 ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#666', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: data.length > 0 ? data : [{ name: '暂无数据', value: 1 }],
        },
      ],
      color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
    }
  }, [accidentDistribution])

  const barOption = useMemo(() => {
    const filtered = selectedRegion === '全部'
      ? branchPerformance
      : branchPerformance.filter((b: any) => b.region === selectedRegion)
    const sorted = [...filtered]
      .sort((a: any, b: any) => (b.totalClaims || 0) - (a.totalClaims || 0))
      .slice(0, 12)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['理赔总量', '赔付率', '拒赔率'],
        textStyle: { color: '#666' },
      },
      grid: { top: 40, bottom: 10, left: 100, right: 40, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#999' },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((s: any) => s.branch || s.name),
        axisLabel: { color: '#666', fontSize: 12 },
      },
      series: [
        {
          name: '理赔总量',
          type: 'bar',
          data: sorted.map((s: any) => s.totalClaims || 0),
          itemStyle: { color: '#5470c6', borderRadius: [0, 4, 4, 0] },
        },
        {
          name: '赔付率',
          type: 'bar',
          data: sorted.map((s: any) => s.payoutRate || 0),
          itemStyle: { color: '#91cc75', borderRadius: [0, 4, 4, 0] },
        },
        {
          name: '拒赔率',
          type: 'bar',
          data: sorted.map((s: any) => s.rejectionRate || 0),
          itemStyle: { color: '#ee6666', borderRadius: [0, 4, 4, 0] },
        },
      ],
    }
  }, [branchPerformance, selectedRegion])

  const handleHeatmapClick = (params: { componentType: string; data?: number[] }) => {
    if (params.componentType === 'series' && params.data) {
      const insType = insuranceTypes[params.data[1]]
      if (insType) {
        navigate(`/drilldown?type=${encodeURIComponent(insType)}`)
      }
    }
  }

  const periodOptions = period === 'month' ? months : quarters

  return (
    <div style={{ padding: 0 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Radio.Group
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as Period)
              setSelectedMonth(e.target.value === 'month' ? '2026-05' : '2026-Q2')
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="month">月度</Radio.Button>
            <Radio.Button value="quarter">季度</Radio.Button>
          </Radio.Group>
        </Col>
        <Col>
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            style={{ width: 140 }}
            options={periodOptions.map((m) => ({ label: m, value: m }))}
          />
        </Col>
        <Col>
          <Select
            value={selectedRegion}
            onChange={setSelectedRegion}
            style={{ width: 140 }}
            options={[
              { label: '全部区域', value: '全部' },
              ...regions.map((r) => ({ label: r, value: r })),
            ]}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={statisticsLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>理赔总量</span>}
                value={kpiData.total}
                suffix="件"
                prefix={<FileTextOutlined style={{ color: '#5470c6' }} />}
                styles={{ content: { color: '#333', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={statisticsLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>赔付率</span>}
                value={kpiData.payoutRate}
                suffix="%"
                prefix={<CheckCircleOutlined style={{ color: '#91cc75' }} />}
                styles={{ content: { color: '#91cc75', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={statisticsLoading}>
              <Statistic
                title={<span style={{ color: '#8c8c8c' }}>拒赔率</span>}
                value={kpiData.rejectionRate}
                suffix="%"
                prefix={<CloseCircleOutlined style={{ color: '#ee6666' }} />}
                styles={{ content: { color: '#ee6666', fontWeight: 600 } }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Skeleton active loading={statisticsLoading}>
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
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>
                险种赔付金额热力图
                <Tag color="blue" style={{ marginLeft: 8, fontWeight: 400 }}>
                  点击险种可下钻
                </Tag>
              </span>
            }
            style={cardShadow}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Skeleton active loading={statisticsLoading}>
              <ReactECharts
                option={heatmapOption}
                style={{ height: 340 }}
                onEvents={{ click: handleHeatmapClick }}
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ fontWeight: 600 }}>事故原因分布</span>}
            style={cardShadow}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Skeleton active loading={accidentDistributionLoading}>
              <ReactECharts option={pieOption} style={{ height: 340 }} />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600 }}>支公司业绩对比</span>}
            style={cardShadow}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Skeleton active loading={branchPerformanceLoading}>
              <ReactECharts option={barOption} style={{ height: 380 }} />
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
