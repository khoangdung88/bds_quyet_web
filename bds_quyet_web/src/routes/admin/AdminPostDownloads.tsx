import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Table, Card, Button, Space, Typography, Tooltip, Image, Modal, Form, Input, Popconfirm, message as antdMessage, Upload } from 'antd';
import { ReloadOutlined, FileOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const S3_BASE_URL = 'https://bds-quyet.s3.ap-southeast-2.amazonaws.com/';

type PostDownload = {
  id: string
  post_id: string | null
  media_urls: string[] | null
  media_files: string[] | null
  created_at: string | null
  updated_at: string | null
  message?: string | null
  created_time?: string | null
  has_media?: boolean | null
}

const { Text } = Typography

export default function AdminPostDownloads() {
  const [items, setItems] = useState<PostDownload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [q, setQ] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PostDownload | null>(null)
  const [form] = Form.useForm()
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<PostDownload | null>(null)
  const [mediaItems, setMediaItems] = useState<{ fileName: string }[]>([])

  const fetchItems = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true)
      setError(null)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Đếm tổng số bản ghi
      const { count, error: countError } = await supabase
        .from('postsdownload')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      // Lấy dữ liệu với phân trang
      const { data: downloads, error: fetchError } = await supabase
        .from('postsdownload')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (fetchError) throw fetchError

      setItems(downloads || [])
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total: count || 0,
      }))
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu:', error)
      setError(error.message || 'Đã xảy ra lỗi khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const presign = async (fileName: string, contentType: string) => {
    const res = await fetch('/api/s3/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, contentType })
    })
    if (!res.ok) throw new Error('Không lấy được presigned URL')
    return res.json() as Promise<{ url: string, key: string }>
  }

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const ts = Date.now()
    const pid = (editing?.post_id || 'post')
    const safePid = String(pid).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `post-${safePid}/${ts}-${Math.random().toString(36).slice(2,8)}.${ext}`
    const { url } = await presign(fileName, file.type || 'image/jpeg')
    const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file })
    if (!put.ok) throw new Error('Upload S3 thất bại')
    setMediaItems(list => [...list, { fileName }])
    antdMessage.success('Đã tải ảnh lên S3')
  }

  useEffect(() => {
    fetchItems(1, 10)
  }, [])

  const openEdit = (record: PostDownload) => {
    setEditing(record)
    form.setFieldsValue({
      post_id: record.post_id || '',
      message: record.message || '',
    })
    const arr = Array.isArray(record.media_urls) ? record.media_urls : []
    const items: { fileName: string }[] = arr.map((v: any) => {
      try {
        if (typeof v === 'string') {
          const s = v.trim()
          if (s.startsWith('{') && s.endsWith('}')) {
            const obj = JSON.parse(s)
            if (obj?.fileName) return { fileName: String(obj.fileName) }
          }
          if (s.startsWith('http://') || s.startsWith('https://')) {
            const base = s.split('/').pop() || s
            return { fileName: base }
          }
          return { fileName: s }
        }
        if (v && typeof v === 'object' && 'fileName' in v) return { fileName: String(v.fileName) }
      } catch {}
      return { fileName: '' }
    }).filter(x => !!x.fileName)
    setMediaItems(items)
    setEditOpen(true)
  }

  const submitEdit = async () => {
    try {
      const values = await form.validateFields()
      const mediaUrls: string[] = mediaItems.map(it => JSON.stringify({ fileName: it.fileName }))
      setLoading(true)
      const { error } = await supabase
        .from('postsdownload')
        .update({
          post_id: values.post_id || null,
          message: values.message || null,
          media_urls: mediaUrls.length ? mediaUrls : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing?.id || '')
      if (error) throw error
      antdMessage.success('Đã cập nhật bản ghi')
      setEditOpen(false)
      setEditing(null)
      fetchItems(pagination.current, pagination.pageSize)
    } catch (e: any) {
      if (e?.message) antdMessage.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteRecord = async (record: PostDownload) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('postsdownload')
        .delete()
        .eq('id', record.id)
      if (error) throw error
      antdMessage.success('Đã xóa bản ghi')
      fetchItems(pagination.current, pagination.pageSize)
    } catch (e: any) {
      if (e?.message) antdMessage.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<PostDownload> = [
    {
      title: 'Media',
      key: 'media',
      width: 520,
      render: (_, record) => {
        const urls = Array.isArray(record.media_urls) ? record.media_urls : []
        if (!urls.length) {
          return <Text type="secondary">Không có ảnh</Text>
        }
        const toUrl = (val: any): string => {
          try {
            // Object { fileName }
            if (val && typeof val === 'object') {
              if ('fileName' in val && val.fileName) {
                return S3_BASE_URL + String(val.fileName)
              }
            }

            if (typeof val === 'string') {
              let s = val.trim()

              // Nếu là URL đầy đủ
              if (s.startsWith('http://') || s.startsWith('https://')) return s

              // Nếu bị bọc dấu nháy kép toàn chuỗi
              if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                s = s.slice(1, -1)
              }

              // Thử parse JSON nếu là chuỗi JSON
              if (s.startsWith('{') && s.endsWith('}')) {
                try {
                  const obj = JSON.parse(s)
                  if (obj && obj.fileName) return S3_BASE_URL + String(obj.fileName)
                } catch {}

                // Regex bắt fileName từ chuỗi JSON không hợp lệ/escape
                const m = s.match(/"fileName"\s*:\s*"([^"]+)"/)
                if (m && m[1]) return S3_BASE_URL + m[1]
              }

              // Nếu là một path/URL rút gọn -> lấy basename
              if (s.includes('/')) {
                const base = s.split('/').pop() || s
                return S3_BASE_URL + base
              }

              // Fallback coi s là fileName
              return S3_BASE_URL + s
            }
          } catch {}
          return ''
        }
        return (
          <Image.PreviewGroup>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {urls.map((u, idx) => {
                const src = toUrl(u)
                if (!src) return null
                return (
                  <Image
                    key={idx}
                    src={src}
                    alt={`media-${idx}`}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                    fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'/>"
                  />
                )
              })}
            </div>
          </Image.PreviewGroup>
        )
      },
    },
    {
      title: 'Thông tin thêm',
      key: 'info',
      width: 260,
      render: (_, record) => {
        const shortMsg = (record.message || '')
        const display = shortMsg.length > 80 ? shortMsg.slice(0, 80) + '…' : shortMsg
        return (
          <div className="space-y-1" style={{ maxWidth: 240 }}>
            {shortMsg ? (
              <Tooltip title={shortMsg}>
                <Text type="secondary">{display}</Text>
              </Tooltip>
            ) : (
              <Text type="secondary">-</Text>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {record.created_time && (
                <Text type="secondary" className="text-xs">
                  {new Date(record.created_time).toLocaleString('vi-VN')}
                </Text>
              )}
              <Button size="small" onClick={() => { setDetailRecord(record); setDetailOpen(true) }}>
                Chi tiết
              </Button>
            </div>
          </div>
        )
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string | null) => (
        <Text type="secondary" className="text-xs">
          {date ? new Date(date).toLocaleString('vi-VN') : '-'}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa bản ghi"
            description="Bạn chắc chắn muốn xóa?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deleteRecord(record)}
          >
            <Button size="small" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <div className="p-4 text-red-600">
            <p className="font-medium">Lỗi khi tải dữ liệu</p>
            <p className="mt-2">{error}</p>
            <div className="mt-4">
              <Button 
                type="primary" 
                onClick={() => fetchItems(1, pagination.pageSize)}
                icon={<ReloadOutlined />}
              >
                Thử lại
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Lịch sử tải xuống</h1>
          <Text type="secondary">
            Tổng cộng: {pagination.total} bản ghi
          </Text>
        </div>
        <Space>
          <Button 
            type="primary" 
            onClick={() => fetchItems(1, pagination.pageSize)}
            loading={loading}
            icon={<ReloadOutlined />}
          >
            Làm mới
          </Button>
        </Space>
      </div>
      
      <Card>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Tổng cộng ${total} bản ghi`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={(pagination) => fetchItems(pagination.current, pagination.pageSize)}
          locale={{
            emptyText: (
              <div className="py-8 text-center">
                <FileOutlined style={{ fontSize: 48, color: '#bfbfbf', marginBottom: 16 }} />
                <p>Không có dữ liệu</p>
                <Text type="secondary">Chưa có lịch sử tải xuống nào</Text>
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title="Sửa bản ghi"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={submitEdit}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form layout="vertical" form={form} preserve={false}>
          <Form.Item label="post_id" name="post_id">
            <Input readOnly disabled />
          </Form.Item>
          <Form.Item label="message" name="message">
            <Input.TextArea rows={6} allowClear />
          </Form.Item>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Ảnh</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {mediaItems.map((it, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <Image
                  src={S3_BASE_URL + it.fileName}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover', borderRadius: 6 }}
                />
                <Button size="small" danger style={{ position: 'absolute', top: 4, right: 4 }} onClick={() => setMediaItems(list => list.filter((_, i) => i !== idx))}>Xóa</Button>
              </div>
            ))}
          </div>
          <Upload
            multiple
            accept="image/*"
            showUploadList={false}
            customRequest={async (options: any) => {
              const { file, onSuccess, onError } = options
              try {
                await handleUpload(file as File)
                onSuccess?.({}, file)
              } catch (e: any) {
                antdMessage.error(e?.message || 'Upload thất bại')
                onError?.(e)
              }
            }}
          >
            <Button>Thêm ảnh</Button>
          </Upload>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết bản ghi"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        onOk={() => setDetailOpen(false)}
        okText="Đóng"
        cancelButtonProps={{ style: { display: 'none' } }}
        destroyOnClose
      >
        {detailRecord && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <strong>Thời gian tạo:</strong>{' '}
              <Text type="secondary">
                {detailRecord.created_time ? new Date(detailRecord.created_time).toLocaleString('vi-VN') : '-'}
              </Text>
            </div>
            <div>
              <strong>Ghi chú:</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{detailRecord.message || '-'}</div>
            </div>
            <div>
              <strong>Media URLs:</strong>
              <div style={{ maxHeight: 220, overflow: 'auto', paddingRight: 6 }}>
                {(detailRecord.media_urls || []).map((u, i) => (
                  <div key={i} className="small" style={{ wordBreak: 'break-all' }}>{String(u)}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
