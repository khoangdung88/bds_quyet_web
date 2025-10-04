import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

interface Project {
  id: string
  name: string
  developer: string | null
  description: string | null
  address: string | null
  district: string | null
  city: string | null
  status: string | null
  total_units: number | null
  total_area: number | null
  hotline: string | null
  website: string | null
  logo_url: string | null
}

interface PropertyItem {
  id: string
  title: string
  price: number
  currency: string | null
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  district: string
  city: string
  listing_type: string
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [props, setProps] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      const [{ data: proj, error: e1 }, { data: list, error: e2 }] = await Promise.all([
        supabase
          .from('projects')
          .select('id,name,developer,description,address,district,city,status,total_units,total_area,hotline,website,logo_url')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('properties')
          .select('id,title,price,currency,area,bedrooms,bathrooms,address,district,city,listing_type')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
          .limit(50)
      ])
      if (e1) setError(e1.message)
      if (e2) setError(e2.message)
      setProject(proj ?? null)
      setProps(list ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="card">Đang tải...</div>
  if (error) return <div className="card">Lỗi: {error}</div>
  if (!project) return <div className="card">Không tìm thấy dự án</div>

  return (
    <div>
      <div className="card" style={{ display: 'flex', gap: 16 }}>
        {project.logo_url && (
          <img src={project.logo_url} alt={project.name} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
        )}
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>{project.name}</h1>
          <div className="small">{project.district ? `${project.district}, ` : ''}{project.city ?? ''}</div>
          <div className="small" style={{ marginTop: 6 }}>CĐT: {project.developer ?? '—'} | Trạng thái: {project.status ?? '—'}</div>
          <div className="small" style={{ marginTop: 6 }}>Tổng số căn: {project.total_units ?? '—'} | Tổng diện tích: {project.total_area ?? '—'} m²</div>
          <div className="small" style={{ marginTop: 6 }}>Hotline: {project.hotline ?? '—'} | Website: {project.website ? <a href={project.website} target="_blank" rel="noreferrer">{project.website}</a> : '—'}</div>
        </div>
      </div>

      {project.description && (
        <div className="card">
          <div className="h2">Giới thiệu</div>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{project.description}</div>
        </div>
      )}

      <div className="card">
        <div className="h2">Bất động sản thuộc dự án</div>
        {props.length === 0 && <div className="small" style={{ marginTop: 8 }}>Chưa có danh sách.</div>}
        <div className="grid" style={{ marginTop: 12 }}>
          {props.map((p) => (
            <div key={p.id} className="card">
              <div className="h2" style={{ marginBottom: 6 }}>{p.title}</div>
              <div className="small">{p.listing_type?.toUpperCase()} • {new Intl.NumberFormat('vi-VN').format(p.price)} {p.currency ?? 'VND'}</div>
              <div className="small" style={{ marginTop: 6 }}>{p.area} m² • {p.bedrooms ?? '—'} PN • {p.bathrooms ?? '—'} WC</div>
              <div className="small" style={{ marginTop: 6 }}>{p.address}, {p.district}, {p.city}</div>
              <div style={{ marginTop: 10 }}>
                <Link className="button secondary" to={`/properties`}>Xem thêm</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
