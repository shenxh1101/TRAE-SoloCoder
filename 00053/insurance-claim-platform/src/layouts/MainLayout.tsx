import React, { useState } from 'react'
import { Layout, Menu, Tag, Avatar, Dropdown, Space } from 'antd'
import {
  DashboardOutlined,
  AlertOutlined,
  FileSearchOutlined,
  CloudUploadOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import type { UserRole } from '../types'

const { Header, Sider, Content } = Layout

const roleLabels: Record<UserRole, string> = {
  headquarters: '总部',
  region: '区域',
  branch: '支公司',
}

const roleColors: Record<UserRole, string> = {
  headquarters: 'red',
  region: 'blue',
  branch: 'green',
}

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore() as any

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '核心看板' },
    { key: '/drilldown', icon: <FileSearchOutlined />, label: '险种下钻' },
    { key: '/warning', icon: <AlertOutlined />, label: '风险预警' },
    { key: '/claims', icon: <SafetyCertificateOutlined />, label: '理赔管理' },
    { key: '/upload', icon: <CloudUploadOutlined />, label: '定损上传' },
    { key: '/report', icon: <BarChartOutlined />, label: '效能报告' },
  ]

  const userMenu = {
    items: [
      { key: 'logout', label: '退出登录', icon: <LogoutOutlined /> },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        logout()
        navigate('/login')
      }
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <SafetyCertificateOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          {!collapsed && (
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginLeft: 10 }}>
              保险理赔风控平台
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size="middle">
            <Tag color={roleColors[(user?.role as UserRole) || 'headquarters']}>
              {roleLabels[(user?.role as UserRole) || 'headquarters']}
            </Tag>
            {user?.role === 'region' && user?.region && <Tag>{user.region}</Tag>}
            {user?.role === 'branch' && (
              <>
                {user?.region && <Tag>{user.region}</Tag>}
                {user?.branch && <Tag color="cyan">{user.branch}</Tag>}
              </>
            )}
          </Space>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span>{user?.name || '用户'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
