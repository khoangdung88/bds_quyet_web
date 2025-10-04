import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Category = { id: string; name: string; slug: string | null; description: string | null }

const emptyForm: Omit<Category, 'id'> = { name: '', slug: '', description: '' }

export default function AdminCategories() {
  const [items, setItems] = useState<Category[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Category, 'id'>>({ ...emptyForm })
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('property_categories')
      .select('id,name,slug,description')
      .order('name')
      .limit(500)
    if (error) setError(error.message)
    setItems((data ?? []) as Category[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => items.filter(c => `${c.name} ${c.slug ?? ''}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  const startCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true) }
  const startEdit = (c: Category) => { setEditingId(c.id); setForm({ name: c.name, slug: c.slug ?? '', description: c.description ?? '' }); setShowForm(true) }

  const save = async () => {
    try {
      if (editingId) {
        const { error } = await supabase.from('property_categories').update({ ...form }).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('property_categories').insert([{ ...form }])
        if (error) throw error
      }
      await load()
      setEditingId(null); setForm({ ...emptyForm }); setShowForm(false)
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: string) => {
    if (!confirm('Xóa danh mục này?')) return
    const { error } = await supabase.from('property_categories').delete().eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  return (
    <div>
      <div className="h2">Quản lý Danh mục BĐS</div>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input className="input" placeholder="Tìm kiếm" value={q} onChange={e => setQ(e.target.value)} />
        <button className="button" onClick={startCreate}>Thêm mới</button>
      </div>
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      {showForm && (
        <div className="card">
          <div className="h2" style={{ marginBottom: 8 }}>{editingId ? 'Sửa danh mục' : 'Thêm danh mục'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
            <input className="input" placeholder="Tên danh mục" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Slug" value={form.slug ?? ''} onChange={e => setForm({ ...form, slug: e.target.value })} />
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
              <th style={{ textAlign: 'left' }}>Slug</th>
              <th style={{ textAlign: 'left' }}>Mô tả</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.slug ?? '—'}</td>
                <td>{c.description ?? '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="button" onClick={() => startEdit(c)}>Sửa</button>
                    <button className="button secondary" onClick={() => remove(c.id)}>Xóa</button>
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
