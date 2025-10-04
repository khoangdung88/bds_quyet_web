import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

interface Project {
  id: string
  name: string
  slug: string | null
  developer: string | null
  description: string | null
  city: string | null
  district: string | null
  status: string | null
  logo_url: string | null
  created_at: string | null
}

export default function ProjectsList() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,developer,description,city,district,status,logo_url,created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) setError(error.message)
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = items.filter(p => {
    const key = `${p.name ?? ''} ${p.developer ?? ''} ${p.city ?? ''} ${p.district ?? ''}`.toLowerCase()
    return key.includes(q.toLowerCase())
  })

  return (
    <div>
      <h1 className="h1">Dự án</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="Tìm theo tên, CĐT, TP, Quận/Huyện..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}
      <div className="grid">
        {filtered.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: 56, height: 56, background: '#0b0c10', borderRadius: 8 }} />
              )}
              <div>
                <div className="h2">{p.name}</div>
                <div className="small">{p.developer ?? '—'}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }} className="small">
              {p.district ? `${p.district}, ` : ''}{p.city ?? ''}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link className="button" to={`/projects/${p.id}`}>Xem chi tiết</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
