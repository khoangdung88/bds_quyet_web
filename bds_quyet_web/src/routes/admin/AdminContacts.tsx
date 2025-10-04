import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Contact = { id: string; name: string; email: string | null; phone: string; message: string | null; contact_type: string | null; status: string | null; scheduled_at: string | null; property_id: string | null }

export default function AdminContacts() {
  const [items, setItems] = useState<Contact[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contacts')
      .select('id,name,email,phone,message,contact_type,status,scheduled_at,property_id')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as Contact[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(c => `${c.name} ${c.email ?? ''} ${c.phone}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <div>
      <div className="h2">Liên hệ</div>
      <div className="card">
        <input className="input" placeholder="Tìm kiếm" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Tên</th>
              <th style={{ textAlign: 'left' }}>Email</th>
              <th style={{ textAlign: 'left' }}>Điện thoại</th>
              <th style={{ textAlign: 'left' }}>Loại</th>
              <th style={{ textAlign: 'left' }}>Trạng thái</th>
              <th style={{ textAlign: 'left' }}>Hẹn</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.phone}</td>
                <td>{c.contact_type ?? '—'}</td>
                <td>{c.status ?? '—'}</td>
                <td>{c.scheduled_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
