import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Review = { id: string; user_id: string | null; property_id: string | null; rating: number | null; content: string | null; created_at?: string }

export default function AdminReviews() {
  const [items, setItems] = useState<Review[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('id,user_id,property_id,rating,content,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as Review[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(r => `${r.content ?? ''} ${r.rating ?? ''}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <div>
      <div className="h2">Đánh giá</div>
      <div className="card">
        <input className="input" placeholder="Tìm kiếm nội dung" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Người dùng</th>
              <th style={{ textAlign: 'left' }}>BĐS</th>
              <th style={{ textAlign: 'left' }}>Điểm</th>
              <th style={{ textAlign: 'left' }}>Nội dung</th>
              <th style={{ textAlign: 'left' }}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td>{r.user_id ?? '—'}</td>
                <td>{r.property_id ?? '—'}</td>
                <td>{r.rating ?? '—'}</td>
                <td>{r.content ?? '—'}</td>
                <td>{r.created_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
