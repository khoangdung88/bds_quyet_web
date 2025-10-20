import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import UploadImage from '../../components/UploadImage'
import AutoCompleteInput from '../../components/AutoCompleteInput'
import { fetchVNLocations, type VNProvince } from '../../lib/vnLocations'

// Webhook n8n để đăng Facebook (đặt trong .env: VITE_N8N_WEBHOOK_FB_POST)
const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_FB_POST as string | undefined

type Seller = {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  company: string | null
}

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
  property_type: 'house' | 'apartment' | 'land'
  sellers?: Seller[]
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
  verified: false,
  property_type: 'house'
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
  // Loại hình BĐS: nhà ở / chung cư / đất nền
  const [propertyType, setPropertyType] = useState<'nha_o' | 'chung_cu' | 'dat_nen'>('nha_o')

  // Dữ liệu địa giới hành chính VN
  const [provinces, setProvinces] = useState<VNProvince[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Property, 'id'>>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [videoUrls, setVideoUrls] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => (localStorage.getItem('admin_properties_view') as 'grid' | 'table') || 'grid')
  const [filterType, setFilterType] = useState<'all' | 'house' | 'apartment' | 'land'>('all')
  const [sellers, setSellers] = useState<Seller[]>([])
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([])
  const [loadingSellers, setLoadingSellers] = useState(false)

  type FbGroup = { id: string; name: string; group_id: string | null; is_active: boolean; kind: 'source' | 'target' }
  const [fbGroups, setFbGroups] = useState<FbGroup[]>([])
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [postingPropertyId, setPostingPropertyId] = useState<string | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [postMessage, setPostMessage] = useState<string>('')
  const [selectAllGroups, setSelectAllGroups] = useState<boolean>(true)
  const [posting, setPosting] = useState(false)

  // Tải danh sách sellers (người bán)
  const loadSellers = async () => {
    setLoadingSellers(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, company')
      .or('user_type.eq.seller,user_type.eq.agent')
      .order('full_name', { ascending: true })
    
    if (error) {
      console.error('Lỗi khi tải danh sách người bán:', error)
    } else {
      setSellers((data as Seller[]) || [])
    }
    setLoadingSellers(false)
  }

  // Tải danh sách sellers của một property
  const loadPropertySellers = async (propertyId: string) => {
    const { data, error } = await supabase
      .from('property_sellers')
      .select('profile_id')
      .eq('property_id', propertyId)
    
    if (error) {
      console.error('Lỗi khi tải người bán của BĐS:', error)
      return []
    }
    
    return data.map(item => item.profile_id)
  }

  const load = async () => {
    setLoading(true)
    try {
      // Tải dữ liệu song song
      const [
        { data: props, error: e1 },
        { data: projs, error: e2 },
        { data: ams, error: e3 }
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('id,title,listing_type,status,price,currency,negotiable,area,bedrooms,bathrooms,floors,floor_number,address,ward,district,city,featured,verified,project_id,property_type')
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
      
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      
      // Tải thông tin sellers cho từng property
      const propertiesWithSellers = await Promise.all(
        (props || []).map(async (prop: any) => {
          const sellerIds = await loadPropertySellers(prop.id)
          const propertySellers = sellers.filter(s => sellerIds.includes(s.id))
          return { ...prop, sellers: propertySellers }
        })
      )
      
      setItems(propertiesWithSellers as Property[])
      setProjects((projs || []) as Project[])
      setAmenities((ams || []) as Amenity[])
      
      // Tải danh sách sellers nếu chưa có
      if (sellers.length === 0) {
        loadSellers()
      }
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { localStorage.setItem('admin_properties_view', viewMode) }, [viewMode])

  const loadTargetGroups = async () => {
    const { data } = await supabase
      .from('fb_groups')
      .select('id,name,group_id,is_active,kind')
      .eq('kind', 'target')
      .eq('is_active', true)
      .order('name')
    const list = (data as any[] | null) || []
    setFbGroups(list as FbGroup[])
    const ids = list.map(g => g.group_id).filter(Boolean) as string[]
    setSelectedGroupIds(ids)
    setSelectAllGroups(true)
  }

  const openPostModal = async (p: Property) => {
    setPostingPropertyId(p.id)
    const msg = [
      p.title,
      `${new Intl.NumberFormat('vi-VN').format(p.price)} ${p.currency ?? 'VND'}`,
      `${p.area} m²`,
      [p.address, p.district, p.city].filter(Boolean).join(', ')
    ].filter(Boolean).join('\n')
    setPostMessage(msg)
    await loadTargetGroups()
    setPostModalOpen(true)
  }

  const toggleSelectAllGroups = (checked: boolean) => {
    setSelectAllGroups(checked)
    setSelectedGroupIds(checked ? (fbGroups.map(g => g.group_id).filter(Boolean) as string[]) : [])
  }

  const submitPostToFacebook = async () => {
    if (!postingPropertyId) return
    // Không bắt buộc chọn group ở frontend nữa; n8n sẽ tự lấy danh sách group từ Supabase
    if (!n8nWebhookUrl) {
      alert('Thiếu cấu hình webhook n8n: VITE_N8N_WEBHOOK_FB_POST')
      return
    }
    try {
      setPosting(true)
      const resp = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Gửi tối thiểu id BĐS; kèm message và groupIds (nếu muốn n8n ưu tiên dùng)
        body: JSON.stringify({ property_id: postingPropertyId, message: postMessage, groupIds: selectedGroupIds })
      })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(text || 'Webhook n8n trả về lỗi')
      }
      alert('Đã gửi yêu cầu đến n8n. Vui lòng kiểm tra lịch sử đăng sau ít phút.')
      // Không ghi log ở frontend nữa; n8n sẽ tự lưu vào bảng fb_published_posts
      setPostModalOpen(false)
      setPostingPropertyId(null)
    } catch (e: any) {
      alert(e?.message || 'Đăng thất bại')
    } finally {
      setPosting(false)
    }
  }

  // Tải danh sách tỉnh/thành - quận/huyện - phường/xã
  useEffect(() => {
    setLoadingLocations(true)
    fetchVNLocations()
      .then(data => setProvinces(data))
      .catch(() => {})
      .finally(() => setLoadingLocations(false))
  }, [])

  const filtered = useMemo(() => {
    return items.filter(p => {
      const key = `${p.title} ${p.address} ${p.district} ${p.city}`.toLowerCase()
      if (q && !key.includes(q.toLowerCase())) return false
      if (city && p.city?.toLowerCase() !== city.toLowerCase()) return false
      if (district && p.district?.toLowerCase() !== district.toLowerCase()) return false
      if (filterType !== 'all' && p.property_type !== filterType) return false
      return true
    })
    setShowForm(true)
  }, [items, q, city, district, filterType])

  // Options cho autocomplete theo dữ liệu đã chọn
  const cityOptions = useMemo(() => provinces.map(p => ({ label: p.Name, value: p.Code })), [provinces])
  const selectedProvince = useMemo(() => provinces.find(p => p.Name.toLowerCase() === (form.city || '').toLowerCase()), [provinces, form.city])
  const districtOptions = useMemo(() => {
    const d = selectedProvince?.Districts ?? []
    return d.map(x => ({ label: x.Name, value: x.Code }))
  }, [selectedProvince])
  const selectedDistrict = useMemo(() => selectedProvince?.Districts.find(d => d.Name.toLowerCase() === (form.district || '').toLowerCase()) || null, [selectedProvince, form.district])
  const wardOptions = useMemo(() => {
    const w = selectedDistrict?.Wards ?? []
    return w.map(x => ({ label: x.Name, value: x.Code }))
  }, [selectedDistrict])

  const startCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setPropertyType('nha_o'); setShowForm(true) }
  const startEdit = async (p: Property) => {
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
      verified: p.verified ?? false,
      property_type: p.property_type
    })
    // Đồng bộ state chọn loại hình từ DB
    setPropertyType(p.property_type === 'apartment' ? 'chung_cu' : p.property_type === 'land' ? 'dat_nen' : 'nha_o')
    
    // Tải dữ liệu liên quan
    try {
      // Tải dữ liệu song song
      const [
        { data: videos },
        { data: amenities },
        { data: images },
        sellerIds
      ] = await Promise.all([
        // Tải video
        supabase
          .from('property_videos')
          .select('url')
          .eq('property_id', p.id)
          .order('created_at', { ascending: true }),
        // Tải tiện ích
        supabase
          .from('property_amenities')
          .select('amenity_id')
          .eq('property_id', p.id),
        // Tải hình ảnh
        supabase
          .from('property_images')
          .select('id,url,caption,is_primary,display_order')
          .eq('property_id', p.id)
          .order('display_order', { ascending: true }),
        // Tải danh sách sellers
        loadPropertySellers(p.id)
      ])
      
      // Cập nhật state
      setVideoUrls((videos ?? []).map(v => v.url).join('\n'))
      setSelectedAmenityIds((amenities ?? []).map((r: any) => r.amenity_id))
      setImages((images ?? []) as PropertyImage[])
      setSelectedSellerIds(sellerIds)
      
      // Tải danh sách sellers nếu chưa có
      if (sellers.length === 0) {
        await loadSellers()
      }
      
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu bất động sản:', error)
      setError('Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.')
    }
  }

  // Cập nhật mối quan hệ nhiều-nhiều giữa property và sellers
  const updatePropertySellers = async (propertyId: string, sellerIds: string[]) => {
    // Xóa tất cả quan hệ cũ
    const { error: deleteError } = await supabase
      .from('property_sellers')
      .delete()
      .eq('property_id', propertyId)
    
    if (deleteError) throw deleteError
    
    // Nếu không có seller nào được chọn, không cần thêm mới
    if (sellerIds.length === 0) return
    
    // Thêm các quan hệ mới
    const { error: insertError } = await supabase
      .from('property_sellers')
      .insert(sellerIds.map(profile_id => ({
        property_id: propertyId,
        profile_id
      })))
    
    if (insertError) throw insertError
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const mappedType = propertyType === 'chung_cu' ? 'apartment' : propertyType === 'dat_nen' ? 'land' : 'house'
      const composedAddress = [form.ward, form.district, form.city].filter(Boolean).join(', ')
      const payload = { ...form, address: composedAddress, property_type: mappedType as Property['property_type'] }
      
      let propertyId = editingId
      
      if (editingId) {
        // Cập nhật thông tin cơ bản
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
          
        propertyId = editingId
      } else {
        // Tạo mới property
        const { data, error } = await supabase
          .from('properties')
          .insert([payload])
          .select('id')
          .single()
        if (error) throw error
        
        propertyId = data?.id
        if (!propertyId) throw new Error('Không thể tạo mới bất động sản')
      }
      
      // Cập nhật mối quan hệ với sellers
      await updatePropertySellers(propertyId, selectedSellerIds)
      
      // Cập nhật video (nếu có)
      const urls = videoUrls.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      if (urls.length) {
        // Xóa video cũ (nếu có)
        const { error: delErr } = await supabase
          .from('property_videos')
          .delete()
          .eq('property_id', propertyId)
        if (delErr) throw delErr
        
        // Thêm video mới
        const rows = urls.map(url => ({ property_id: propertyId, url }))
        const { error: insErr } = await supabase
          .from('property_videos')
          .insert(rows)
        if (insErr) throw insErr
      }
      
      // Cập nhật tiện ích
      if (selectedAmenityIds.length > 0) {
        // Lấy danh sách tiện ích hiện tại
        const { data: currentAmenities, error: ameError } = await supabase
          .from('property_amenities')
          .select('amenity_id')
          .eq('property_id', propertyId)
        
        if (ameError) throw ameError
        
        const currentAmeIds = new Set((currentAmenities || []).map((r: any) => r.amenity_id))
        const targetAmeIds = new Set(selectedAmenityIds)
        
        // Tìm các mục cần thêm mới
        const toInsert = [...targetAmeIds]
          .filter(id => !currentAmeIds.has(id))
          .map(amenity_id => ({
            property_id: propertyId,
            amenity_id
          }))
        
        // Tìm các mục cần xóa
        const toDelete = [...currentAmeIds].filter(id => !targetAmeIds.has(id))
        
        // Thực hiện thêm mới và xóa
        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from('property_amenities')
            .insert(toInsert)
          if (insErr) throw insErr
        }
        
        if (toDelete.length > 0) {
          const { error: delErr } = await supabase
            .from('property_amenities')
            .delete()
            .eq('property_id', propertyId)
            .in('amenity_id', toDelete)
          if (delErr) throw delErr
        }
      } else {
        // Nếu không có tiện ích nào được chọn, xóa tất cả
        const { error: delErr } = await supabase
          .from('property_amenities')
          .delete()
          .eq('property_id', propertyId)
        if (delErr) throw delErr
      }
      
      // Tải lại dữ liệu
      await load()
      
      // Đặt lại form
      setEditingId(null)
      setForm({ ...emptyForm })
      setVideoUrls('')
      setSelectedAmenityIds([])
      setSelectedSellerIds([])
      setImages([])
      setShowForm(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Xóa bất động sản này? Tất cả dữ liệu liên quan (hình ảnh, video, tiện ích, người bán) cũng sẽ bị xóa.')) return
    
    try {
      // Xóa tất cả dữ liệu liên quan trước khi xóa property
      const tables = [
        'property_images',
        'property_videos',
        'property_amenities',
        'property_sellers'
      ]
      
      // Xóa dữ liệu từ các bảng liên quan
      for (const table of tables) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('property_id', id)
        
        if (error) {
          console.error(`Lỗi khi xóa dữ liệu từ bảng ${table}:`, error)
          // Vẫn tiếp tục xử lý dù có lỗi
        }
      }
      
      // Cuối cùng xóa property
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Tải lại danh sách
      await load()
      
    } catch (error: any) {
      setError('Lỗi khi xóa bất động sản: ' + (error.message || 'Đã xảy ra lỗi'))
      console.error('Lỗi khi xóa bất động sản:', error)
    }
  }

  return (
    <div>
      <div className="h2">Quản lý Bất động sản</div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input className="input" placeholder="Từ khóa" value={q} onChange={e => setQ(e.target.value)} />
        <AutoCompleteInput
          className=""
          placeholder="Thành phố"
          value={city}
          onChange={(v) => { setCity(v); setDistrict('') }}
          options={cityOptions}
          disabled={loadingLocations}
        />
        <AutoCompleteInput
          className=""
          placeholder="Quận/Huyện"
          value={district}
          onChange={setDistrict}
          options={useMemo(() => {
            const prov = provinces.find(p => p.Name.toLowerCase() === (city || '').toLowerCase())
            return (prov?.Districts ?? []).map(d => ({ label: d.Name, value: d.Code }))
          }, [provinces, city])}
          disabled={!city || loadingLocations}
        />
        <select className="input" value={propertyType} onChange={e => setPropertyType(e.target.value as any)}>
          <option value="nha_o">Nhà ở</option>
          <option value="chung_cu">Chung cư</option>
          <option value="dat_nen">Đất nền</option>
        </select>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
          <option value="all">Lọc: Tất cả loại hình</option>
          <option value="house">Nhà ở</option>
          <option value="apartment">Chung cư</option>
          <option value="land">Đất nền</option>
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`button ${viewMode === 'grid' ? '' : 'secondary'}`} onClick={() => setViewMode('grid')}>Grid</button>
          <button className={`button ${viewMode === 'table' ? '' : 'secondary'}`} onClick={() => setViewMode('table')}>Table</button>
        </div>
        <button className="button secondary" onClick={() => {
          const rows = filtered.map(p => ({
            title: p.title,
            listing_type: p.listing_type,
            price: p.price,
            currency: p.currency ?? 'VND',
            area: p.area,
            property_type: p.property_type,
            location: `${p.ward ?? ''}, ${p.district}, ${p.city}`
          }))
          const header = Object.keys(rows[0] || { title:'', listing_type:'', price:'', currency:'', area:'', property_type:'', location:'' })
          const csv = [header.join(','), ...rows.map(r => header.map(h => `"${String((r as any)[h]).replace(/"/g,'""')}"`).join(','))].join('\n')
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'properties.csv'; a.click(); URL.revokeObjectURL(url)
        }}>Export CSV</button>
        <button className="button" onClick={startCreate}>Thêm mới</button>
      </div>

      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card">Lỗi: {error}</div>}

      {/* Form (ẩn mặc định) */}
      {showForm && (
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
          {/* Trường theo loại hình BĐS */}
          {propertyType !== 'dat_nen' && (
            <>
              <input className="input" type="number" placeholder="Phòng ngủ" value={form.bedrooms ?? ''} onChange={e => setForm({ ...form, bedrooms: e.target.value === '' ? null : Number(e.target.value) })} />
              <input className="input" type="number" placeholder="Phòng tắm" value={form.bathrooms ?? ''} onChange={e => setForm({ ...form, bathrooms: e.target.value === '' ? null : Number(e.target.value) })} />
            </>
          )}
          {propertyType === 'nha_o' && (
            <input className="input" type="number" placeholder="Số tầng" value={form.floors ?? ''} onChange={e => setForm({ ...form, floors: e.target.value === '' ? null : Number(e.target.value) })} />
          )}
          {propertyType === 'chung_cu' && (
            <input className="input" type="number" placeholder="Tầng (nếu là căn hộ)" value={form.floor_number ?? ''} onChange={e => setForm({ ...form, floor_number: e.target.value === '' ? null : Number(e.target.value) })} />
          )}
          <AutoCompleteInput
            placeholder="Phường/Xã"
            value={form.ward ?? ''}
            onChange={(v) => setForm({ ...form, ward: v })}
            options={wardOptions}
            disabled={!form.city || !form.district || loadingLocations}
          />
          <AutoCompleteInput
            placeholder="Quận/Huyện"
            value={form.district}
            onChange={(v) => setForm({ ...form, district: v, ward: '' })}
            options={districtOptions}
            disabled={!form.city || loadingLocations}
          />
          <AutoCompleteInput
            placeholder="Thành phố"
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v, district: '', ward: '' })}
            options={cityOptions}
            disabled={loadingLocations}
          />
          <select className="input" value={form.project_id ?? ''} onChange={e => setForm({ ...form, project_id: e.target.value || null })}>
            <option value="">Không gắn dự án</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          {/* Phần chọn người bán */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Người bán / Môi giới</label>
            {loadingSellers ? (
              <div>Đang tải danh sách người bán...</div>
            ) : (
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid var(--border, #e5e7eb)', 
                borderRadius: '4px', 
                padding: '8px',
                marginTop: '4px'
              }}>
                {sellers.length === 0 ? (
                  <div className="small" style={{ color: '#666', padding: '8px' }}>Không có người bán nào</div>
                ) : (
                  sellers.map(seller => (
                    <div key={seller.id} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedSellerIds.includes(seller.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSellerIds(prev => [...prev, seller.id])
                            } else {
                              setSelectedSellerIds(prev => prev.filter(id => id !== seller.id))
                            }
                          }}
                          style={{ marginRight: '8px' }}
                        />
                        <div>
                          <div>{seller.full_name || 'Chưa có tên'}</div>
                          <div className="small" style={{ color: '#666' }}>
                            {[seller.company, seller.email, seller.phone]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="small" style={{ color: '#666', marginTop: '4px' }}>
              Chọn một hoặc nhiều người bán/môi giới cho BĐS này
            </div>
          </div>
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
            <button className="button secondary" style={{ marginLeft: 8 }} onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(false) }}>Hủy</button>
          </div>
        </div>
      )}

      {/* List */}
      {viewMode === 'grid' ? (
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
                <button className="button" onClick={() => openPostModal(p)}>Đăng Facebook</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Tiêu đề</th>
                <th style={{ textAlign: 'left' }}>Loại tin</th>
                <th style={{ textAlign: 'left' }}>Giá</th>
                <th style={{ textAlign: 'left' }}>Diện tích</th>
                <th style={{ textAlign: 'left' }}>Địa điểm</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.listing_type}</td>
                  <td>{new Intl.NumberFormat('vi-VN').format(p.price)} {p.currency ?? 'VND'}</td>
                  <td>{p.area} m²</td>
                  <td>{p.address}, {p.district}, {p.city}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="button" onClick={() => startEdit(p)}>Sửa</button>
                      <button className="button secondary" onClick={() => remove(p.id)}>Xóa</button>
                      <button className="button" onClick={() => openPostModal(p)}>Đăng Facebook</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {postModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: 560, maxHeight: '80vh', overflow: 'auto' }}>
            <div className="h2">Đăng lên Facebook</div>
            <div className="small" style={{ marginBottom: 8 }}>Chọn group để đăng</div>
            <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={selectAllGroups} onChange={e => toggleSelectAllGroups(e.target.checked)} /> Chọn tất cả
            </label>
            <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 4, padding: 8, maxHeight: 200, overflow: 'auto', marginBottom: 8 }}>
              {fbGroups.length === 0 ? (
                <div className="small" style={{ color: '#666' }}>Chưa có group 'target' nào (đang bật)</div>
              ) : (
                fbGroups.map(g => (
                  <label key={g.id} className="small" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(g.group_id || '')}
                      onChange={e => {
                        const id = g.group_id || ''
                        if (!id) return
                        setSelectedGroupIds(prev => e.target.checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))
                        if (!e.target.checked) setSelectAllGroups(false)
                      }}
                    />
                    <span>{g.name} {g.group_id ? `(${g.group_id})` : ''}</span>
                  </label>
                ))
              )}
            </div>
            <div className="small" style={{ marginBottom: 6 }}>Nội dung bài đăng</div>
            <textarea className="input" rows={6} value={postMessage} onChange={e => setPostMessage(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="button" onClick={submitPostToFacebook} disabled={posting}>{posting ? 'Đang đăng...' : 'Đăng'}</button>
              <button className="button secondary" onClick={() => setPostModalOpen(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
