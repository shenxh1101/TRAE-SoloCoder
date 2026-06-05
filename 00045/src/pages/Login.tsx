import { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        message.success('登录成功！');
        setTimeout(() => {
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role === 'ADMIN') {
            navigate('/admin');
          } else {
            navigate('/reader');
          }
        }, 100);
      } else {
        message.error('用户名或密码错误！');
      }
    } catch (error) {
      message.error('登录失败，请重试！');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-400 opacity-10 rounded-full blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BookOutlined className="text-4xl text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">高校图书馆</h1>
          <p className="text-gray-500 mt-2">图书借阅与智能管理系统</p>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名！' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-12 text-lg"
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>测试账号：</p>
          <p>学生：student001 / 123456</p>
          <p>教师：teacher001 / 123456</p>
          <p>管理员：admin / 123456</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
