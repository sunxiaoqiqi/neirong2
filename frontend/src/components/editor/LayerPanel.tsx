import React, { useState, useCallback } from 'react'
import { Button, Space, Modal, Input, message } from 'antd'
import { 
  LockOutlined, 
  UnlockOutlined, 
  DeleteOutlined, 
  CaretRightOutlined, 
  CaretDownOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons'
import type { fabric } from 'fabric'

interface Layer {
  id: string
  name: string
  object: fabric.Object
  isGroup: boolean
  children?: Layer[]
  isExpanded?: boolean
}

interface LayerPanelProps {
  visible: boolean
  layers: Layer[]
  onClose: () => void
  onLayerOperation: (operation: 'select' | 'lock' | 'unlock' | 'delete' | 'rename' | 'toggleExpand' | 'move', layerId: string, newName?: string, targetIndex?: number) => void
}

export default function LayerPanel({
  visible,
  layers,
  onClose,
  onLayerOperation,
}: LayerPanelProps) {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  // 拖拽相关状态
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null)

  const handleDeleteLayer = useCallback((layerId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此图层吗？',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => onLayerOperation('delete', layerId),
    })
  }, [onLayerOperation])

  const handleStartEdit = useCallback((layer: Layer) => {
    setEditingLayerId(layer.id)
    setEditName(layer.name)
  }, [])

  const handleEndEdit = useCallback((layerId: string, newName: string) => {
    if (newName.trim()) {
      onLayerOperation('rename', layerId, newName.trim())
    }
    setEditingLayerId(null)
    setEditName('')
  }, [onLayerOperation])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, layerId: string) => {
    if (e.key === 'Enter') {
      handleEndEdit(layerId, editName)
    } else if (e.key === 'Escape') {
      setEditingLayerId(null)
      setEditName('')
    }
  }, [editName, handleEndEdit])

  // 拖拽开始
  const handleDragStart = useCallback((layerId: string) => {
    setDraggedLayerId(layerId)
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null)
    setHoveredLayerId(null)
  }, [])

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault()
    if (draggedLayerId !== layerId) {
      setHoveredLayerId(layerId)
    }
  }, [draggedLayerId])

  // 拖拽放置
  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    if (draggedLayerId && draggedLayerId !== targetLayerId) {
      const draggedIndex = layers.findIndex(l => l.id === draggedLayerId)
      const targetIndex = layers.findIndex(l => l.id === targetLayerId)
      if (draggedIndex !== -1 && targetIndex !== -1) {
        onLayerOperation('move', draggedLayerId, undefined, targetIndex)
      }
    }
    setDraggedLayerId(null)
    setHoveredLayerId(null)
  }, [draggedLayerId, layers, onLayerOperation])

  const renderLayer = useCallback((layer: Layer, level = 0) => {
    const paddingLeft = level * 20
    // 拖拽样式
    const isDragging = draggedLayerId === layer.id
    const isHovered = hoveredLayerId === layer.id

    return (
      <div 
        key={layer.id} 
        className={`mb-1 ${isDragging ? 'opacity-50' : ''} ${isHovered ? 'border-2 border-dashed border-blue-500 rounded' : ''}`}
        onDragOver={(e) => handleDragOver(e, layer.id)}
        onDrop={(e) => handleDrop(e, layer.id)}
      >
        <div 
          className={`flex items-center px-3 py-2 rounded cursor-pointer transition-colors hover:bg-gray-100 ${isDragging ? 'bg-gray-200' : ''}`}
          onClick={() => onLayerOperation('select', layer.id)}
          style={{ paddingLeft: paddingLeft + 3 + 'px' }}
          draggable
          onDragStart={() => handleDragStart(layer.id)}
          onDragEnd={handleDragEnd}
        >
          {/* 拖拽手柄 */}
          <div className="mr-2 cursor-move text-gray-400">
            ⋮⋮
          </div>
          
          {layer.isGroup && (
            <Button
              type="text"
              size="small"
              className="mr-2 p-0 w-4 h-4 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onLayerOperation('toggleExpand', layer.id)
              }}
            >
              {layer.isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            </Button>
          )}
          
          {editingLayerId === layer.id ? (
            <Input
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleEndEdit(layer.id, editName)}
              onKeyDown={(e) => handleKeyDown(e, layer.id)}
              className="flex-1"
              autoFocus
            />
          ) : (
            <div 
              className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              onDoubleClick={() => handleStartEdit(layer)}
            >
              {layer.name}
            </div>
          )}
          
          <Space size={[0, 4]} className="ml-2">
            <Button
              type="text"
              size="small"
              icon={layer.object.lockMovementX && layer.object.lockMovementY ? <LockOutlined /> : <UnlockOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                const newOperation = layer.object.lockMovementX && layer.object.lockMovementY ? 'unlock' : 'lock'
                onLayerOperation(newOperation, layer.id)
              }}
              className="w-8 h-8 p-0"
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteLayer(layer.id)
              }}
              className="w-8 h-8 p-0"
            />
          </Space>
        </div>
        
        {layer.isGroup && layer.isExpanded && layer.children && layer.children.length > 0 && (
          <div style={{ marginLeft: paddingLeft }}>
            {layer.children.map((child) => renderLayer(child, level + 1))}
          </div>
        )}
      </div>
    )
  }, [editingLayerId, editName, handleDeleteLayer, handleDragEnd, handleDragOver, handleDrop, handleStartEdit, handleKeyDown, handleEndEdit, draggedLayerId, hoveredLayerId, onLayerOperation])

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex">
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg flex flex-col">
        {/* 头部 */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <div className="font-medium">图层管理</div>
          <Button type="text" onClick={onClose} className="w-8 h-8 p-0">
            ×
          </Button>
        </div>

        {/* 图层列表 */}
        <div className="flex-1 p-2 overflow-y-auto">
          {layers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              暂无图层
            </div>
          ) : (
            <div className="space-y-1">
              {layers.map((layer) => renderLayer(layer))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-border p-3">
          <Space className="w-full justify-between">
            <Button 
              type="default" 
              size="small" 
              icon={<PlusOutlined />}
              onClick={() => message.info('暂不支持新建图层')}
              disabled
            >
              新建
            </Button>
            <Button 
              type="default" 
              size="small" 
              icon={<MinusOutlined />}
              onClick={() => message.info('暂不支持合并图层')}
              disabled
            >
              合并
            </Button>
          </Space>
        </div>
      </div>
    </div>
  )
}
