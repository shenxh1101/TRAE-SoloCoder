import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Vehicles from '@/pages/Vehicles';
import Application from '@/pages/Application';
import Approval from '@/pages/Approval';
import Return from '@/pages/Return';
import History from '@/pages/History';
import Reports from '@/pages/Reports';
import Maintenance from '@/pages/Maintenance';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { canAccessRoute } from '@/utils/permissions';

const ProtectedRoute = ({ children, path }: { children: React.ReactNode; path: string }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessRoute(path, user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const { user } = useAuthStore();
  const { startAutoRefresh, stopAutoRefresh } = useDashboardStore();

  useEffect(() => {
    if (user) {
      startAutoRefresh();
    }
    return () => {
      stopAutoRefresh();
    };
  }, [user, startAutoRefresh, stopAutoRefresh]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute path="/dashboard">
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute path="/dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="vehicles"
            element={
              <ProtectedRoute path="/vehicles">
                <Vehicles />
              </ProtectedRoute>
            }
          />
          <Route
            path="application"
            element={
              <ProtectedRoute path="/application">
                <Application />
              </ProtectedRoute>
            }
          />
          <Route
            path="approval"
            element={
              <ProtectedRoute path="/approval">
                <Approval />
              </ProtectedRoute>
            }
          />
          <Route
            path="return"
            element={
              <ProtectedRoute path="/return">
                <Return />
              </ProtectedRoute>
            }
          />
          <Route
            path="history"
            element={
              <ProtectedRoute path="/history">
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute path="/reports">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="maintenance"
            element={
              <ProtectedRoute path="/maintenance">
                <Maintenance />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
