import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from './store';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PetList from './pages/PetList';
import PetForm from './pages/PetForm';
import PetManagement from './pages/PetManagement';
import CaregiverManagement from './pages/CaregiverManagement';
import BookingList from './pages/BookingList';
import BookingPage from './pages/BookingPage';
import BookingDetail from './pages/BookingDetail';
import PackageManager from './pages/PackageManager';
import ScheduleManager from './pages/ScheduleManager';
import ReportCenter from './pages/ReportCenter';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { currentUser, initialized, init } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialized) {
      init();
    }
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [initialized, init]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto mb-4 animate-spin text-primary-500" />
          <p className="text-neutral-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <><Layout /><Outlet /></>;
}

function App() {
  const { initialized, init, currentUser } = useAppStore();

  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [initialized, init]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/pets" element={
          <PrivateRoute>
            <PetList />
          </PrivateRoute>
        } />

        <Route path="/pets/new" element={
          <PrivateRoute>
            <PetForm />
          </PrivateRoute>
        } />

        <Route path="/pets/:id/edit" element={
          <PrivateRoute>
            <PetForm />
          </PrivateRoute>
        } />

        <Route path="/booking" element={
          <PrivateRoute>
            <BookingList />
          </PrivateRoute>
        } />

        <Route path="/booking/new" element={
          <PrivateRoute>
            <BookingPage />
          </PrivateRoute>
        } />

        <Route path="/booking/:id" element={
          <PrivateRoute>
            <BookingDetail />
          </PrivateRoute>
        } />

        <Route path="/admin/packages" element={
          <PrivateRoute allowedRoles={['admin']}>
            <PackageManager />
          </PrivateRoute>
        } />

        <Route path="/admin/pets" element={
          <PrivateRoute allowedRoles={['admin']}>
            <PetManagement />
          </PrivateRoute>
        } />

        <Route path="/admin/caregivers" element={
          <PrivateRoute allowedRoles={['admin']}>
            <CaregiverManagement />
          </PrivateRoute>
        } />

        <Route path="/admin/schedule" element={
          <PrivateRoute allowedRoles={['admin']}>
            <ScheduleManager />
          </PrivateRoute>
        } />

        <Route path="/admin/reports" element={
          <PrivateRoute allowedRoles={['admin']}>
            <ReportCenter />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
