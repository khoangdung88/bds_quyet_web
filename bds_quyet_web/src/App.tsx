import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { pathname } = useLocation()
  const { user, profile, signOut } = useAuth()
  const nav = useNavigate()
  return (
    <div>
      <header className="header container">
        <div>
          <Link to="/"><strong>BĐS bds_quyet</strong></Link>
        </div>
        <nav className="nav">
          <Link to="/">Dự án</Link>
          <Link to="/properties">Bất động sản</Link>
          {profile?.user_type === 'admin' && (
            <Link to="/admin">Admin</Link>
          )}
          {!user ? (
            <button className="button secondary" onClick={() => nav('/login')}>Đăng nhập</button>
          ) : (
            <button className="button secondary" onClick={() => signOut()}>Đăng xuất</button>
          )}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="container small" style={{ padding: '24px 0' }}>
        © {new Date().getFullYear()} - bds_quyet
      </footer>
    </div>
  )
}
