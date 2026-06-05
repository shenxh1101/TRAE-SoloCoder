import { Layout, Menu, Badge, Avatar, Dropdown, Button } from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';

const { Header, Content, Footer } = Layout;

const ReaderLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { getUnreadCount } = useMessageStore();

  const unreadCount = user ? getUnreadCount(user.id) : 0;

  const menuItems = [
    {
      key: '/reader',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/reader'),
    },
    {
      key: '/reader/search',
      icon: <SearchOutlined />,
      label: '图书检索',
      onClick: () => navigate('/reader/search'),
    },
    {
      key: '/reader/profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/reader/profile'),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/reader/profile'),
    },
    {
      key: 'messages',
      icon: <BellOutlined />,
      label: '消息中心',
      onClick: () => navigate('/reader/profile?tab=messages'),
    },
    {
      type: 'divider' as const,
    },
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
    if (location.pathname === '/reader') return '/reader';
    if (location.pathname.startsWith('/reader/search')) return '/reader/search';
    if (location.pathname.startsWith('/reader/profile')) return '/reader/profile';
    return location.pathname;
  };

  return (
    <Layout className="min-h-screen">
      <Header className="flex items-center justify-between px-6 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center">
          <div className="flex items-center mr-8">
            <BookOutlined className="text-2xl text-blue-600 mr-2" />
            <span className="text-xl font-bold text-blue-600">高校图书馆</span>
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            className="border-none flex-1"
          />
        </div>
        <div className="flex items-center space-x-4">
          <Button
            type="text"
            icon={
              <Badge count={unreadCount} size="small">
                <BellOutlined className="text-lg" />
              </Badge>
            }
            onClick={() => navigate('/reader/profile?tab=messages')}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center cursor-pointer hover:opacity-80">
              <Avatar size="small" icon={<UserOutlined />} className="mr-2" />
              <span className="text-gray-700">
                {user?.name} ({user?.role === 'student' ? '学生' : '教师'})
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>
      <Content className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </Content>
      <Footer className="text-center bg-white border-t">
        <p className="text-gray-500 text-sm">
          © 2024 高校图书馆图书借阅与智能管理系统
        </p>
      </Footer>
    </Layout>
  );
};

export default ReaderLayout;
