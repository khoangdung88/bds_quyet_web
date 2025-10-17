import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Button, Table, Image, Space, Alert, Typography, Card } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface MediaFile {
  fileName: string;
  [key: string]: any;
}

interface PostDownloadData {
  id: number;
  post_id: number | null;
  user_id: string | null;
  media_urls: string[];
  created_at: string;
  updated_at: string;
  mediaFiles: MediaFile[];
}

const S3_BASE_URL = 'https://bds-quyet.s3.ap-southeast-2.amazonaws.com/';
const { Text } = Typography;

// Hàm xử lý lỗi khi parse JSON
const safeJsonParse = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse JSON:', jsonString, e);
    return null;
  }
};

export default function AdminPostDownloads() {
  const [data, setData] = useState<PostDownloadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [availableTables, setAvailableTables] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Bắt đầu lấy dữ liệu từ bảng postsdownload...');
      
      // 1. Kiểm tra xem bảng có tồn tại không
      const { data: tablesData, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (tablesError) {
        console.error('Lỗi khi kiểm tra bảng:', tablesError);
        throw new Error('Không thể kiểm tra danh sách bảng');
      }
      
      const tableNames = tablesData?.map(t => t.tablename) || [];
      setAvailableTables(tableNames);
      console.log('Các bảng có sẵn:', tableNames);
      
      if (!tableNames.includes('postsdownload')) {
        throw new Error('Bảng "postsdownload" không tồn tại trong cơ sở dữ liệu');
      }
      
      // 2. Lấy thông tin cấu trúc bảng
      const { data: tableInfoData } = await supabase
        .rpc('get_table_info', { table_name: 'postsdownload' })
        .single();
      
      if (tableInfoData) {
        console.log('Cấu trúc bảng postsdownload:', tableInfoData);
        setTableInfo(tableInfoData);
      }
      
      // 3. Lấy dữ liệu từ bảng
      console.log('Đang truy vấn dữ liệu...');
      const { data: downloads, error: fetchError, count } = await supabase
        .from('postsdownload')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('Kết quả truy vấn:', {
        hasData: !!downloads,
        count: count || 0,
        error: fetchError
      });

      if (fetchError) {
        console.error('Lỗi khi lấy dữ liệu:', fetchError);
        throw fetchError;
      }
      
      console.log('Dữ liệu thô từ database:', downloads);

      if (!downloads || downloads.length === 0) {
        console.log('Không tìm thấy dữ liệu trong bảng postsdownload');
        setData([]);
        return;
      }

      // 4. Xử lý dữ liệu tải về
      const formattedData: PostDownloadData[] = [];

      for (const download of downloads) {
        try {
          const mediaFiles: MediaFile[] = [];
          const mediaUrls = Array.isArray(download.media_urls) 
            ? download.media_urls 
            : (download.media_urls ? [download.media_urls] : []);

          for (const url of mediaUrls) {
            try {
              if (!url) continue;
              
              let parsed;
              if (typeof url === 'string' && url.trim().startsWith('{')) {
                parsed = safeJsonParse(url);
              } else if (typeof url === 'object') {
                parsed = url;
              }
              
              if (parsed?.fileName) {
                mediaFiles.push({
                  fileName: parsed.fileName
                });
              } else if (typeof url === 'string') {
                // Nếu không phải JSON, thử xử lý như một URL
                const fileName = url.split('/').pop();
                if (fileName) {
                  mediaFiles.push({
                    fileName: fileName
                  });
                }
              }
            } catch (e) {
              console.error('Lỗi khi xử lý URL:', url, e);
            }
          }

          formattedData.push({
            id: download.id,
            post_id: download.post_id || null,
            user_id: download.user_id || null,
            media_urls: mediaUrls,
            created_at: download.created_at || new Date().toISOString(),
            updated_at: download.updated_at || new Date().toISOString(),
            mediaFiles
          });
        } catch (e) {
          console.error('Lỗi khi xử lý bản ghi:', download, e);
        }
      }

      console.log('Dữ liệu đã xử lý:', formattedData);
      setData(formattedData);
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu tải xuống:', error);
      setError(error.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hiển thị thông tin lỗi chi tiết
  if (error) {
    return (
      <div className="p-4">
        <Alert
          type="error"
          message="Lỗi khi tải dữ liệu"
          description={
            <div>
              <p>{error}</p>
              {availableTables.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold">Các bảng có sẵn trong database:</p>
                  <ul className="list-disc pl-5 mt-2">
                    {availableTables.map(table => (
                      <li key={table} className="font-mono">{table}</li>
                    ))}
                  </ul>
                </div>
              )}
              {tableInfo && (
                <div className="mt-4">
                  <p className="font-semibold">Cấu trúc bảng postsdownload:</p>
                  <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto">
                    {JSON.stringify(tableInfo, null, 2)}
                  </pre>
                </div>
              )}
              <div className="mt-4">
                <Button 
                  type="primary" 
                  onClick={loadData}
                  icon={<ReloadOutlined />}
                >
                  Thử lại
                </Button>
              </div>
            </div>
          }
          className="mb-4"
        />
      </div>
    );
  }

  const columns: ColumnsType<PostDownloadData> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center' as const,
      render: (id: number) => <Text strong>{id}</Text>,
    },
    {
      title: 'Bài viết',
      dataIndex: 'post_id',
      key: 'post_id',
      width: 100,
      align: 'center' as const,
      render: (postId: number | null) => (
        <Text type="secondary" copyable>
          {postId || '-'}
        </Text>
      ),
    },
    {
      title: 'Người dùng',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      render: (userId: string | null) => (
        <Text 
          ellipsis={{ tooltip: userId || '' }}
          style={{ 
            fontFamily: 'monospace',
            maxWidth: 200,
            display: 'inline-block'
          }}
          copyable={!!userId}
        >
          {userId || '-'}
        </Text>
      ),
    },
    {
      title: 'Tệp đính kèm',
      key: 'mediaFiles',
      width: 300,
      render: (_, record) => {
        if (!record.mediaFiles || record.mediaFiles.length === 0) {
          return <Text type="secondary">Không có tệp</Text>;
        }
        
        return (
          <Space size="small" wrap>
            {record.mediaFiles.map((file, index) => {
              const imageUrl = `${S3_BASE_URL}${file.fileName}`;
              const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => 
                file.fileName.toLowerCase().endsWith(ext)
              );

              return (
                <div 
                  key={index} 
                  className="relative group"
                  style={{ 
                    width: 100, 
                    marginBottom: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0',
                    backgroundColor: '#fafafa',
                  }}
                >
                  {isImage ? (
                    <Image
                      src={imageUrl}
                      alt={`Tệp ${index + 1}`}
                      width={100}
                      height={100}
                      style={{ 
                        objectFit: 'cover',
                        aspectRatio: '1/1',
                      }}
                      preview={{
                        src: imageUrl,
                        mask: <span>Xem ảnh</span>,
                      }}
                    />
                  ) : (
                    <div 
                      style={{
                        width: 100,
                        height: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f0f0f0',
                      }}
                    >
                      <Text type="secondary" ellipsis style={{ maxWidth: 90 }}>
                        {file.fileName.split('/').pop()}
                      </Text>
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <a 
                      href={imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                </div>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : '-',
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('vi-VN') : '-',
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Danh sách tải xuống</h1>
        <Button 
          type="primary" 
          onClick={loadData} 
          loading={loading}
          icon={<ReloadOutlined />}
        >
          Làm mới
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `Tổng cộng: ${total} mục`
          }}
          locale={{
            emptyText: 'Không có dữ liệu'
          }}
        />
      </div>
    </div>
  );
}
