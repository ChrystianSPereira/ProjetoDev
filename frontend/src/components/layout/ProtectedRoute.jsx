import { Navigate, Outlet } from 'react-router-dom'

import { getAccessToken } from '../../features/auth/authStorage'

export function ProtectedRoute() {
  const token = getAccessToken()
  return token ? <Outlet /> : <Navigate to="/login" replace />
}
