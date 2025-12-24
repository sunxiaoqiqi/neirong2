import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  Input,
  Select,
  Tag,
  Space,
  Pagination,
  Statistic,
  Row,
  Col,
  Modal,
  Input as AntInput,
  Checkbox,
  Dropdown,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  MoreOutlined,
  FolderOutlined,
  TagOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { workService } from '@/services/workService'
import { aiService, type AIStats } from '@/services/aiService'
import { folderService } from '@/services/folderService'
import { tagService } from '@/services/tagService'
import type { Work } from '@/types/work'
import type { MenuProps } from 'antd'

const { Search } = Input
const { Option } = Select

export default function Home() {
  console.log('Home 组件函数执行')
  const navigate = useNavigate()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [aiStats, setAiStats] = useState<AIStats | null>(null)
  const [aiStatsLoading, setAiStatsLoading] = useState(false)

  // 筛选条件
  const [selectedFolder, setSelectedFolder] = useState<number | undefined>()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 文件夹和标签数据
  const [folders, setFolders] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [selectedWorks, setSelectedWorks] = useState<number[]>([])

  // 对话框状态
  const [renameModalVisible, setRenameModalVisible] = useState(false)
  const [renameWorkId, setRenameWorkId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [moveWorkId, setMoveWorkId] = useState<number | null>(null)
  const [tagModalVisible, setTagModalVisible] = useState(false)
  const [tagWorkId, setTagWorkId] = useState<number | null>(null)

  useEffect(() => {
    console.log('Home 组件挂载，开始加载数据...')
    loadWorks()
    loadAIStats()
    loadFolders()
    loadTags()
  }, [currentPage, selectedFolder, selectedTags, keyword, sortBy, sortOrder])

  const loadWorks = async () => {
    setLoading(true)
    try {
      console.log('开始加载作品列表...')
      const response = await workService.getWorks({
        page: currentPage,
        pageSize,
        folderId: selectedFolder,
        tags: selectedTags,
        keyword: keyword || undefined,
      })
      console.log('作品列表加载成功:', response)
      setWorks(response.data || [])
      setTotal(response.total || 0)
    } catch (error: any) {
      console.error('加载作品失败:', error)
      console.error('错误详情:', error.message, error.response)
      message.error(`加载作品失败: ${error.message || '请检查后端服务是否启动'}`)
      // 即使失败也设置空数组，确保页面能显示
      setWorks([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadAIStats = async () => {
    setAiStatsLoading(true)
    try {
      console.log('开始加载AI统计...')
      const response = await aiService.getStats()
      console.log('AI统计加载成功:', response)
      setAiStats(response.data)
    } catch (error: any) {
      console.error('加载AI统计失败:', error)
      console.error('错误详情:', error.message, error.response)
      // AI统计失败不影响主页面显示
    } finally {
      setAiStatsLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      console.log('开始加载文件夹...')
      const response = await folderService.getFolders('work')
      console.log('文件夹加载成功:', response)
      setFolders(response || [])
    } catch (error: any) {
      console.error('加载文件夹失败:', error)
      console.error('错误详情:', error.message, error.response)
      setFolders([])
    }
  }

  const loadTags = async () => {
    try {
      console.log('开始加载标签...')
      const response = await tagService.getTags()
      console.log('标签加载成功:', response)
      setTags(response || [])
    } catch (error: any) {
      console.error('加载标签失败:', error)
      console.error('错误详情:', error.message, error.response)
      setTags([])
    }
  }

  const handleCreate = () => {
    navigate('/editor')
  }

  const handleEdit = (id: number) => {
    navigate(`/editor/${id}`)
  }

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此作品吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await workService.deleteWork(id)
          message.success('删除成功')
          loadWorks()
        } catch (error: any) {
          message.error(error.message || '删除失败')
        }
      },
    })
  }

  const handleRename = (work: Work) => {
    setRenameWorkId(work.id)
    setRenameValue(work.name)
    setRenameModalVisible(true)
  }

  const handleRenameConfirm = async () => {
    if (!renameWorkId || !renameValue.trim()) {
      message.warning('请输入作品名称')
      return
    }
    try {
      await workService.updateWork(renameWorkId, { name: renameValue.trim() })
      message.success('重命名成功')
      setRenameModalVisible(false)
      setRenameWorkId(null)
      setRenameValue('')
      loadWorks()
    } catch (error: any) {
      message.error(error.message || '重命名失败')
    }
  }

  const handleMove = (work: Work) => {
    setMoveWorkId(work.id)
    setMoveModalVisible(true)
  }

  const handleMoveConfirm = async (folderId?: number) => {
    if (!moveWorkId) return
    try {
      await workService.updateWork(moveWorkId, { folderId: folderId || null })
      message.success('移动成功')
      setMoveModalVisible(false)
      setMoveWorkId(null)
      loadWorks()
    } catch (error: any) {
      message.error(error.message || '移动失败')
    }
  }

  const handleAddTag = (work: Work) => {
    setTagWorkId(work.id)
    setTagModalVisible(true)
  }

  const handleTagConfirm = async (selectedTagIds: number[]) => {
    if (!tagWorkId) return
    try {
      const work = works.find((w) => w.id === tagWorkId)
      if (work) {
        const tagNames = tags.filter((t) => selectedTagIds.includes(t.id)).map((t) => t.name)
        await workService.updateWork(tagWorkId, {
          tags: [...(work.tags || []), ...tagNames],
        })
        message.success('标签添加成功')
        setTagModalVisible(false)
        setTagWorkId(null)
        loadWorks()
      }
    } catch (error: any) {
      message.error(error.message || '添加标签失败')
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await workService.duplicateWork(id)
      message.success('复制成功')
      loadWorks()
    } catch (error: any) {
      message.error(error.message || '复制失败')
    }
  }

  const handleBatchDelete = () => {
    if (selectedWorks.length === 0) {
      message.warning('请选择要删除的作品')
      return
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedWorks.length} 个作品吗？删除后不可恢复。`,
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await Promise.all(selectedWorks.map((id) => workService.deleteWork(id)))
          message.success('批量删除成功')
          setSelectedWorks([])
          loadWorks()
        } catch (error: any) {
          message.error(error.message || '批量删除失败')
        }
      },
    })
  }

  console.log('Home 组件渲染，当前状态:', {
    works: works.length,
    loading,
    folders: folders.length,
    tags: tags.length,
    aiStats: aiStats !== null,
  })

  return (
    <div className="min-h-screen bg-background-gray" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      {/* 调试信息 */}
      <div style={{ padding: '10px', backgroundColor: '#fff3cd', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ffc107' }}>
        <p style={{ margin: 0, fontSize: '12px' }}>调试: Home 组件已渲染 | 作品数: {works.length} | 加载中: {loading ? '是' : '否'}</p>
      </div>
      <div className="max-w-7xl mx-auto px-10 py-8">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">我的作品</h1>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            className="bg-primary hover:bg-primary-light"
          >
            新建作品
          </Button>
        </div>

        {/* AI使用统计 */}
        {aiStats && (
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex items-center mb-4">
              <RobotOutlined className="text-2xl text-primary mr-2" />
              <h2 className="text-xl font-semibold text-text-primary">通义千问 AI 使用统计</h2>
            </div>
            
            {/* 总体统计 */}
            <Row gutter={16} className="mb-6">
              <Col span={6}>
                <Statistic
                  title="总调用次数"
                  value={aiStats.total.count}
                  suffix="次"
                  loading={aiStatsLoading}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="输入 Token"
                  value={aiStats.total.inputTokens}
                  suffix="tokens"
                  loading={aiStatsLoading}
                  valueStyle={{ color: '#3B82F6' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="输出 Token"
                  value={aiStats.total.outputTokens}
                  suffix="tokens"
                  loading={aiStatsLoading}
                  valueStyle={{ color: '#10B981' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="总 Token"
                  value={aiStats.total.totalTokens}
                  suffix="tokens"
                  loading={aiStatsLoading}
                  valueStyle={{ color: '#F59E0B' }}
                />
              </Col>
            </Row>

            {/* 按模型统计 */}
            <div className="mb-4">
              <h3 className="text-lg font-medium text-text-primary mb-3">按模型统计</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiStats.byModel.map((modelStat) => (
                  <Card key={modelStat.model} size="small" className="bg-background-gray">
                    <div className="font-semibold text-text-primary mb-2">{modelStat.model}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">调用次数:</span>
                        <span className="font-medium">{modelStat.count} 次</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">输入 Token:</span>
                        <span className="font-medium text-info">{modelStat.inputTokens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">输出 Token:</span>
                        <span className="font-medium text-success">{modelStat.outputTokens}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-text-secondary">总 Token:</span>
                        <span className="font-medium text-warning">{modelStat.totalTokens}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 按类型统计 */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-3">按功能类型统计</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiStats.byType.map((typeStat) => (
                  <Card key={typeStat.type} size="small" className="bg-background-gray">
                    <div className="font-semibold text-text-primary mb-2">
                      {typeStat.type === 'text-rewrite' ? '文案改写' : 'AI生图'}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">调用次数:</span>
                        <span className="font-medium">{typeStat.count} 次</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">输入 Token:</span>
                        <span className="font-medium text-info">{typeStat.inputTokens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">输出 Token:</span>
                        <span className="font-medium text-success">{typeStat.outputTokens}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-text-secondary">总 Token:</span>
                        <span className="font-medium text-warning">{typeStat.totalTokens}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 搜索筛选区 */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
          <Space size="large" className="w-full" wrap>
            <Select
              placeholder="文件夹筛选"
              style={{ width: 200 }}
              allowClear
              value={selectedFolder}
              onChange={(value) => {
                setSelectedFolder(value)
                setCurrentPage(1)
              }}
            >
              <Option value={''}>全部</Option>
              {folders.map((folder) => (
                <Option key={folder.id} value={folder.id}>
                  {folder.name}
                </Option>
              ))}
            </Select>
            <Select
              mode="multiple"
              placeholder="标签筛选"
              style={{ width: 300 }}
              allowClear
              value={selectedTags}
              onChange={(value) => {
                setSelectedTags(value)
                setCurrentPage(1)
              }}
            >
              {tags.map((tag) => (
                <Option key={tag.id} value={tag.name}>
                  {tag.name}
                </Option>
              ))}
            </Select>
            <Search
              placeholder="搜索作品名称"
              allowClear
              style={{ width: 300 }}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setCurrentPage(1)
              }}
              onSearch={(value) => {
                setKeyword(value)
                setCurrentPage(1)
              }}
            />
            <Select
              placeholder="排序"
              style={{ width: 150 }}
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [by, order] = value.split('-')
                setSortBy(by)
                setSortOrder(order as 'asc' | 'desc')
                setCurrentPage(1)
              }}
            >
              <Option value="updatedAt-desc">修改时间 ↓</Option>
              <Option value="updatedAt-asc">修改时间 ↑</Option>
              <Option value="createdAt-desc">创建时间 ↓</Option>
              <Option value="createdAt-asc">创建时间 ↑</Option>
              <Option value="name-asc">名称 ↑</Option>
              <Option value="name-desc">名称 ↓</Option>
            </Select>
          </Space>
        </div>

        {/* 作品列表 */}
        {loading ? (
          <div className="text-center py-20">加载中...</div>
        ) : works.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary mb-4">还没有作品，点击创建新作品开始吧！</p>
            <Button type="primary" size="large" onClick={handleCreate}>
              创建新作品
            </Button>
          </div>
        ) : (
          <>
            {/* 批量操作栏 */}
            {selectedWorks.length > 0 && (
              <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <Space>
                  <span>已选择 {selectedWorks.length} 个作品</span>
                  <Button size="small">批量移动</Button>
                  <Button size="small">批量添加标签</Button>
                  <Button size="small" danger onClick={handleBatchDelete}>
                    批量删除
                  </Button>
                  <Button size="small" onClick={() => setSelectedWorks([])}>
                    取消选择
                  </Button>
                </Space>
              </div>
            )}

            <div className="grid grid-cols-4 gap-8 mb-8">
              {works.map((work) => {
                const menuItems: MenuProps['items'] = [
                  {
                    key: 'rename',
                    label: '重命名',
                    icon: <EditOutlined />,
                    onClick: () => handleRename(work),
                  },
                  {
                    key: 'move',
                    label: '移动',
                    icon: <FolderOutlined />,
                    onClick: () => handleMove(work),
                  },
                  {
                    key: 'tag',
                    label: '添加标签',
                    icon: <TagOutlined />,
                    onClick: () => handleAddTag(work),
                  },
                  {
                    key: 'duplicate',
                    label: '复制',
                    icon: <CopyOutlined />,
                    onClick: () => handleDuplicate(work.id),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'delete',
                    label: '删除',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => handleDelete(work.id),
                  },
                ]

                return (
                  <Card
                    key={work.id}
                    hoverable
                    cover={
                      <div className="h-48 bg-background-gray flex items-center justify-center relative">
                        <Checkbox
                          className="absolute top-2 left-2 z-10"
                          checked={selectedWorks.includes(work.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWorks([...selectedWorks, work.id])
                            } else {
                              setSelectedWorks(selectedWorks.filter((id) => id !== work.id))
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {work.thumbnailUrl ? (
                          <img
                            src={work.thumbnailUrl}
                            alt={work.name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => handleEdit(work.id)}
                          />
                        ) : (
                          <span className="text-text-tertiary cursor-pointer" onClick={() => handleEdit(work.id)}>
                            暂无缩略图
                          </span>
                        )}
                      </div>
                    }
                    actions={[
                      <EditOutlined key="edit" onClick={() => handleEdit(work.id)} />,
                      <Dropdown
                        key="more"
                        menu={{ items: menuItems }}
                        trigger={['click']}
                      >
                        <MoreOutlined />
                      </Dropdown>,
                    ]}
                  >
                    <Card.Meta
                      title={
                        <span
                          className="cursor-pointer"
                          onClick={() => handleEdit(work.id)}
                        >
                          {work.name}
                        </span>
                      }
                      description={
                        <div className="mt-2">
                          <div className="text-xs text-text-secondary mb-2">
                            <div>创建: {new Date(work.createdAt).toLocaleString('zh-CN')}</div>
                            <div>修改: {new Date(work.updatedAt).toLocaleString('zh-CN')}</div>
                          </div>
                          {work.tags && work.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {work.tags.slice(0, 3).map((tag, index) => (
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
                              {work.tags.length > 3 && <Tag>...</Tag>}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </Card>
                )
              })}
            </div>

            {/* 分页 */}
            <div className="flex justify-center">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                showTotal={(total) => `共 ${total} 条`}
              />
            </div>
          </>
        )}

        {/* 重命名对话框 */}
        <Modal
          title="重命名作品"
          open={renameModalVisible}
          onOk={handleRenameConfirm}
          onCancel={() => {
            setRenameModalVisible(false)
            setRenameWorkId(null)
            setRenameValue('')
          }}
        >
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="请输入作品名称"
            maxLength={50}
            onPressEnter={handleRenameConfirm}
          />
        </Modal>

        {/* 移动对话框 */}
        <Modal
          title="移动到文件夹"
          open={moveModalVisible}
          onOk={() => handleMoveConfirm(undefined)}
          onCancel={() => {
            setMoveModalVisible(false)
            setMoveWorkId(null)
          }}
        >
          <Select
            style={{ width: '100%' }}
            placeholder="选择文件夹"
            allowClear
            onChange={(value) => handleMoveConfirm(value)}
          >
            <Option value={''}>未分类</Option>
            {folders.map((folder) => (
              <Option key={folder.id} value={folder.id}>
                {folder.name}
              </Option>
            ))}
          </Select>
        </Modal>

        {/* 添加标签对话框 */}
        <Modal
          title="添加标签"
          open={tagModalVisible}
          onOk={() => {
            // 需要实现标签选择逻辑
            setTagModalVisible(false)
            setTagWorkId(null)
          }}
          onCancel={() => {
            setTagModalVisible(false)
            setTagWorkId(null)
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

