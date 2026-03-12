import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { UsersPage } from './pages/UsersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
