import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const loc = useLocation()

  if (loading) return <div className="card">Đang kiểm tra quyền truy cập...</div>
  const isAdmin = !!user && profile?.user_type === 'admin'
  if (!isAdmin) return <Navigate to="/login" state={{ from: loc }} replace />

  return <>{children}</>
}
