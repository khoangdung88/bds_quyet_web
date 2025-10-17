import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Table, Card, Button, Space, Tag, Typography, Tooltip } from 'antd';
import { ReloadOutlined, FileOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

type PostDownload = {
  id: string
  post_id: string
  user_id: string
  media_urls: string[]
  media_files: string[]
  created_at: string
  updated_at: string
  message?: string | null
  created_time?: string | null
  has_media?: boolean | null
  post?: {
    title: string
  } | null
  user?: {
    email: string
  } | null
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

  const fetchItems = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true)
      setError(null)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Đếm tổng số bản ghi
      const { count, error: countError } = await supabase
        .from('postdownload')
        .select('*', { count: 'exact', head: true })

      if (countError) throw countError

      // Lấy dữ liệu với phân trang
      const { data: downloads, error: fetchError } = await supabase
        .from('postdownload')
        .select(`
          *,
          post:post_id (id, title),
          user:user_id (id, email)
        `)
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

  useEffect(() => {
    fetchItems(1, 10)
  }, [])

  const columns: ColumnsType<PostDownload> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Text copyable ellipsis style={{ maxWidth: 120 }}>
          {id?.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Bài viết',
      dataIndex: ['post', 'title'],
      key: 'post',
      width: 250,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.post?.title || 'Không có tiêu đề'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.post_id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Người dùng',
      dataIndex: ['user', 'email'],
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.user?.email || 'Ẩn danh'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {record.user_id}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thông tin thêm',
      key: 'info',
      width: 200,
      render: (_, record) => (
        <div className="space-y-1">
          {record.message && (
            <Tooltip title={record.message}>
              <div className="truncate max-w-xs">
                <Text type="secondary" ellipsis>
                  {record.message}
                </Text>
              </div>
            </Tooltip>
          )}
          {record.created_time && (
            <div className="text-xs text-gray-500">
              {new Date(record.created_time).toLocaleString('vi-VN')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Media',
      key: 'media',
      width: 120,
      render: (_, record) => (
        <div className="space-y-1">
          <Tooltip title={`${record.media_urls?.length || 0} URL media`}>
            <Tag color={record.media_urls?.length ? 'blue' : 'default'} className="w-full text-center">
              <FileOutlined /> {record.media_urls?.length || 0} URL
            </Tag>
          </Tooltip>
          <Tooltip title={`${record.media_files?.length || 0} file đã tải`}>
            <Tag color={record.media_files?.length ? 'green' : 'default'} className="w-full text-center">
              <FileOutlined /> {record.media_files?.length || 0} File
            </Tag>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => (
        <Text type="secondary" className="text-xs">
          {date ? new Date(date).toLocaleString('vi-VN') : '-'}
        </Text>
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
    </div>
  )
}
