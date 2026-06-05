import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from '@/store/authStore';
import Login from '@/pages/Login';
import ReaderLayout from '@/components/layout/ReaderLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import ReaderHome from '@/pages/reader/Home';
import ReaderSearch from '@/pages/reader/Search';
import BookDetail from '@/pages/reader/BookDetail';
import Profile from '@/pages/reader/Profile';
import Dashboard from '@/pages/admin/Dashboard';
import BookManagement from '@/pages/admin/BookManagement';
import BorrowManagement from '@/pages/admin/BorrowManagement';
import Statistics from '@/pages/admin/Statistics';

const ReaderRoute = () => {
  const { user } = useAuthStore();
  if (!user || user.role === 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const AdminRoute = () => {
  const { user } = useAuthStore();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const PublicRoute = () => {
  const { user } = useAuthStore();
  if (user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/reader" replace />;
  }
  return <Outlet />;
};

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#165DFF',
          borderRadius: 8,
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ReaderRoute />}>
            <Route path="/reader" element={<ReaderLayout />}>
              <Route index element={<ReaderHome />} />
              <Route path="search" element={<ReaderSearch />} />
              <Route path="book/:id" element={<BookDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="books" element={<BookManagement />} />
              <Route path="borrow" element={<BorrowManagement />} />
              <Route path="statistics" element={<Statistics />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
