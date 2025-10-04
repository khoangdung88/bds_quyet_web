import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type PackageRow = { id: string; name: string; price: number | null; duration_days: number | null; description: string | null }

const emptyForm: Omit<PackageRow, 'id'> = { name: '', price: null, duration_days: null, description: '' }

export default function AdminPackages() {
  const [items, setItems] = useState<PackageRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<PackageRow, 'id'>>({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('packages')
      .select('id,name,price,duration_days,description')
      .order('name')
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as PackageRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(p => `${p.name}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  const startCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true) }
  const startEdit = (r: PackageRow) => { setEditingId(r.id); setForm({ name: r.name, price: r.price, duration_days: r.duration_days, description: r.description ?? '' }); setShowForm(true) }

  const save = async () => {
    try {
      if (editingId) {
        const { error } = await supabase.from('packages').update({ ...form }).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('packages').insert([{ ...form }])
        if (error) throw error
      }
      await load(); setEditingId(null); setForm({ ...emptyForm }); setShowForm(false)
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: string) => {
    if (!confirm('Xóa gói dịch vụ này?')) return
    const { error } = await supabase.from('packages').delete().eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  return (
    <div>
      <div className="h2">Gói dịch vụ</div>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input className="input" placeholder="Tìm kiếm" value={q} onChange={e => setQ(e.target.value)} />
        <button className="button" onClick={startCreate}>Thêm mới</button>
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      {showForm && (
        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>{editingId ? 'Sửa gói' : 'Thêm gói'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
            <input className="input" placeholder="Tên gói" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" type="number" placeholder="Giá" value={form.price ?? ''} onChange={e => setForm({ ...form, price: e.target.value === '' ? null : Number(e.target.value) })} />
            <input className="input" type="number" placeholder="Thời hạn (ngày)" value={form.duration_days ?? ''} onChange={e => setForm({ ...form, duration_days: e.target.value === '' ? null : Number(e.target.value) })} />
            <textarea className="input" placeholder="Mô tả" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="button" onClick={save}>{editingId ? 'Cập nhật' : 'Tạo mới'}</button>
            <button className="button secondary" style={{ marginLeft: 8 }} onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(false) }}>Hủy</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Tên</th>
              <th style={{ textAlign: 'left' }}>Giá</th>
              <th style={{ textAlign: 'left' }}>Thời hạn</th>
              <th style={{ textAlign: 'left' }}>Mô tả</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.price ?? '—'}</td>
                <td>{r.duration_days ?? '—'}</td>
                <td>{r.description ?? '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="button" onClick={() => startEdit(r)}>Sửa</button>
                    <button className="button secondary" onClick={() => remove(r.id)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
