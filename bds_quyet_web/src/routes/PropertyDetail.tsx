import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

type Property = {
  id: string
  title: string
  listing_type: string
  status: string | null
  price: number
  currency: string | null
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  ward: string | null
  district: string
  city: string
  project_id: string | null
}

type Image = { id: string; url: string; caption: string | null; is_primary: boolean | null; display_order: number | null }

type Video = { url: string }

export default function PropertyDetail() {
  const { id } = useParams()
  const [prop, setProp] = useState<Property | null>(null)
  const [images, setImages] = useState<Image[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      const [pRes, imgRes, vidRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id,title,listing_type,status,price,currency,area,bedrooms,bathrooms,address,ward,district,city,project_id')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('property_images')
          .select('id,url,caption,is_primary,display_order')
          .eq('property_id', id)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true }),
        supabase
          .from('property_videos')
          .select('url')
          .eq('property_id', id)
      ])
      if (pRes.error) setError(pRes.error.message)
      if (imgRes.error) setError(imgRes.error.message)
      if (vidRes.error) setError(vidRes.error.message)
      setProp(pRes.data as Property | null)
      setImages((imgRes.data ?? []) as Image[])
      setVideos((vidRes.data ?? []) as Video[])
      setLoading(false)
    }
    load()
  }, [id])

  const renderVideo = (url: string) => {
    // Simple YouTube/Vimeo detection; fall back to HTML5 video
    try {
      const u = new URL(url)
      const host = u.hostname
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        const vid = u.searchParams.get('v') || u.pathname.replace('/', '')
        return (
          <iframe
            key={url}
            width="100%"
            height="360"
            src={`https://www.youtube.com/embed/${vid}`}
            title="Video"
            frameBorder={0}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ borderRadius: 10, border: '1px solid var(--border)' }}
          />
        )
      }
      if (host.includes('vimeo.com')) {
        const vid = u.pathname.split('/').filter(Boolean).pop()
        return (
          <iframe
            key={url}
            src={`https://player.vimeo.com/video/${vid}`}
            width="100%"
            height="360"
            frameBorder={0}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: 10, border: '1px solid var(--border)' }}
          />
        )
      }
    } catch {}
    return (
      <video key={url} controls style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }}>
        <source src={url} />
      </video>
    )
  }

  if (loading) return <div className="card">Đang tải...</div>
  if (error) return <div className="card">Lỗi: {error}</div>
  if (!prop) return <div className="card">Không tìm thấy bất động sản</div>

  const priceFmt = new Intl.NumberFormat('vi-VN').format(prop.price)

  return (
    <div>
      <div className="card">
        <div className="h1" style={{ marginBottom: 8 }}>{prop.title}</div>
        <div className="small">{prop.listing_type.toUpperCase()} • {priceFmt} {prop.currency ?? 'VND'} • {prop.status ?? 'available'}</div>
        <div className="small" style={{ marginTop: 8 }}>{prop.area} m² • {prop.bedrooms ?? '—'} PN • {prop.bathrooms ?? '—'} WC</div>
        <div className="small" style={{ marginTop: 8 }}>{prop.address}{prop.ward ? `, ${prop.ward}` : ''}, {prop.district}, {prop.city}</div>
        {prop.project_id && (
          <div style={{ marginTop: 10 }}>
            <Link className="button secondary" to={`/projects/${prop.project_id}`}>Xem dự án</Link>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="card">
          <div className="h2">Hình ảnh</div>
          <div className="grid" style={{ marginTop: 12 }}>
            {images.map(img => (
              <img key={img.id} src={img.url} alt={img.caption ?? ''} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="card">
          <div className="h2">Video</div>
          <div className="grid" style={{ marginTop: 12 }}>
            {videos.map(v => renderVideo(v.url))}
          </div>
        </div>
      )}
    </div>
  )
}
