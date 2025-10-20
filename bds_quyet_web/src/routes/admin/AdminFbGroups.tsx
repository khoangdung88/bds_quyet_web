import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Table, Card, Button, Space, Typography, Modal, Form, Input, Select, Switch, Popconfirm, message as antdMessage } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

type FbGroup = {
  id: string
  name: string
  group_id: string | null
  url: string | null
  kind: 'source' | 'target'
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export default function AdminFbGroups() {
  const [items, setItems] = useState<FbGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [q, setQ] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FbGroup | null>(null)
  const [form] = Form.useForm()

  const fetchItems = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true)
      setError(null)
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { count, error: countError } = await supabase
        .from('fb_groups')
        .select('*', { count: 'exact', head: true })
      if (countError) throw countError

      let query = supabase
        .from('fb_groups')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (q.trim()) {
        const term = `%${q.trim()}%`
        query = query.or(`name.ilike.${term},group_id.ilike.${term},url.ilike.${term},note.ilike.${term}`)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      setItems(data || [])
      setPagination(prev => ({ ...prev, current: page, pageSize, total: count || 0 }))
    } catch (e: any) {
      setError(e?.message || 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems(1, 10) }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ name: '', group_id: '', url: '', kind: 'source', is_active: true, note: '' })
    setModalOpen(true)
  }

  const openEdit = (record: FbGroup) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      group_id: record.group_id || '',
      url: record.url || '',
      kind: record.kind,
      is_active: !!record.is_active,
      note: record.note || ''
    })
    setModalOpen(true)
  }

  const submitForm = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      if (editing) {
        const { error } = await supabase
          .from('fb_groups')
          .update({
            name: values.name,
            group_id: values.group_id || null,
            url: values.url || null,
            kind: values.kind,
            is_active: !!values.is_active,
            note: values.note || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editing.id)
        if (error) throw error
        antdMessage.success('Đã cập nhật nhóm')
      } else {
        const { error } = await supabase
          .from('fb_groups')
          .insert({
            name: values.name,
            group_id: values.group_id || null,
            url: values.url || null,
            kind: values.kind,
            is_active: !!values.is_active,
            note: values.note || null
          })
        if (error) throw error
        antdMessage.success('Đã thêm nhóm')
      }
      setModalOpen(false)
      setEditing(null)
      fetchItems(pagination.current, pagination.pageSize)
    } catch (e: any) {
      if (e?.message) antdMessage.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteRecord = async (record: FbGroup) => {
    try {
      setLoading(true)
      const { error } = await supabase.from('fb_groups').delete().eq('id', record.id)
      if (error) throw error
      antdMessage.success('Đã xóa nhóm')
      fetchItems(pagination.current, pagination.pageSize)
    } catch (e: any) {
      if (e?.message) antdMessage.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnsType<FbGroup> = [
    {
      title: 'Tên nhóm',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <strong>{v}</strong>
    },
    {
      title: 'Loại',
      dataIndex: 'kind',
      key: 'kind',
      width: 120,
      render: (v: string) => <Text type="secondary">{v === 'source' ? 'Nguồn lấy dữ liệu' : 'Nhóm đăng bài'}</Text>
    },
    {
      title: 'Group ID',
      dataIndex: 'group_id',
      key: 'group_id',
      width: 160,
      render: (v: string | null) => <Text type="secondary">{v || '-'}</Text>
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 260,
      render: (v: string | null) => v ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : <Text type="secondary">-</Text>
    },
    {
      title: 'Kích hoạt',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 110,
      render: (v: boolean) => v ? 'Đang bật' : 'Tắt'
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (v: string | null) => <Text type="secondary">{v || '-'}</Text>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 170,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>Sửa</Button>
          <Popconfirm title="Xóa nhóm" description="Bạn chắc chắn muốn xóa?" okText="Xóa" cancelText="Hủy" onConfirm={() => deleteRecord(record)}>
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quản lý Facebook Groups</h1>
          <Text type="secondary">Quản lý 2 loại nhóm: nguồn (lấy dữ liệu) và đích (đăng bài)</Text>
        </div>
        <Space>
          <Input.Search allowClear placeholder="Tìm theo tên, ID, URL, ghi chú" onSearch={() => fetchItems(1, pagination.pageSize)} onChange={(e) => setQ(e.target.value)} style={{ width: 340 }} />
          <Button type="primary" onClick={openCreate}>Thêm nhóm</Button>
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
            showTotal: (total) => `Tổng cộng ${total} nhóm`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={(p) => fetchItems(p.current, p.pageSize)}
        />
      </Card>

      <Modal open={modalOpen} title={editing ? 'Sửa nhóm' : 'Thêm nhóm'} onCancel={() => setModalOpen(false)} onOk={submitForm} okText={editing ? 'Lưu' : 'Thêm'} cancelText="Hủy" destroyOnClose>
        <Form layout="vertical" form={form} preserve={false}>
          <Form.Item label="Tên nhóm" name="name" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
            <Input allowClear />
          </Form.Item>
          <Form.Item label="Loại nhóm" name="kind" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'source', label: 'Nguồn (lấy dữ liệu)' },
                { value: 'target', label: 'Đích (đăng bài)' }
              ]}
            />
          </Form.Item>
          <Form.Item label="Group ID" name="group_id">
            <Input allowClear />
          </Form.Item>
          <Form.Item label="URL" name="url">
            <Input allowClear />
          </Form.Item>
          <Form.Item label="Kích hoạt" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={4} allowClear />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
