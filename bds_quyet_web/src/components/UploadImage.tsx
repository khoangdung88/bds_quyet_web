import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function UploadImage({ bucket, onUploaded }: { bucket: 'project-logos' | 'property-images', onUploaded: (publicUrl: string) => void }) {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doUpload = async () => {
    if (!user || !file) return
    setUploading(true)
    setError(null)
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onUploaded(data.publicUrl)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input className="input" type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <button className="button secondary" onClick={doUpload} disabled={uploading || !file}>Tải ảnh</button>
      {error && <span className="small" style={{ color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
