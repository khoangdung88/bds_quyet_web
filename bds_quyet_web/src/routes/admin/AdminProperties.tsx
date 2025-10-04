import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import UploadImage from '../../components/UploadImage'

type Property = {
  id: string
  title: string
  listing_type: 'sale' | 'rent' | 'lease'
  price: number
  currency: string | null
  area: number
  address: string
  district: string
  city: string
  project_id: string | null
  status: string | null
  negotiable: boolean | null
  bedrooms: number | null
  bathrooms: number | null
  floors?: number | null
  floor_number?: number | null
  ward: string | null
  featured: boolean | null
  verified: boolean | null
}

type Project = { id: string; name: string }
type Amenity = { id: string; name: string }
type PropertyImage = { id: string; url: string; caption: string | null; is_primary: boolean | null; display_order: number | null }

const emptyForm: Omit<Property, 'id'> = {
  title: '',
  listing_type: 'sale',
  price: 0,
  currency: 'VND',
  area: 0,
  address: '',
  district: '',
  city: '',
  project_id: null,
  status: 'available',
  negotiable: true,
  bedrooms: null,
  bathrooms: null,
  floors: null,
  floor_number: null,
  ward: '',
  featured: false,
  verified: false
}

export default function AdminProperties() {
  const [items, setItems] = useState<Property[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([])
  const [images, setImages] = useState<PropertyImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Property, 'id'>>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string>('')

  const load = async () => {
    setLoading(true)
    const [
      { data: props, error: e1 },
      { data: projs, error: e2 },
      { data: ams, error: e3 }
    ] = await Promise.all([
      supabase
        .from('properties')
        .select('id,title,listing_type,status,price,currency,negotiable,area,bedrooms,bathrooms,floors,floor_number,address,ward,district,city,featured,verified,project_id')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('projects')
        .select('id,name')
        .order('name')
        .limit(500),
      supabase
        .from('amenities')
        .select('id,name')
        .order('name')
        .limit(500)
    ])
    if (e1) setError(e1.message)
    if (e2) setError(e2.message)
    if (e3) setError(e3.message)
    setItems((props ?? []) as Property[])
    setProjects((projs ?? []) as Project[])
    setAmenities((ams ?? []) as Amenity[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return items.filter(p => {
      const key = `${p.title} ${p.address} ${p.district} ${p.city}`.toLowerCase()
      if (q && !key.includes(q.toLowerCase())) return false
      if (city && p.city?.toLowerCase() !== city.toLowerCase()) return false
      if (district && p.district?.toLowerCase() !== district.toLowerCase()) return false
      return true
    })
  }, [items, q, city, district])

  const startCreate = () => { setEditingId(null); setForm({ ...emptyForm }) }
  const startEdit = (p: Property) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      listing_type: p.listing_type,
      price: p.price,
      currency: p.currency ?? 'VND',
      area: p.area,
      address: p.address,
      status: p.status ?? 'available',
      negotiable: p.negotiable ?? true,
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      floors: p.floors ?? null,
      floor_number: p.floor_number ?? null,
      ward: p.ward ?? '',
      district: p.district,
      city: p.city,
      project_id: p.project_id,
      featured: p.featured ?? false,
      verified: p.verified ?? false
    })
    // Load videos for property
    void (async () => {
      const { data } = await supabase
        .from('property_videos')
        .select('url')
        .eq('property_id', p.id)
        .order('created_at', { ascending: true })
      setVideoUrls((data ?? []).map(v => v.url).join('\n'))
    })()
    // Load amenities
    void (async () => {
      const { data } = await supabase
        .from('property_amenities')
        .select('amenity_id')
        .eq('property_id', p.id)
      setSelectedAmenityIds((data ?? []).map((r: any) => r.amenity_id))
    })()
    // Load images
    void (async () => {
      const { data } = await supabase
        .from('property_images')
        .select('id,url,caption,is_primary,display_order')
        .eq('property_id', p.id)
        .order('display_order', { ascending: true })
      setImages((data ?? []) as PropertyImage[])
    })()
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const { error } = await supabase.from('properties').update({ ...form }).eq('id', editingId)
        if (error) throw error
        // sync videos: replace all
        const { error: delErr } = await supabase.from('property_videos').delete().eq('property_id', editingId)
        if (delErr) throw delErr
        const urls = videoUrls.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        if (urls.length) {
          const rows = urls.map(u => ({ property_id: editingId, url: u }))
          const { error: insErr } = await supabase.from('property_videos').insert(rows)
          if (insErr) throw insErr
        }
        // sync amenities
        const { data: current } = await supabase
          .from('property_amenities')
          .select('amenity_id')
          .eq('property_id', editingId)
        const currentIds = new Set((current ?? []).map((r: any) => r.amenity_id))
        const targetIds = new Set(selectedAmenityIds)
        const toInsert = [...targetIds].filter(id => !currentIds.has(id)).map(id => ({ property_id: editingId, amenity_id: id }))
        const toDelete = [...currentIds].filter(id => !targetIds.has(id))
        if (toInsert.length) {
          const { error: insA } = await supabase.from('property_amenities').insert(toInsert)
          if (insA) throw insA
        }
        if (toDelete.length) {
          const { error: delA } = await supabase.from('property_amenities').delete().eq('property_id', editingId).in('amenity_id', toDelete)
          if (delA) throw delA
        }
      } else {
        const { data, error } = await supabase.from('properties').insert([{ ...form }]).select('id').single()
        if (error) throw error
        const newId = data?.id as string
        const urls = videoUrls.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
        if (newId && urls.length) {
          const rows = urls.map(u => ({ property_id: newId, url: u }))
          const { error: insErr } = await supabase.from('property_videos').insert(rows)
          if (insErr) throw insErr
        }
        if (newId && selectedAmenityIds.length) {
          const rows = selectedAmenityIds.map(id => ({ property_id: newId, amenity_id: id }))
          const { error: insA } = await supabase.from('property_amenities').insert(rows)
          if (insA) throw insA
        }
      }
      await load()
      setEditingId(null)
      setForm({ ...emptyForm })
      setVideoUrls('')
      setSelectedAmenityIds([])
      setImages([])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Xóa bất động sản này?')) return
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  return (
    <div>
      <div className="h2">Quản lý Bất động sản</div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input className="input" placeholder="Từ khóa" value={q} onChange={e => setQ(e.target.value)} />
        <input className="input" placeholder="Thành phố" value={city} onChange={e => setCity(e.target.value)} />
        <input className="input" placeholder="Quận/Huyện" value={district} onChange={e => setDistrict(e.target.value)} />
        <button className="button" onClick={startCreate}>Thêm mới</button>
      </div>

      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      {/* Form */}
      <div className="card">
        <div className="h2" style={{ marginBottom: 8 }}>{editingId ? 'Sửa BĐS' : 'Thêm BĐS'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
          <input className="input" placeholder="Tiêu đề" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <select className="input" value={form.listing_type} onChange={e => setForm({ ...form, listing_type: e.target.value as Property['listing_type'] })}>
            <option value="sale">Bán</option>
            <option value="rent">Cho thuê</option>
            <option value="lease">Thuê mua</option>
          </select>
          <select className="input" value={form.status ?? 'available'} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="available">available</option>
            <option value="pending">pending</option>
            <option value="sold">sold</option>
            <option value="rented">rented</option>
            <option value="draft">draft</option>
          </select>
          <input className="input" type="number" placeholder="Giá" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          <input className="input" placeholder="Tiền tệ" value={form.currency ?? 'VND'} onChange={e => setForm({ ...form, currency: e.target.value })} />
          <select className="input" value={String(form.negotiable)} onChange={e => setForm({ ...form, negotiable: e.target.value === 'true' })}>
            <option value="true">Có thương lượng</option>
            <option value="false">Không thương lượng</option>
          </select>
          <input className="input" type="number" placeholder="Diện tích (m²)" value={form.area} onChange={e => setForm({ ...form, area: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Phòng ngủ" value={form.bedrooms ?? ''} onChange={e => setForm({ ...form, bedrooms: e.target.value === '' ? null : Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Phòng tắm" value={form.bathrooms ?? ''} onChange={e => setForm({ ...form, bathrooms: e.target.value === '' ? null : Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Số tầng" value={form.floors ?? ''} onChange={e => setForm({ ...form, floors: e.target.value === '' ? null : Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Tầng (nếu là căn hộ)" value={form.floor_number ?? ''} onChange={e => setForm({ ...form, floor_number: e.target.value === '' ? null : Number(e.target.value) })} />
          <input className="input" placeholder="Địa chỉ" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <input className="input" placeholder="Phường/Xã" value={form.ward ?? ''} onChange={e => setForm({ ...form, ward: e.target.value })} />
          <input className="input" placeholder="Quận/Huyện" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} />
          <input className="input" placeholder="Thành phố" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          <select className="input" value={form.project_id ?? ''} onChange={e => setForm({ ...form, project_id: e.target.value || null })}>
            <option value="">Không gắn dự án</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="input" value={String(form.featured)} onChange={e => setForm({ ...form, featured: e.target.value === 'true' })}>
            <option value="false">Không nổi bật</option>
            <option value="true">Nổi bật</option>
          </select>
          <select className="input" value={String(form.verified)} onChange={e => setForm({ ...form, verified: e.target.value === 'true' })}>
            <option value="false">Chưa xác thực</option>
            <option value="true">Đã xác thực</option>
          </select>
        </div>
        {/* Videos */}
        <div style={{ marginTop: 8 }}>
          <div className="small" style={{ marginBottom: 6 }}>Video URLs (mỗi dòng một URL YouTube/Vimeo/MP4)</div>
          <textarea className="input" rows={4} placeholder="https://www.youtube.com/watch?v=...\nhttps://.../video.mp4" value={videoUrls} onChange={e => setVideoUrls(e.target.value)} />
        </div>
        {/* Amenities */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2" style={{ marginBottom: 8 }}>Tiện ích</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
            {amenities.map(a => (
              <label key={a.id} className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedAmenityIds.includes(a.id)}
                  onChange={(e) => {
                    setSelectedAmenityIds(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))
                  }}
                />
                {a.name}
              </label>
            ))}
          </div>
        </div>
        {/* Images */}
        {editingId && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2" style={{ marginBottom: 8 }}>Hình ảnh</div>
            <UploadImage bucket="property-images" onUploaded={async (url) => {
              const maxOrder = Math.max(0, ...images.map(i => i.display_order ?? 0))
              const { data, error } = await supabase.from('property_images').insert([{ property_id: editingId, url, display_order: maxOrder + 1 }]).select('id,url,caption,is_primary,display_order').single()
              if (!error && data) setImages(prev => [...prev, data as PropertyImage])
            }} />
            <div className="grid" style={{ marginTop: 12 }}>
              {images.map(img => (
                <div key={img.id} className="card">
                  <img src={img.url} alt={img.caption ?? ''} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
                  <div className="small" style={{ marginTop: 6 }}>Thứ tự: {img.display_order ?? 0} {img.is_primary ? '• Ảnh chính' : ''}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="button" onClick={async () => {
                      // set as primary
                      await supabase.from('property_images').update({ is_primary: false }).eq('property_id', editingId)
                      const { error } = await supabase.from('property_images').update({ is_primary: true }).eq('id', img.id)
                      if (!error) setImages(prev => prev.map(i => ({ ...i, is_primary: i.id === img.id })))
                    }}>Đặt làm chính</button>
                    <button className="button secondary" onClick={async () => {
                      const { error } = await supabase.from('property_images').delete().eq('id', img.id)
                      if (!error) setImages(prev => prev.filter(i => i.id !== img.id))
                    }}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
            <div className="small">{p.listing_type.toUpperCase()} • {new Intl.NumberFormat('vi-VN').format(p.price)} {p.currency ?? 'VND'} • {p.status ?? 'available'}</div>
            <div className="small" style={{ marginTop: 6 }}>{p.area} m² • {p.bedrooms ?? '—'} PN • {p.bathrooms ?? '—'} WC</div>
            <div className="small" style={{ marginTop: 6 }}>{p.address}, {p.district}, {p.city}</div>
            {p.featured ? <div className="small" style={{ marginTop: 6, color: 'var(--accent)' }}>Nổi bật</div> : null}
            {p.verified ? <div className="small" style={{ marginTop: 6, color: '#059669' }}>Đã xác thực</div> : null}
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
