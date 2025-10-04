import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const doSignIn = async () => {
    setLoading(true)
    const { error } = await signInWithEmail(email, password)
    setLoading(false)
    if (error) { setError(error.message); return }
    nav('/admin')
  }

  const doSignUp = async () => {
    setLoading(true)
    const { error } = await signUpWithEmail(email, password)
    setLoading(false)
    if (error) { setError(error.message); return }
    // Sau khi signup cần xác thực email tùy cài đặt; chuyển hướng tạm thời
    nav('/admin')
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '24px auto' }}>
      <div className="h2">Đăng nhập</div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <input className="input" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder="Mật khẩu" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="small" style={{ color: '#ff8080' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button" onClick={doSignIn} disabled={loading}>Đăng nhập</button>
          <button className="button secondary" onClick={doSignUp} disabled={loading}>Đăng ký</button>
        </div>
      </div>
    </div>
  )
}
