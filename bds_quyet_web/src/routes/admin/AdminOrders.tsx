import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Order = { id: string; user_id: string | null; property_id: string | null; status: string | null; created_at?: string }

export default function AdminOrders() {
  const [items, setItems] = useState<Order[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,property_id,status,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as Order[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(o => `${o.user_id ?? ''} ${o.property_id ?? ''} ${o.status ?? ''}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <div>
      <div className="h2">Đơn hàng</div>
      <div className="card">
        <input className="input" placeholder="Tìm theo user/property/status" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>User</th>
              <th style={{ textAlign: 'left' }}>Property</th>
              <th style={{ textAlign: 'left' }}>Trạng thái</th>
              <th style={{ textAlign: 'left' }}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>{o.user_id ?? '—'}</td>
                <td>{o.property_id ?? '—'}</td>
                <td>{o.status ?? '—'}</td>
                <td>{o.created_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
