import { useState, useEffect } from 'react'
import { Card, Button, Input, Tag, Space, Modal, message, Dropdown, Select } from 'antd'
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  MoreOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { templateService } from '@/services/templateService'
import { tagService } from '@/services/tagService'
import { useNavigate } from 'react-router-dom'
import type { Template } from '@/types/template'
import type { MenuProps } from 'antd'

const { Search } = Input
const { Option } = Select

export default function Template() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tags, setTags] = useState<any[]>([])

  // 对话框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false)
  const [renameTemplateId, setRenameTemplateId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [tagModalVisible, setTagModalVisible] = useState(false)
  const [tagTemplateId, setTagTemplateId] = useState<number | null>(null)

  useEffect(() => {
    loadTemplates()
    loadTags()
  }, [keyword, selectedTags])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await templateService.getTemplates({
        keyword: keyword || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
      setTemplates(response.data || [])
    } catch (error) {
      console.error('加载模版失败:', error)
      message.error('加载模版失败')
    } finally {
      setLoading(false)
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

  const handleApply = async (template: Template) => {
    Modal.confirm({
      title: '应用模版',
      content:
        '应用此模版将替换当前作品的样式（背景、文字样式），元素和图片保持不变。是否继续？',
      onOk: async () => {
        try {
          const response = await templateService.applyTemplate(template.id)
          // 如果有打开的编辑器，应用模版
          // 否则提示用户先创建作品
          if (response.templateData) {
            navigate('/editor')
            message.success('模版应用成功，请在编辑器中查看')
          } else {
            message.warning('请先创建或打开一个作品')
          }
        } catch (error: any) {
          message.error(error.message || '应用模版失败')
        }
      },
    })
  }

  const handlePreview = (template: Template) => {
    Modal.info({
      title: template.name,
      width: 800,
      content: (
        <div>
          {template.thumbnailUrl ? (
            <img
              src={template.thumbnailUrl}
              alt={template.name}
              className="w-full"
            />
          ) : (
            <div className="text-center py-20">暂无预览图</div>
          )}
        </div>
      ),
    })
  }

  const handleRename = (template: Template) => {
    setRenameTemplateId(template.id)
    setRenameValue(template.name)
    setRenameModalVisible(true)
  }

  const handleRenameConfirm = async () => {
    if (!renameTemplateId || !renameValue.trim()) {
      message.warning('请输入模版名称')
      return
    }
    try {
      await templateService.updateTemplate(renameTemplateId, {
        name: renameValue.trim(),
      })
      message.success('重命名成功')
      setRenameModalVisible(false)
      setRenameTemplateId(null)
      setRenameValue('')
      loadTemplates()
    } catch (error: any) {
      message.error(error.message || '重命名失败')
    }
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此模版吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await templateService.deleteTemplate(id)
          message.success('删除成功')
          loadTemplates()
        } catch (error: any) {
          message.error(error.message || '删除失败')
        }
      },
    })
  }

  const handleAddTag = (template: Template) => {
    setTagTemplateId(template.id)
    setTagModalVisible(true)
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <div className="max-w-7xl mx-auto px-10 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">模版库</h1>
        </div>

        {/* 搜索区 */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <Space wrap>
            <Select
              mode="multiple"
              placeholder="标签筛选"
              style={{ width: 300 }}
              allowClear
              value={selectedTags}
              onChange={(value) => setSelectedTags(value)}
            >
              {tags.map((tag) => (
                <Option key={tag.id} value={tag.name}>
                  {tag.name}
                </Option>
              ))}
            </Select>
            <Search
              placeholder="搜索模版名称"
              allowClear
              style={{ width: 300 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={(value) => setKeyword(value)}
            />
          </Space>
        </div>

        {/* 模版列表 */}
        {loading ? (
          <div className="text-center py-20">加载中...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary">还没有模版</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-8">
            {templates.map((template) => {
              const menuItems: MenuProps['items'] = [
                {
                  key: 'preview',
                  label: '预览',
                  icon: <EyeOutlined />,
                  onClick: () => handlePreview(template),
                },
                {
                  key: 'rename',
                  label: '重命名',
                  icon: <EditOutlined />,
                  onClick: () => handleRename(template),
                },
                {
                  key: 'tag',
                  label: '添加标签',
                  icon: <TagOutlined />,
                  onClick: () => handleAddTag(template),
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDelete(template.id),
                },
              ]

              return (
                <Card
                  key={template.id}
                  hoverable
                  cover={
                    <div className="h-48 bg-background-gray flex items-center justify-center">
                      {template.thumbnailUrl ? (
                        <img
                          src={template.thumbnailUrl}
                          alt={template.name}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => handlePreview(template)}
                        />
                      ) : (
                        <span className="text-text-tertiary">暂无缩略图</span>
                      )}
                    </div>
                  }
                  actions={[
                    <Button
                      key="apply"
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleApply(template)}
                    >
                      应用
                    </Button>,
                    <Dropdown key="more" menu={{ items: menuItems }} trigger={['click']}>
                      <MoreOutlined />
                    </Dropdown>,
                  ]}
                >
                  <Card.Meta
                    title={template.name}
                    description={
                      <div className="mt-2">
                        <div className="text-xs text-text-secondary mb-2">
                          创建: {new Date(template.createdAt).toLocaleString('zh-CN')}
                        </div>
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <Tag
                                key={index}
                                color="blue"
                                className="cursor-pointer"
                                onClick={() => {
                                  if (!selectedTags.includes(tag)) {
                                    setSelectedTags([...selectedTags, tag])
                                  }
                                }}
                              >
                                {tag}
                              </Tag>
                            ))}
                            {template.tags.length > 3 && <Tag>...</Tag>}
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              )
            })}
          </div>
        )}

        {/* 重命名对话框 */}
        <Modal
          title="重命名模版"
          open={renameModalVisible}
          onOk={handleRenameConfirm}
          onCancel={() => {
            setRenameModalVisible(false)
            setRenameTemplateId(null)
            setRenameValue('')
          }}
        >
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="请输入模版名称"
            maxLength={50}
            onPressEnter={handleRenameConfirm}
          />
        </Modal>

        {/* 添加标签对话框 */}
        <Modal
          title="添加标签"
          open={tagModalVisible}
          onOk={() => {
            // 需要实现标签选择逻辑
            setTagModalVisible(false)
            setTagTemplateId(null)
          }}
          onCancel={() => {
            setTagModalVisible(false)
            setTagTemplateId(null)
          }}
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2">选择标签：</div>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择已有标签"
                options={tags.map((tag) => ({ label: tag.name, value: tag.id }))}
              />
            </div>
            <div>
              <div className="mb-2">新建标签：</div>
              <Input placeholder="输入新标签名称" maxLength={20} />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

