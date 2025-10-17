import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Profile = {
  id: string
  email?: string | null
  full_name?: string | null
  phone?: string | null
  user_type?: 'admin' | 'seller' | 'buyer' | 'agent' | null
  city?: string | null
  district?: string | null
  ward?: string | null
  address?: string | null
  avatar_url?: string | null
  bio?: string | null
  company?: string | null
  tax_code?: string | null
  verified?: boolean | null
  created_at?: string
  updated_at?: string
  // Các trường khác nếu có trong database
}

const USER_TYPES = [
  { value: 'buyer', label: 'Người mua' },
  { value: 'seller', label: 'Người bán' },
  { value: 'agent', label: 'Môi giới' },
  { value: 'admin', label: 'Quản trị viên' }
]

export default function AdminProfiles() {
  const [items, setItems] = useState<Profile[]>([])
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Define a type for the form data that matches our database columns
  type ProfileFormData = Partial<{
    email: string;
    full_name: string;
    phone: string;
    user_type: 'buyer' | 'seller' | 'admin' | 'agent';
    city: string;
    district: string;
    ward: string;
    address: string;
    bio: string;
    company: string;
    tax_code: string;
    verified: boolean;
  }>;
  
  // Initial form data with default values
  const initialFormData: ProfileFormData = {
    user_type: 'buyer',
    verified: false
  };
  
  const [formData, setFormData] = useState<ProfileFormData>(() => ({
    ...initialFormData
  }))

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      setError(error.message)
    } else {
      setItems((data ?? []) as Profile[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => 
    items.filter(p => `${p.full_name ?? ''} ${p.phone ?? ''} ${p.user_type ?? ''} ${p.email ?? ''} ${p.company ?? ''}`.toLowerCase().includes(q.toLowerCase())), 
    [items, q]
  )

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    
    // Create a new form data object with type-safe fields
    const updatedFormData: ProfileFormData = {
      user_type: (profile.user_type as 'buyer' | 'seller' | 'admin' | 'agent') || 'buyer',
      verified: profile.verified || false
    };
    
    // Add optional fields if they exist
    if (profile.email !== undefined && profile.email !== null) {
      updatedFormData.email = profile.email;
    }
    if (profile.full_name !== undefined && profile.full_name !== null) {
      updatedFormData.full_name = profile.full_name;
    }
    if (profile.phone !== undefined && profile.phone !== null) {
      updatedFormData.phone = profile.phone;
    }
    if (profile.city !== undefined && profile.city !== null) {
      updatedFormData.city = profile.city;
    }
    if (profile.district !== undefined && profile.district !== null) {
      updatedFormData.district = profile.district;
    }
    if (profile.ward !== undefined && profile.ward !== null) {
      updatedFormData.ward = profile.ward;
    }
    if (profile.address !== undefined && profile.address !== null) {
      updatedFormData.address = profile.address;
    }
    if (profile.bio !== undefined && profile.bio !== null) {
      updatedFormData.bio = profile.bio;
    }
    if (profile.company !== undefined && profile.company !== null) {
      updatedFormData.company = profile.company;
    }
    if (profile.tax_code !== undefined && profile.tax_code !== null) {
      updatedFormData.tax_code = profile.tax_code;
    }
    
    setFormData(updatedFormData);
    setIsEditing(true);
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ này?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Update the UI by removing the deleted item
      setItems(prevItems => prevItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Lỗi khi xóa hồ sơ:', error);
      setError('Có lỗi xảy ra khi xóa hồ sơ');
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target as HTMLInputElement;
    let value: string | boolean | null = '';
    
    if (type === 'checkbox') {
      value = (e.target as HTMLInputElement).checked;
    } else if (type === 'select-one') {
      value = (e.target as HTMLSelectElement).value;
    } else {
      value = e.target.value || '';
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      if (editingProfile) {
        // When updating, don't include email in the update
        const { email, ...updateData } = formData;
        const { error } = await supabase
          .from('profiles')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProfile.id);
        if (error) throw error;
      } else {
        // Email is now optional, no need to check
        const { error } = await supabase
          .from('profiles')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        if (error) throw error;
      }
      
      // Reset form with all required fields
      setIsEditing(false);
      setEditingProfile(null);
      setFormData({ ...initialFormData });
      
      // Reload the data
      await load();
    } catch (error: any) {
      console.error('Lỗi khi lưu hồ sơ:', error);
      setError(error.message || 'Có lỗi xảy ra khi lưu hồ sơ');
    }
  }

  return (
    <div>
      <div className="h2">Hồ sơ người dùng</div>
      
      {/* Search and Add New */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <input 
            className="input" 
            placeholder="Tìm kiếm theo tên, email, điện thoại..." 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            style={{ width: '100%' }}
          />
        </div>
        <button 
          className="button" 
          onClick={() => {
            setEditingProfile(null);
            setFormData({ ...initialFormData });
            setIsEditing(true);
          }}
        >
          + Thêm mới
        </button>
      </div>

      {/* Loading and Error States */}
      {loading && <div className="card">Đang tải...</div>}
      {error && <div className="card" style={{ color: 'red' }}>Lỗi: {error}</div>}

      {/* Edit/Add Form */}
      {isEditing && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>{editingProfile ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ mới'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>Họ và tên *</label>
                <input 
                  type="text" 
                  name="full_name" 
                  className="input" 
                  value={formData.full_name || ''} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div>
                <label>Email</label>
                <input 
                  type="email" 
                  name="email" 
                  className="input" 
                  value={formData.email || ''} 
                  disabled 
                />
              </div>
              
              <div>
                <label>Số điện thoại</label>
                <input 
                  type="tel" 
                  name="phone" 
                  className="input" 
                  value={formData.phone || ''} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div>
                <label>Loại người dùng *</label>
                <select 
                  name="user_type" 
                  className="input" 
                  value={formData.user_type || 'buyer'}
                  onChange={handleInputChange}
                  required
                >
                  {USER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label>Công ty</label>
                <input 
                  type="text" 
                  name="company" 
                  className="input" 
                  value={formData.company || ''} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div>
                <label>Mã số thuế</label>
                <input 
                  type="text" 
                  name="tax_code" 
                  className="input" 
                  value={formData.tax_code || ''} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div>
                <label>
                  <input 
                    type="checkbox" 
                    name="verified" 
                    checked={formData.verified || false} 
                    onChange={handleInputChange} 
                  />
                  &nbsp;Đã xác thực
                </label>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label>Địa chỉ</label>
              <input 
                type="text" 
                name="address" 
                className="input" 
                value={formData.address || ''} 
                onChange={handleInputChange} 
                placeholder="Số nhà, đường..."
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label>Giới thiệu</label>
              <textarea 
                name="bio" 
                className="input" 
                value={formData.bio || ''} 
                onChange={handleInputChange} 
                rows={3}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="button">
                {editingProfile ? 'Cập nhật' : 'Thêm mới'}
              </button>
              <button 
                type="button" 
                className="button secondary" 
                onClick={() => {
                  setIsEditing(false)
                  setEditingProfile(null)
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profiles List */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Tên</th>
              <th style={{ textAlign: 'left' }}>Email</th>
              <th style={{ textAlign: 'left' }}>Loại</th>
              <th style={{ textAlign: 'left' }}>Điện thoại</th>
              <th style={{ textAlign: 'left' }}>Công ty</th>
              <th style={{ textAlign: 'left' }}>Xác thực</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>
                  {loading ? 'Đang tải...' : 'Không tìm thấy hồ sơ nào'}
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.full_name || '—'}</div>
                    <div className="small" style={{ color: '#666' }}>ID: {p.id}</div>
                  </td>
                  <td>{p.email || '—'}</td>
                  <td>{USER_TYPES.find(t => t.value === p.user_type)?.label || p.user_type || '—'}</td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.company || '—'}</td>
                  <td>{p.verified ? '✔' : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="button small" 
                      onClick={() => handleEdit(p)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      Sửa
                    </button>
                    <button 
                      className="button small secondary" 
                      onClick={() => handleDelete(p.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
