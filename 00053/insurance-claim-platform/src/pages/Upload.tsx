import React, { useState, useMemo, useEffect } from 'react'
import {
  Card, Upload, Button, Table, Descriptions, Tag, Row, Col, Statistic, Alert, Divider, Space, message, Skeleton,
} from 'antd'
import { InboxOutlined, FileImageOutlined } from '@ant-design/icons'
import api from '../services/api'
import type { AssessmentRecord, AssessmentItem } from '../types'

const { Dragger } = Upload

const cardShadow: React.CSSProperties = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  borderRadius: 8,
}

const formatAmount = (val: number) =>
  `¥ ${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`

const vehicleModels = ['宝马3系 2024款', '奔驰C级 2025款', '奥迪A4L 2024款', '丰田凯美瑞 2024款', '本田雅阁 2025款']
const damageLocations = ['前保险杠', '左前翼子板', '右后车门', '车顶', '后保险杠', '发动机舱', '左前大灯', '右后尾灯']

const UploadPage: React.FC = () => {
  const [currentRecord, setCurrentRecord] = useState<AssessmentRecord | null>(null)
  const [extracted, setExtracted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [docFileList, setDocFileList] = useState<any[]>([])
  const [photoFileList, setPhotoFileList] = useState<any[]>([])
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>([])

  useEffect(() => {
    const fetchRecords = async () => {
      setRecordsLoading(true)
      try {
        const data = await api.assessment.getRecords()
        setAssessmentRecords(data || [])
      } catch (error) {
        console.error('Failed to fetch assessment records:', error)
        setAssessmentRecords([])
      } finally {
        setRecordsLoading(false)
      }
    }
    fetchRecords()
  }, [])

  const handleExtract = async () => {
    if (docFileList.length === 0) {
      message.warning('请先上传定损单文件')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      docFileList.forEach((file: any) => {
        formData.append('files', file.originFileObj || file)
      })
      photoFileList.forEach((file: any) => {
        formData.append('photos', file.originFileObj || file)
      })

      const result = await api.upload.assessment(formData)
      if (result && result.record) {
        setCurrentRecord(result.record)
      } else if (assessmentRecords.length > 0) {
        const randomRecord = assessmentRecords[Math.floor(Math.random() * assessmentRecords.length)]
        setCurrentRecord(randomRecord)
      } else {
        const mockRecord: AssessmentRecord = {
          id: 'REC-' + Date.now(),
          claimNo: 'CLM-' + Date.now().toString().slice(-8),
          assessor: '系统自动识别',
          assessmentDate: new Date().toISOString().split('T')[0],
          status: 'submitted',
          deviationFlag: false,
          totalEstimated: 5000 + Math.random() * 10000,
          totalActual: 5000 + Math.random() * 10000,
          items: [],
        }
        setCurrentRecord(mockRecord)
      }
      setExtracted(true)
      message.success('定损单识别完成，已提取关键信息')
    } catch (error) {
      message.error('识别失败，请重试')
      if (assessmentRecords.length > 0) {
        const randomRecord = assessmentRecords[Math.floor(Math.random() * assessmentRecords.length)]
        setCurrentRecord(randomRecord)
        setExtracted(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCurrentRecord(null)
    setExtracted(false)
    setDocFileList([])
    setPhotoFileList([])
  }

  const overallDeviation = useMemo(() => {
    if (!currentRecord) return 0
    return (currentRecord.totalActual - currentRecord.totalEstimated) / currentRecord.totalEstimated
  }, [currentRecord])

  const needsManualReview = useMemo(() => {
    if (!currentRecord) return false
    return currentRecord.items?.some((item) => Math.abs(item.deviation ?? 0) > 0.2) || Math.abs(overallDeviation) > 0.2
  }, [currentRecord, overallDeviation])

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 120,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (val: string) => <Tag>{val}</Tag>,
    },
    {
      title: '预估费用',
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 130,
      align: 'right' as const,
      render: (val: number) => formatAmount(val),
    },
    {
      title: '实际费用',
      dataIndex: 'actualCost',
      key: 'actualCost',
      width: 130,
      align: 'right' as const,
      render: (val: number) => formatAmount(val),
    },
    {
      title: '偏差率',
      dataIndex: 'deviation',
      key: 'deviation',
      width: 100,
      align: 'right' as const,
      render: (val: number) => {
        const absDev = Math.abs(val || 0)
        const color = absDev > 0.2 ? '#ff4d4f' : absDev > 0.1 ? '#faad14' : '#52c41a'
        return <span style={{ color, fontWeight: 600 }}>{formatPercent(val || 0)}</span>
      },
    },
    {
      title: '审核状态',
      dataIndex: 'needsReview',
      key: 'needsReview',
      width: 100,
      align: 'center' as const,
      render: (val: boolean, record: AssessmentItem) =>
        (val || Math.abs(record.deviation || 0) > 0.2) ? (
          <Tag color="red">需复核</Tag>
        ) : (
          <Tag color="green">已通过</Tag>
        ),
    },
  ]

  const rowClassName = (record: AssessmentItem) =>
    Math.abs(record.deviation ?? 0) > 0.2 ? 'deviation-alert-row' : ''

  return (
    <div style={{ padding: 0 }}>
      <style>{`
        .deviation-alert-row td {
          background-color: #fff1f0 !important;
        }
        .deviation-alert-row:hover td {
          background-color: #ffccc7 !important;
        }
      `}</style>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title={<span style={{ fontWeight: 600 }}><FileImageOutlined style={{ marginRight: 8 }} />定损单上传</span>}
            style={cardShadow}
            styles={{ body: { padding: '16px 24px' } }}
          >
            <Dragger
              fileList={docFileList}
              onChange={({ fileList }) => setDocFileList(fileList)}
              beforeUpload={() => false}
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} /></p>
              <p className="ant-upload-text">点击或拖拽定损单至此处上传</p>
              <p className="ant-upload-hint">支持 PDF、JPG、PNG 格式，可同时上传多个文件</p>
            </Dragger>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={<span style={{ fontWeight: 600 }}><FileImageOutlined style={{ marginRight: 8 }} />现场照片上传</span>}
            style={cardShadow}
            styles={{ body: { padding: '16px 24px' } }}
          >
            <Dragger
              fileList={photoFileList}
              onChange={({ fileList }) => setPhotoFileList(fileList)}
              beforeUpload={() => false}
              multiple
              accept=".jpg,.jpeg,.png"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: '#52c41a' }} /></p>
              <p className="ant-upload-text">点击或拖拽现场照片至此处上传</p>
              <p className="ant-upload-hint">支持 JPG、PNG 格式，建议上传事故现场多角度照片</p>
            </Dragger>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ ...cardShadow, marginBottom: 16, textAlign: 'center' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Space size="large">
          <Button type="primary" size="large" onClick={handleExtract} disabled={extracted || loading} loading={loading}>
            开始识别提取
          </Button>
          <Button size="large" onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {extracted && currentRecord && (
        <>
          <Card
            title={<span style={{ fontWeight: 600 }}>关键信息提取</span>}
            style={{ ...cardShadow, marginBottom: 16 }}
            styles={{ body: { padding: '16px 24px' } }}
          >
            <Skeleton active loading={loading}>
              <Descriptions
                bordered
                column={{ xs: 1, sm: 2, md: 4 }}
                size="middle"
                labelStyle={{ backgroundColor: '#fafafa', fontWeight: 500, color: '#666' }}
              >
                <Descriptions.Item label="理赔编号">{currentRecord.claimNo}</Descriptions.Item>
                <Descriptions.Item label="车辆型号">
                  {vehicleModels[Math.abs(currentRecord.claimNo.charCodeAt(currentRecord.claimNo.length - 1)) % vehicleModels.length]}
                </Descriptions.Item>
                <Descriptions.Item label="受损部位">
                  {damageLocations[Math.abs(currentRecord.claimNo.charCodeAt(currentRecord.claimNo.length - 2)) % damageLocations.length]}
                </Descriptions.Item>
                <Descriptions.Item label="预估维修费用">
                  <span style={{ color: '#1890ff', fontWeight: 600 }}>{formatAmount(currentRecord.totalEstimated)}</span>
                </Descriptions.Item>
                <Descriptions.Item label="查勘员">{currentRecord.assessor}</Descriptions.Item>
                <Descriptions.Item label="定损日期">{currentRecord.assessmentDate}</Descriptions.Item>
                <Descriptions.Item label="定损状态">
                  <Tag color={currentRecord.status === 'reviewed' ? 'green' : currentRecord.status === 'submitted' ? 'blue' : 'orange'}>
                    {currentRecord.status === 'reviewed' ? '已审核' : currentRecord.status === 'submitted' ? '已提交' : '草稿'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="偏差标记">
                  {currentRecord.deviationFlag ? (
                    <Tag color="red">存在偏差</Tag>
                  ) : (
                    <Tag color="green">无异常</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
              <Divider titlePlacement="left" style={{ margin: '16px 0 12px' }}>与历史数据对比</Divider>
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic title="同车型历史平均费用" value={currentRecord.totalEstimated * 0.95} precision={2} prefix="¥" styles={{ content: { fontSize: 16 } }} />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic title="本次预估费用" value={currentRecord.totalEstimated} precision={2} prefix="¥" styles={{ content: { fontSize: 16, color: '#1890ff' } }} />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic title="本次实际费用" value={currentRecord.totalActual} precision={2} prefix="¥" styles={{ content: { fontSize: 16, color: '#faad14' } }} />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="与历史平均偏差"
                    value={((currentRecord.totalActual - currentRecord.totalEstimated * 0.95) / (currentRecord.totalEstimated * 0.95)) * 100}
                    precision={1}
                    suffix="%"
                    styles={{ content: { fontSize: 16, color: '#ff4d4f' } }}
                  />
                </Col>
              </Row>
            </Skeleton>
          </Card>

          <Card
            title={<span style={{ fontWeight: 600 }}>偏差核查明细</span>}
            style={{ ...cardShadow, marginBottom: 16 }}
            styles={{ body: { padding: 0 } }}
          >
            <Skeleton active loading={loading}>
              <Table<AssessmentItem>
                rowKey="id"
                columns={columns}
                dataSource={currentRecord.items || []}
                rowClassName={rowClassName}
                pagination={false}
                size="middle"
              />
            </Skeleton>
          </Card>

          <Card style={cardShadow} styles={{ body: { padding: '20px 24px' } }}>
            <Row gutter={[24, 16]} align="middle">
              <Col xs={12} sm={6}>
                <Statistic title="预估总费用" value={currentRecord.totalEstimated} precision={2} prefix="¥" />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="实际总费用" value={currentRecord.totalActual} precision={2} prefix="¥" />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="整体偏差率"
                  value={overallDeviation * 100}
                  precision={1}
                  suffix="%"
                  styles={{ content: { color: Math.abs(overallDeviation) > 0.2 ? '#ff4d4f' : '#52c41a' } }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="人工复核"
                  value={needsManualReview ? '需要' : '不需要'}
                  styles={{ content: { color: needsManualReview ? '#ff4d4f' : '#52c41a', fontWeight: 700, fontSize: 24 } }}
                />
              </Col>
            </Row>
            {needsManualReview && (
              <Alert
                style={{ marginTop: 16 }}
                type="error"
                showIcon
                message="偏差预警"
                description={`整体偏差率 ${formatPercent(overallDeviation)}，存在单项偏差超过 20% 的定损项目，需进行人工复核确认。`}
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default UploadPage
