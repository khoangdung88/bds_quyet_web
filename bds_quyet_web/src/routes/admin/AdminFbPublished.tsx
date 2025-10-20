import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Row = {
  id: string
  property_id: string
  group_id: string
  group_name: string | null
  message: string | null
  result_post_id: string | null
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  created_at: string
}

export default function AdminFbPublished() {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'success' | 'failed' | 'pending'>('all')

  const load = async () => {
    setLoading(true)
    let query = supabase
      .from('fb_published_posts')
      .select('id,property_id,group_id,group_name,message,result_post_id,status,error_message,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    const { data } = await query
    const list = (data as any[] | null) || []
    const filtered = q.trim()
      ? list.filter(r =>
          [r.group_id, r.group_name, r.property_id, r.message, r.result_post_id]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q.trim().toLowerCase())
        )
      : list
    setItems(filtered as Row[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="h2">Lịch sử đăng Facebook</div>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8 }}>
        <input className="input" placeholder="Tìm kiếm (group, property, nội dung, post id)" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input" value={status} onChange={e => setStatus(e.target.value as any)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="success">Thành công</option>
          <option value="failed">Thất bại</option>
          <option value="pending">Đang chờ</option>
        </select>
        <button className="button" onClick={load}>Làm mới</button>
      </div>

      {loading ? (
        <div className="card">Đang tải...</div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Thời gian</th>
                <th style={{ textAlign: 'left' }}>Group</th>
                <th style={{ textAlign: 'left' }}>Property ID</th>
                <th style={{ textAlign: 'left' }}>Trạng thái</th>
                <th style={{ textAlign: 'left' }}>Post ID</th>
                <th style={{ textAlign: 'left' }}>Lỗi</th>
                <th style={{ textAlign: 'left' }}>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString('vi-VN')}</td>
                  <td>{r.group_name || r.group_id}</td>
                  <td>{r.property_id}</td>
                  <td style={{ color: r.status === 'success' ? '#059669' : r.status === 'failed' ? '#dc2626' : '#6b7280' }}>{r.status}</td>
                  <td>{r.result_post_id || '-'}</td>
                  <td>{r.error_message || '-'}</td>
                  <td>
                    <div style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{r.message || '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
