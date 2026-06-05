import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ConfigProvider, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DrillDown from './pages/DrillDown'
import EarlyWarning from './pages/EarlyWarning'
import Claims from './pages/Claims'
import Upload from './pages/Upload'
import Report from './pages/Report'
import { useAuthStore } from './stores/useAuthStore'
import api from './services/api'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, user, setUser, setIsLoggedIn, logout } = useAuthStore() as any
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !isLoggedIn) {
      api.auth.me().then((res) => {
        if (res.success) {
          setUser(res.data)
          setIsLoggedIn(true)
        } else {
          logout()
          navigate('/login')
        }
      }).catch(() => {
        logout()
        navigate('/login')
      })
    }
  }, [isLoggedIn, setUser, setIsLoggedIn, logout, navigate])

  if (!localStorage.getItem('token')) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontSize: 14,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="drilldown" element={<DrillDown />} />
            <Route path="warning" element={<EarlyWarning />} />
            <Route path="claims" element={<Claims />} />
            <Route path="upload" element={<Upload />} />
            <Route path="report" element={<Report />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
