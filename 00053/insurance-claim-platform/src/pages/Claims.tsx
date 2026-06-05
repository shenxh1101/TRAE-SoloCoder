import React, { useMemo, useState, useEffect } from 'react'
import { Card, Table, Tag, Input, Select, Button, Space, Row, Col, Descriptions, message, Skeleton } from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import api from '../services/api'
import type { Claim, ClaimStatus } from '../types'

const cardShadow: React.CSSProperties = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderRadius: 8,
}

const statusConfig: Record<ClaimStatus, { color: string; label: string }> = {
  pending: { color: 'blue', label: '待处理' },
  assessing: { color: 'orange', label: '审核中' },
  approved: { color: 'green', label: '已批准' },
  rejected: { color: 'red', label: '已拒绝' },
  paid: { color: 'cyan', label: '已赔付' },
}

const insuranceTypes = ['车险', '健康险', '意外险', '责任险', '财产险']

const formatAmount = (val: number) => `¥ ${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const Claims: React.FC = () => {
  const [data, setData] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [searchClaimNo, setSearchClaimNo] = useState('')
  const [searchPolicyNo, setSearchPolicyNo] = useState('')
  const [searchHolder, setSearchHolder] = useState('')
  const [filterInsuranceType, setFilterInsuranceType] = useState<string | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterBranch, setFilterBranch] = useState<string | undefined>(undefined)

  const fetchClaims = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (searchClaimNo) params.claimNo = searchClaimNo
      if (searchPolicyNo) params.policyNo = searchPolicyNo
      if (searchHolder) params.holderName = searchHolder
      if (filterInsuranceType) params.insuranceType = filterInsuranceType
      if (filterStatus) params.status = filterStatus
      if (filterBranch) params.branch = filterBranch
      const result = await api.claims.getList(params)
      setData(result || [])
    } catch (error) {
      console.error('Failed to fetch claims:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClaims()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchClaimNo, searchPolicyNo, searchHolder, filterInsuranceType, filterStatus, filterBranch])

  const allBranches = useMemo(() => {
    return [...new Set(data.map((c) => c.branch))].sort()
  }, [data])

  const filteredData = useMemo(() => {
    return data
  }, [data])

  const handleExport = () => {
    message.success(`已导出 ${filteredData.length} 条理赔数据`)
  }

  const handleReset = () => {
    setSearchClaimNo('')
    setSearchPolicyNo('')
    setSearchHolder('')
    setFilterInsuranceType(undefined)
    setFilterStatus(undefined)
    setFilterBranch(undefined)
  }

  const columns = [
    {
      title: '理赔编号',
      dataIndex: 'claimNo',
      key: 'claimNo',
      width: 130,
      fixed: 'left' as const,
    },
    {
      title: '保单编号',
      dataIndex: 'policyNo',
      key: 'policyNo',
      width: 130,
    },
    {
      title: '投保人',
      dataIndex: 'holderName',
      key: 'holderName',
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
      title: '理赔金额',
      dataIndex: 'claimAmount',
      key: 'claimAmount',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <span style={{ fontWeight: 500 }}>{formatAmount(val)}</span>,
    },
    {
      title: '批准金额',
      dataIndex: 'approvedAmount',
      key: 'approvedAmount',
      width: 130,
      align: 'right' as const,
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#52c41a' : '#999', fontWeight: 500 }}>
          {val > 0 ? formatAmount(val) : '-'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: ClaimStatus) => (
        <Tag color={statusConfig[status].color}>{statusConfig[status].label}</Tag>
      ),
    },
    {
      title: '处理人',
      dataIndex: 'handler',
      key: 'handler',
      width: 80,
    },
    {
      title: '支公司',
      dataIndex: 'branch',
      key: 'branch',
      width: 110,
    },
    {
      title: '报案日期',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 110,
    },
  ]

  const expandedRowRender = (record: Claim) => (
    <Descriptions
      size="small"
      column={3}
      bordered
      style={{ margin: '8px 0' }}
      labelStyle={{ backgroundColor: '#fafafa', fontWeight: 500, color: '#666' }}
    >
      <Descriptions.Item label="事故日期">{record.accidentDate}</Descriptions.Item>
      <Descriptions.Item label="结案日期">{record.closeDate || '—'}</Descriptions.Item>
      <Descriptions.Item label="查勘员">{record.assessor}</Descriptions.Item>
      <Descriptions.Item label="拒赔原因" span={3}>
        {record.rejectReason ? (
          <span style={{ color: '#ff4d4f' }}>{record.rejectReason}</span>
        ) : (
          <span style={{ color: '#999' }}>—</span>
        )}
      </Descriptions.Item>
    </Descriptions>
  )

  return (
    <div style={{ padding: 0 }}>
      <Card
        style={{ ...cardShadow, marginBottom: 16 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="理赔编号"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchClaimNo}
              onChange={(e) => setSearchClaimNo(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Input
              placeholder="保单编号"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchPolicyNo}
              onChange={(e) => setSearchPolicyNo(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Input
              placeholder="投保人姓名"
              value={searchHolder}
              onChange={(e) => setSearchHolder(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={4}>
            <Select
              placeholder="险种"
              allowClear
              style={{ width: '100%' }}
              value={filterInsuranceType}
              onChange={setFilterInsuranceType}
              options={insuranceTypes.map((t) => ({ label: t, value: t }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={3}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              options={Object.entries(statusConfig).map(([value, { label }]) => ({ label, value }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={3}>
            <Select
              placeholder="支公司"
              allowClear
              style={{ width: '100%' }}
              value={filterBranch}
              onChange={setFilterBranch}
              options={allBranches.map((b) => ({ label: b, value: b }))}
            />
          </Col>
        </Row>
        <Row style={{ marginTop: 12 }} justify="end">
          <Space>
            <Button onClick={handleReset}>重置</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        </Row>
      </Card>

      <Card
        title={<span style={{ fontWeight: 600 }}>理赔案件列表</span>}
        style={cardShadow}
        styles={{ body: { padding: 0 } }}
      >
        <Skeleton active loading={loading}>
          <Table<Claim>
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            expandable={{ expandedRowRender, rowExpandable: () => true }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
            scroll={{ x: 1200 }}
            size="middle"
          />
        </Skeleton>
      </Card>
    </div>
  )
}

export default Claims
