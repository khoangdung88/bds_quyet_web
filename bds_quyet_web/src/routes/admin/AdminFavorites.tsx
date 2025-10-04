import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Favorite = { id: string; user_id: string | null; property_id: string | null; created_at?: string }

export default function AdminFavorites() {
  const [items, setItems] = useState<Favorite[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('favorites')
      .select('id,user_id,property_id,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as Favorite[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(f => `${f.user_id ?? ''} ${f.property_id ?? ''}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <div>
      <div className="h2">Yêu thích</div>
      <div className="card">
        <input className="input" placeholder="Tìm theo user/property" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>User</th>
              <th style={{ textAlign: 'left' }}>Property</th>
              <th style={{ textAlign: 'left' }}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id}>
                <td>{f.user_id ?? '—'}</td>
                <td>{f.property_id ?? '—'}</td>
                <td>{f.created_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
