import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth()
  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="h2">Quản trị</div>
        <div className="small">
          {profile?.full_name || user?.email} ({profile?.user_type || 'user'})
          <button className="button secondary" style={{ marginLeft: 8 }} onClick={() => signOut()}>Đăng xuất</button>
        </div>
      </div>
      <nav className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className="button secondary" to="/admin">Tổng quan</Link>
        <Link className="button secondary" to="/admin/projects">Dự án</Link>
        <Link className="button secondary" to="/admin/properties">Bất động sản</Link>
        <Link className="button secondary" to="/admin/amenities">Tiện ích</Link>
        <Link className="button secondary" to="/admin/posts">Bài viết</Link>
      </nav>
      <Outlet />
    </div>
  )
}
