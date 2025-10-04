import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import UploadImage from '../../components/UploadImage'

type Project = {
  id: string
  name: string
  slug: string | null
  developer: string | null
  city: string | null
  district: string | null
  status: string | null
  logo_url: string | null
  address: string | null
  description: string | null
  total_units: number | null
  total_area: number | null
  hotline: string | null
  website: string | null
  completion_year: number | null
}

const emptyForm: Omit<Project, 'id'> = {
  name: '',
  slug: '',
  developer: '',
  city: '',
  district: '',
  status: 'planning',
  logo_url: '',
  address: '',
  description: '',
  total_units: null,
  total_area: null,
  hotline: '',
  website: '',
  completion_year: null
}

export default function AdminProjects() {
  const [items, setItems] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Project, 'id'>>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('id,name,slug,developer,city,district,status,logo_url,address,description,total_units,total_area,hotline,website,completion_year')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) setError(error.message)
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return items.filter(p => `${p.name} ${p.developer ?? ''} ${p.city ?? ''} ${p.district ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  }, [items, q])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
  }

  const startEdit = (p: Project) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      slug: p.slug ?? '',
      developer: p.developer ?? '',
      city: p.city ?? '',
      district: p.district ?? '',
      status: p.status ?? 'planning',
      logo_url: p.logo_url ?? '',
      address: p.address ?? '',
      description: p.description ?? '',
      total_units: p.total_units ?? null,
      total_area: p.total_area ?? null,
      hotline: p.hotline ?? '',
      website: p.website ?? '',
      completion_year: p.completion_year ?? null
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('projects')
          .update({ ...form })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([{ ...form }])
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
    if (!confirm('Xóa dự án này?')) return
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  return (
    <div>
      <div className="h2">Quản lý Dự án</div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input className="input" placeholder="Tìm kiếm" value={q} onChange={e => setQ(e.target.value)} />
        <button className="button" onClick={startCreate}>Thêm mới</button>
      </div>

      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      {/* Form */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>{editingId ? 'Sửa dự án' : 'Thêm dự án'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
          <input className="input" placeholder="Tên dự án" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Slug" value={form.slug ?? ''} onChange={e => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder="Chủ đầu tư" value={form.developer ?? ''} onChange={e => setForm({ ...form, developer: e.target.value })} />
          <input className="input" placeholder="Thành phố" value={form.city ?? ''} onChange={e => setForm({ ...form, city: e.target.value })} />
          <input className="input" placeholder="Quận/Huyện" value={form.district ?? ''} onChange={e => setForm({ ...form, district: e.target.value })} />
          <select className="input" value={form.status ?? 'planning'} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="planning">planning</option>
            <option value="construction">construction</option>
            <option value="completed">completed</option>
            <option value="selling">selling</option>
          </select>
          <input className="input" placeholder="Logo URL" value={form.logo_url ?? ''} onChange={e => setForm({ ...form, logo_url: e.target.value })} />
          <div>
            <UploadImage bucket="project-logos" onUploaded={(url) => setForm({ ...form, logo_url: url })} />
            {form.logo_url && (
              <div className="small" style={{ marginTop: 6 }}>
                <img src={form.logo_url} alt="logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
          <input className="input" placeholder="Địa chỉ" value={form.address ?? ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          <input className="input" type="number" placeholder="Tổng số căn" value={form.total_units ?? ''} onChange={e => setForm({ ...form, total_units: e.target.value === '' ? null : Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Tổng diện tích (m²)" value={form.total_area ?? ''} onChange={e => setForm({ ...form, total_area: e.target.value === '' ? null : Number(e.target.value) })} />
          <input className="input" placeholder="Hotline" value={form.hotline ?? ''} onChange={e => setForm({ ...form, hotline: e.target.value })} />
          <input className="input" placeholder="Website" value={form.website ?? ''} onChange={e => setForm({ ...form, website: e.target.value })} />
          <input className="input" type="number" placeholder="Năm hoàn thành" value={form.completion_year ?? ''} onChange={e => setForm({ ...form, completion_year: e.target.value === '' ? null : Number(e.target.value) })} />
          <textarea className="input" placeholder="Mô tả" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
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
            <div className="h2" style={{ marginBottom: 6 }}>{p.name}</div>
            <div className="small">{p.developer ?? '—'}</div>
            <div className="small" style={{ marginTop: 6 }}>{p.district ? `${p.district}, ` : ''}{p.city ?? ''}</div>
            <div className="small" style={{ marginTop: 6 }}>Trạng thái: {p.status ?? '—'}</div>
            {p.total_units != null && <div className="small" style={{ marginTop: 6 }}>Tổng số căn: {p.total_units}</div>}
            {p.total_area != null && <div className="small" style={{ marginTop: 6 }}>Tổng diện tích: {p.total_area} m²</div>}
            {p.hotline && <div className="small" style={{ marginTop: 6 }}>Hotline: {p.hotline}</div>}
            {p.website && <div className="small" style={{ marginTop: 6 }}>Website: <a href={p.website} target="_blank" rel="noopener noreferrer">{p.website}</a></div>}
            {p.completion_year != null && <div className="small" style={{ marginTop: 6 }}>Năm hoàn thành: {p.completion_year}</div>}
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
