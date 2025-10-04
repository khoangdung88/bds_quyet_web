import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Post = {
  id: string
  title: string
  slug: string | null
  content: string | null
  excerpt: string | null
  category: string | null
  status: 'draft' | 'published' | 'archived'
}

const emptyForm: Omit<Post, 'id'> = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  category: '',
  status: 'draft'
}

export default function AdminPosts() {
  const [items, setItems] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Post, 'id'>>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('id,title,slug,content,excerpt,category,status')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) setError(error.message)
    setItems((data ?? []) as Post[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return items.filter(p => `${p.title} ${p.category ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  }, [items, q])

  const startCreate = () => { setEditingId(null); setForm({ ...emptyForm }) }
  const startEdit = (p: Post) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      slug: p.slug ?? '',
      content: p.content ?? '',
      excerpt: p.excerpt ?? '',
      category: p.category ?? '',
      status: p.status
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const { error } = await supabase.from('posts').update({ ...form }).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('posts').insert([{ ...form }])
        if (error) throw error
      }
      await load()
      setEditingId(null)
      setForm({ ...emptyForm })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Xóa bài viết này?')) return
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  return (
    <div>
      <div className="h2">Quản lý Bài viết</div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input className="input" placeholder="Tìm kiếm" value={q} onChange={e => setQ(e.target.value)} />
        <button className="button" onClick={startCreate}>Thêm mới</button>
      </div>

      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      {/* Form */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>{editingId ? 'Sửa bài viết' : 'Thêm bài viết'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
          <input className="input" placeholder="Tiêu đề" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Slug" value={form.slug ?? ''} onChange={e => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder="Chuyên mục" value={form.category ?? ''} onChange={e => setForm({ ...form, category: e.target.value })} />
          <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Post['status'] })}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          <textarea className="input" placeholder="Tóm tắt" value={form.excerpt ?? ''} onChange={e => setForm({ ...form, excerpt: e.target.value })} />
          <textarea className="input" placeholder="Nội dung" value={form.content ?? ''} onChange={e => setForm({ ...form, content: e.target.value })} />
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="button" onClick={save} disabled={saving}>{editingId ? 'Cập nhật' : 'Tạo mới'}</button>
          {editingId && <button className="button secondary" style={{ marginLeft: 8 }} onClick={() => { setEditingId(null); setForm({ ...emptyForm }) }}>Hủy</button>}
        </div>
      </div>

      {/* List */}
      <div className="grid">
        {filtered.map(p => (
          <div key={p.id} className="card">
            <div className="h2" style={{ marginBottom: 6 }}>{p.title}</div>
            <div className="small">{p.category ?? '—'} | {p.status}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button className="button" onClick={() => startEdit(p)}>Sửa</button>
              <button className="button secondary" onClick={() => remove(p.id)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
