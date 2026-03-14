import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentCreatePage } from './pages/DocumentCreatePage'
import { DocumentDetailPage } from './pages/DocumentDetailPage'
import { DocumentsListPage } from './pages/DocumentsListPage'
import { LoginPage } from './pages/LoginPage'
import { SectorsPage } from './pages/SectorsPage'
import { UsersPage } from './pages/UsersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documentos" element={<DocumentsListPage />} />
        <Route path="/documentos/novo" element={<DocumentCreatePage />} />
        <Route path="/documentos/:documentId" element={<DocumentDetailPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="/setores" element={<SectorsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
