import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  const [openContent, setOpenContent] = React.useState<boolean>(() => {
    const v = localStorage.getItem('admin_sidebar_openContent')
    return v ? JSON.parse(v) : true
  })
  const [openUsers, setOpenUsers] = React.useState<boolean>(() => {
    const v = localStorage.getItem('admin_sidebar_openUsers')
    return v ? JSON.parse(v) : false
  })
  const [openCommerce, setOpenCommerce] = React.useState<boolean>(() => {
    const v = localStorage.getItem('admin_sidebar_openCommerce')
    return v ? JSON.parse(v) : false
  })

  React.useEffect(() => { localStorage.setItem('admin_sidebar_openContent', JSON.stringify(openContent)) }, [openContent])
  React.useEffect(() => { localStorage.setItem('admin_sidebar_openUsers', JSON.stringify(openUsers)) }, [openUsers])
  React.useEffect(() => { localStorage.setItem('admin_sidebar_openCommerce', JSON.stringify(openCommerce)) }, [openCommerce])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}>
      {/* Sidebar trái */}
      <aside className="card" style={{ height: 'calc(100vh - 24px)', position: 'sticky', top: 12, display: 'flex', flexDirection: 'column' }}>
        <div className="h2" style={{ marginBottom: 8 }}>Quản trị</div>
        <div className="small" style={{ marginBottom: 12 }}>
          {profile?.full_name || user?.email} ({profile?.user_type || 'user'})
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link className={`button ${isActive('/admin') ? '' : 'secondary'}`} to="/admin">Tổng quan</Link>

          <button className="button secondary" onClick={() => setOpenContent(o => !o)} style={{ textAlign: 'left' }}>
            Nội dung {openContent ? '▾' : '▸'}
          </button>
          {openContent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 10, borderLeft: '2px solid var(--border, #e5e7eb)', background: 'var(--bgSoft, #f9fafb)', paddingTop: 6, paddingBottom: 6, borderRadius: 6 }}>
              <Link className={`button ${isActive('/admin/projects') ? '' : 'secondary'}`} to="/admin/projects">Dự án</Link>
              <Link className={`button ${isActive('/admin/properties') ? '' : 'secondary'}`} to="/admin/properties">Bất động sản</Link>
              <Link className={`button ${isActive('/admin/categories') ? '' : 'secondary'}`} to="/admin/categories">Danh mục BĐS</Link>
              <Link className={`button ${isActive('/admin/amenities') ? '' : 'secondary'}`} to="/admin/amenities">Tiện ích</Link>
              <Link className={`button ${isActive('/admin/posts') ? '' : 'secondary'}`} to="/admin/posts">Bài viết</Link>
            </div>
          )}

          <button className="button secondary" onClick={() => setOpenUsers(o => !o)} style={{ textAlign: 'left' }}>
            Người dùng {openUsers ? '▾' : '▸'}
          </button>
          {openUsers && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 10, borderLeft: '2px solid var(--border, #e5e7eb)', background: 'var(--bgSoft, #f9fafb)', paddingTop: 6, paddingBottom: 6, borderRadius: 6 }}>
              <Link className={`button ${isActive('/admin/profiles') ? '' : 'secondary'}`} to="/admin/profiles">Hồ sơ</Link>
              <Link className={`button ${isActive('/admin/contacts') ? '' : 'secondary'}`} to="/admin/contacts">Liên hệ</Link>
              <Link className={`button ${isActive('/admin/reviews') ? '' : 'secondary'}`} to="/admin/reviews">Đánh giá</Link>
              <Link className={`button ${isActive('/admin/favorites') ? '' : 'secondary'}`} to="/admin/favorites">Yêu thích</Link>
              <Link className={`button ${isActive('/admin/saved-searches') ? '' : 'secondary'}`} to="/admin/saved-searches">Tìm kiếm đã lưu</Link>
              <Link className={`button ${isActive('/admin/post-downloads') ? '' : 'secondary'}`} to="/admin/post-downloads">Tải xuống bài viết</Link>
            </div>
          )}

          <button className="button secondary" onClick={() => setOpenCommerce(o => !o)} style={{ textAlign: 'left' }}>
            Thương mại {openCommerce ? '▾' : '▸'}
          </button>
          {openCommerce && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 10, borderLeft: '2px solid var(--border, #e5e7eb)', background: 'var(--bgSoft, #f9fafb)', paddingTop: 6, paddingBottom: 6, borderRadius: 6 }}>
              <Link className={`button ${isActive('/admin/orders') ? '' : 'secondary'}`} to="/admin/orders">Đơn hàng</Link>
              <Link className={`button ${isActive('/admin/packages') ? '' : 'secondary'}`} to="/admin/packages">Gói dịch vụ</Link>
            </div>
          )}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button className="button secondary" onClick={() => signOut()}>Đăng xuất</button>
        </div>
      </aside>

      {/* Nội dung */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
