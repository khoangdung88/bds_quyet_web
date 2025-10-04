import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface PropertyItem {
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
  featured: boolean | null
  created_at: string
}

export default function PropertiesList() {
  const [items, setItems] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [listingType, setListingType] = useState('') // sale | rent | lease
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minArea, setMinArea] = useState<string>('')
  const [maxArea, setMaxArea] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select('id,title,listing_type,status,price,currency,area,bedrooms,bathrooms,address,ward,district,city,featured,created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) setError(error.message)
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return items.filter(p => {
      const key = `${p.title ?? ''} ${p.address ?? ''} ${p.district ?? ''} ${p.city ?? ''}`.toLowerCase()
      if (q && !key.includes(q.toLowerCase())) return false
      if (city && p.city?.toLowerCase() !== city.toLowerCase()) return false
      if (district && p.district?.toLowerCase() !== district.toLowerCase()) return false
      if (listingType && p.listing_type !== listingType) return false
      const price = Number(p.price || 0)
      const area = Number(p.area || 0)
      if (minPrice && price < Number(minPrice)) return false
      if (maxPrice && price > Number(maxPrice)) return false
      if (minArea && area < Number(minArea)) return false
      if (maxArea && area > Number(maxArea)) return false
      return true
    })
  }, [items, q, city, district, listingType, minPrice, maxPrice, minArea, maxArea])

  return (
    <div>
      <h1 className="h1">Danh sách bất động sản</h1>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <input className="input" placeholder="Tìm kiếm từ khóa" value={q} onChange={e => setQ(e.target.value)} />
        <input className="input" placeholder="Thành phố" value={city} onChange={e => setCity(e.target.value)} />
        <input className="input" placeholder="Quận/Huyện" value={district} onChange={e => setDistrict(e.target.value)} />
        <select className="input" value={listingType} onChange={e => setListingType(e.target.value)}>
          <option value="">Loại giao dịch</option>
          <option value="sale">Bán</option>
          <option value="rent">Cho thuê</option>
          <option value="lease">Thuê mua</option>
        </select>
        <input className="input" type="number" placeholder="Giá tối thiểu" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
        <input className="input" type="number" placeholder="Giá tối đa" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        <input className="input" type="number" placeholder="Diện tích tối thiểu" value={minArea} onChange={e => setMinArea(e.target.value)} />
        <input className="input" type="number" placeholder="Diện tích tối đa" value={maxArea} onChange={e => setMaxArea(e.target.value)} />
      </div>

      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      <div className="grid">
        {filtered.map(p => (
          <div key={p.id} className="card">
            <div className="h2" style={{ marginBottom: 6 }}>{p.title}</div>
            <div className="small">{p.listing_type?.toUpperCase()} • {new Intl.NumberFormat('vi-VN').format(p.price)} {p.currency ?? 'VND'}</div>
            <div className="small" style={{ marginTop: 6 }}>{p.area} m² • {p.bedrooms ?? '—'} PN • {p.bathrooms ?? '—'} WC</div>
            <div className="small" style={{ marginTop: 6 }}>{p.address}{p.ward ? `, ${p.ward}` : ''}, {p.district}, {p.city}</div>
            {p.status && <div className="small" style={{ marginTop: 6 }}>Trạng thái: {p.status}</div>}
            {p.featured ? <div className="small" style={{ marginTop: 6, color: '#45a29e' }}>Nổi bật</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
