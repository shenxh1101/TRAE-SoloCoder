import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import TriagePage from '@/pages/TriagePage'
import MonitorPage from '@/pages/MonitorPage'
import TreatmentPage from '@/pages/TreatmentPage'
import ObservationPage from '@/pages/ObservationPage'
import BillingPage from '@/pages/BillingPage'
import StatisticsPage from '@/pages/StatisticsPage'
import ApprovalPage from '@/pages/ApprovalPage'
import Layout from '@/components/Layout'
import useAuthStore from '@/stores/authStore'
import type { UserRole } from '@/types'

const rolePages: Record<UserRole, string> = {
  nurse: '/triage',
  doctor: '/treatment',
  director: '/monitor',
  cashier: '/billing',
  admin: '/triage',
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  
  useEffect(() => {
    checkAuth()
  }, [checkAuth])
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (user && !allowedRoles.includes(user.role)) {
    const defaultPage = rolePages[user.role] || '/triage'
    return <Navigate to={defaultPage} replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/triage"
          element={
            <ProtectedRoute allowedRoles={['nurse', 'director', 'admin']}>
              <Layout title="分诊工作台">
                <TriagePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/monitor"
          element={
            <ProtectedRoute allowedRoles={['nurse', 'doctor', 'director', 'admin']}>
              <Layout title="实时监控">
                <MonitorPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/treatment"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'director', 'admin']}>
              <Layout title="诊治管理">
                <TreatmentPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/observation"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'nurse', 'director', 'admin']}>
              <Layout title="留观管理">
                <ObservationPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/billing"
          element={
            <ProtectedRoute allowedRoles={['cashier', 'director', 'admin']}>
              <Layout title="费用结算">
                <BillingPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/statistics"
          element={
            <ProtectedRoute allowedRoles={['director', 'admin']}>
              <Layout title="统计报表">
                <StatisticsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/approval"
          element={
            <ProtectedRoute allowedRoles={['director', 'admin']}>
              <Layout title="审批管理">
                <ApprovalPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
