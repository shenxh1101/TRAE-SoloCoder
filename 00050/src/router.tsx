import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import Login from './pages/Login';
import { AppLayout } from './components/Layout/AppLayout';
import { initializeAuth, useAuthStore } from './store/useAuthStore';
import { useMonitorStore } from './store/useMonitorStore';
import { startAutoScheduler, stopAutoScheduler } from './utils/autoScheduler';

import ExhibitorDashboard from './pages/Exhibitor/Dashboard';
import ExhibitorBooking from './pages/Exhibitor/Booking';
import ExhibitorServices from './pages/Exhibitor/Services';
import ExhibitorStatistics from './pages/Exhibitor/Statistics';
import ExhibitorContracts from './pages/Exhibitor/Contracts';

import VisitorDashboard from './pages/Visitor/Dashboard';
import VisitorExhibitors from './pages/Visitor/Exhibitors';
import VisitorForums from './pages/Visitor/Forums';
import VisitorRoute from './pages/Visitor/Route';

import OperatorDashboard from './pages/Operator/Dashboard';
import OperatorMonitor from './pages/Operator/Monitor';
import OperatorReviews from './pages/Operator/Reviews';
import OperatorWarnings from './pages/Operator/Warnings';

import ProviderDashboard from './pages/Provider/Dashboard';
import ProviderOrders from './pages/Provider/Orders';
import ProviderTickets from './pages/Provider/Tickets';

import FinanceDashboard from './pages/Finance/Dashboard';
import FinanceIncome from './pages/Finance/Income';
import FinanceReports from './pages/Finance/Reports';

import Notifications from './pages/Notifications';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RedirectToRole() {
  const { currentUser } = useAuthStore();
  if (currentUser) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  useEffect(() => {
    initializeAuth();
    useMonitorStore.getState().startAutoRefresh();
    startAutoScheduler();

    return () => {
      useMonitorStore.getState().stopAutoRefresh();
      stopAutoScheduler();
    };
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RedirectToRole />} />

          <Route
            path="/exhibitor"
            element={
              <RequireAuth>
                <AppLayout role="exhibitor" />
              </RequireAuth>
            }
          >
            <Route index element={<ExhibitorDashboard />} />
            <Route path="booking" element={<ExhibitorBooking />} />
            <Route path="services" element={<ExhibitorServices />} />
            <Route path="statistics" element={<ExhibitorStatistics />} />
            <Route path="contracts" element={<ExhibitorContracts />} />
          </Route>

          <Route
            path="/visitor"
            element={
              <RequireAuth>
                <AppLayout role="visitor" />
              </RequireAuth>
            }
          >
            <Route index element={<VisitorDashboard />} />
            <Route path="exhibitors" element={<VisitorExhibitors />} />
            <Route path="forums" element={<VisitorForums />} />
            <Route path="route" element={<VisitorRoute />} />
          </Route>

          <Route
            path="/operator"
            element={
              <RequireAuth>
                <AppLayout role="operator" />
              </RequireAuth>
            }
          >
            <Route index element={<OperatorDashboard />} />
            <Route path="monitor" element={<OperatorMonitor />} />
            <Route path="reviews" element={<OperatorReviews />} />
            <Route path="warnings" element={<OperatorWarnings />} />
          </Route>

          <Route
            path="/provider"
            element={
              <RequireAuth>
                <AppLayout role="provider" />
              </RequireAuth>
            }
          >
            <Route index element={<ProviderDashboard />} />
            <Route path="orders" element={<ProviderOrders />} />
            <Route path="tickets" element={<ProviderTickets />} />
          </Route>

          <Route
            path="/finance"
            element={
              <RequireAuth>
                <AppLayout role="finance" />
              </RequireAuth>
            }
          >
            <Route index element={<FinanceDashboard />} />
            <Route path="income" element={<FinanceIncome />} />
            <Route path="reports" element={<FinanceReports />} />
          </Route>

          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
