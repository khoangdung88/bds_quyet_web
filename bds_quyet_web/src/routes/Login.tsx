import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Login() {
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const nav = useNavigate()
  const loc = useLocation() as any
  const fromPath = loc?.state?.from?.pathname || '/admin'

  // Nếu đã đăng nhập, tự động chuyển hướng khỏi trang Login
  useEffect(() => {
    if (!authLoading && user) {
      nav(fromPath, { replace: true })
    }
  }, [user, authLoading, nav, fromPath])

  const doSignIn = async () => {
    setSubmitting(true)
    const { error } = await signInWithEmail(email, password)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    nav(fromPath, { replace: true })
  }

  const doSignUp = async () => {
    setSubmitting(true)
    const { error } = await signUpWithEmail(email, password)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    // Sau khi signup cần xác thực email tùy cài đặt; chuyển hướng tạm thời
    nav(fromPath, { replace: true })
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
      <div className="h2">Đăng nhập</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <input className="input" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder="Mật khẩu" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="small" style={{ color: '#ff8080' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button" onClick={doSignIn} disabled={submitting}>Đăng nhập</button>
          <button className="button secondary" onClick={doSignUp} disabled={submitting}>Đăng ký</button>
        </div>
      </div>
    </div>
  )
}
