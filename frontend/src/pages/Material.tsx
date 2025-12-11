import { useState, useEffect } from 'react'
import { Card, Tabs, Button, Upload, Space, Input, Select, Modal, message, Dropdown } from 'antd'
import {
  UploadOutlined,
  DeleteOutlined,
  MoreOutlined,
  TagOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { materialService } from '@/services/materialService'
import { folderService } from '@/services/folderService'
import { tagService } from '@/services/tagService'
import type { Material } from '@/types/material'
import type { MenuProps } from 'antd'

const { TabPane } = Tabs
const { Search } = Input
const { Option } = Select

export default function Material() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('image')
  const [keyword, setKeyword] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<number | undefined>()
  const [folders, setFolders] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadMaterials()
    loadFolders()
    loadTags()
  }, [activeTab, keyword, selectedFolder])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const response = await materialService.getMaterials({
        type: activeTab,
        keyword: keyword || undefined,
        folderId: selectedFolder,
      })
      setMaterials(response.data || [])
    } catch (error) {
      console.error('加载素材失败:', error)
      message.error('加载素材失败')
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      const response = await folderService.getFolders('material')
      setFolders(response || [])
    } catch (error) {
      console.error('加载文件夹失败:', error)
    }
  }

  const loadTags = async () => {
    try {
      const response = await tagService.getTags()
      setTags(response || [])
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      await materialService.uploadMaterial(file, activeTab)
      message.success('上传成功')
      loadMaterials()
    } catch (error: any) {
      message.error(error.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此素材吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await materialService.deleteMaterial(id)
          message.success('删除成功')
          loadMaterials()
        } catch (error: any) {
          message.error(error.message || '删除失败')
        }
      },
    })
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <div className="max-w-7xl mx-auto px-10 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">素材库</h1>
          <Upload
            beforeUpload={(file) => {
              handleUpload(file)
              return false
            }}
            showUploadList={false}
            accept="image/*"
          >
            <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
              上传素材
            </Button>
          </Upload>
        </div>

        {/* 搜索筛选区 */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <Space wrap>
            <Select
              placeholder="文件夹筛选"
              style={{ width: 200 }}
              allowClear
              value={selectedFolder}
              onChange={(value) => {
                setSelectedFolder(value)
              }}
            >
              <Option value={''}>全部</Option>
              {folders.map((folder) => (
                <Option key={folder.id} value={folder.id}>
                  {folder.name}
                </Option>
              ))}
            </Select>
            <Search
              placeholder="搜索素材名称"
              allowClear
              style={{ width: 300 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={(value) => setKeyword(value)}
            />
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="图片素材" key="image">
            {loading ? (
              <div className="text-center py-20">加载中...</div>
            ) : materials.length === 0 ? (
              <div className="text-center py-20 text-text-secondary">
                还没有图片素材
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-4">
                {materials.map((material) => {
                  const menuItems: MenuProps['items'] = [
                    {
                      key: 'edit',
                      label: '编辑',
                      icon: <EditOutlined />,
                    },
                    {
                      key: 'tag',
                      label: '打标签',
                      icon: <TagOutlined />,
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'delete',
                      label: '删除',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: () => handleDelete(material.id),
                    },
                  ]

                  return (
                    <Card
                      key={material.id}
                      hoverable
                      cover={
                        <div className="h-32 bg-background-gray flex items-center justify-center">
                          <img
                            src={material.fileUrl}
                            alt={material.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      }
                      actions={[
                        <Dropdown key="more" menu={{ items: menuItems }} trigger={['click']}>
                          <MoreOutlined />
                        </Dropdown>,
                      ]}
                    >
                      <Card.Meta title={material.name} />
                    </Card>
                  )
                })}
              </div>
            )}
          </TabPane>
          <TabPane tab="文字素材" key="text">
            <div className="text-center py-20 text-text-secondary">
              文字素材功能开发中...
            </div>
          </TabPane>
          <TabPane tab="背景素材" key="background">
            <div className="text-center py-20 text-text-secondary">
              背景素材功能开发中...
            </div>
          </TabPane>
          <TabPane tab="元素素材" key="element">
            <div className="text-center py-20 text-text-secondary">
              元素素材功能开发中...
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  )
}

