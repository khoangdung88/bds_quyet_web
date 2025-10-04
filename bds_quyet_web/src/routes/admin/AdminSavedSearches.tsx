import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type SavedSearch = { id: string; user_id: string | null; name: string | null; search_params: any; email_alert: boolean | null; alert_frequency: string | null; created_at?: string }

export default function AdminSavedSearches() {
  const [items, setItems] = useState<SavedSearch[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id,user_id,name,search_params,email_alert,alert_frequency,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as SavedSearch[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(s => `${s.name ?? ''} ${s.user_id ?? ''}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <div>
      <div className="h2">Tìm kiếm đã lưu</div>
      <div className="card">
        <input className="input" placeholder="Tìm theo tên/user" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Tên</th>
              <th style={{ textAlign: 'left' }}>User</th>
              <th style={{ textAlign: 'left' }}>Nhận email</th>
              <th style={{ textAlign: 'left' }}>Tần suất</th>
              <th style={{ textAlign: 'left' }}>Params</th>
              <th style={{ textAlign: 'left' }}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>{s.name ?? '—'}</td>
                <td>{s.user_id ?? '—'}</td>
                <td>{s.email_alert ? '✔' : '—'}</td>
                <td>{s.alert_frequency ?? '—'}</td>
                <td><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(s.search_params ?? {}, null, 2)}</pre></td>
                <td>{s.created_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
