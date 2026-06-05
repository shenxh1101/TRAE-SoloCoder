import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useSimulationStore } from './store/useSimulationStore';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SimulationList from './pages/SimulationList';
import NewSimulation from './pages/NewSimulation';
import SimulationDetail from './pages/SimulationDetail';
import Compare from './pages/Compare';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout>{children}</MainLayout>;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { initWebSocket, disconnectWebSocket, fetchSimulations, fetchNotifications } = useSimulationStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchSimulations();
      fetchNotifications();
      initWebSocket();
    }
    return () => {
      if (isAuthenticated) {
        disconnectWebSocket();
      }
    };
  }, [isAuthenticated]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulations"
          element={
            <ProtectedRoute>
              <SimulationList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulations/new"
          element={
            <ProtectedRoute>
              <NewSimulation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulations/:id"
          element={
            <ProtectedRoute>
              <SimulationDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <Compare />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
