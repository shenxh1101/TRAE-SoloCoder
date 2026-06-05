import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  SwapOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const { Header, Sider, Content, Footer } = Layout;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '数据概览',
      onClick: () => navigate('/admin'),
    },
    {
      key: '/admin/books',
      icon: <BookOutlined />,
      label: '图书管理',
      onClick: () => navigate('/admin/books'),
    },
    {
      key: '/admin/borrow',
      icon: <SwapOutlined />,
      label: '借还管理',
      onClick: () => navigate('/admin/borrow'),
    },
    {
      key: '/admin/statistics',
      icon: <BarChartOutlined />,
      label: '统计报表',
      onClick: () => navigate('/admin/statistics'),
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const getSelectedKey = () => {
    if (location.pathname === '/admin') return '/admin';
    if (location.pathname.startsWith('/admin/books')) return '/admin/books';
    if (location.pathname.startsWith('/admin/borrow')) return '/admin/borrow';
    if (location.pathname.startsWith('/admin/statistics')) return '/admin/statistics';
    return location.pathname;
  };

  return (
    <Layout className="min-h-screen">
      <Sider width={220} className="bg-white shadow-lg">
        <div className="h-16 flex items-center justify-center border-b">
          <BookOutlined className="text-2xl text-blue-600 mr-2" />
          <span className="text-lg font-bold text-blue-600">管理后台</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          className="border-none mt-4"
        />
      </Sider>
      <Layout>
        <Header className="flex items-center justify-end px-6 bg-white shadow-sm">
          <div className="flex items-center">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" className="flex items-center">
                <Avatar size="small" icon={<UserOutlined />} className="mr-2" />
                <span className="text-gray-700">{user?.name} (管理员)</span>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          <Outlet />
        </Content>
        <Footer className="text-center bg-white border-t">
          <p className="text-gray-500 text-sm">
            © 2024 高校图书馆图书借阅与智能管理系统
          </p>
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
