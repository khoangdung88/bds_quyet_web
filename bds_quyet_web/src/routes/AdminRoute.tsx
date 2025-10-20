import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const loc = useLocation()

  // Chờ hoàn tất xác thực ban đầu
  if (loading) return <div className="card">Đang kiểm tra quyền truy cập...</div>

  // Nếu đã có user nhưng chưa tải xong profile, tiếp tục chờ để tránh nhấp nháy/redirect sớm
  if (user && profile === null) {
    return <div className="card">Đang tải hồ sơ người dùng...</div>
  }

  const isAdmin = !!user && profile?.user_type === 'admin'
  if (!isAdmin) return <Navigate to="/login" state={{ from: loc }} replace />

  return <>{children}</>
}
