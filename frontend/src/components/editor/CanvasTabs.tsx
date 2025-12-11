import React from 'react'
import { Button, Modal, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { fabric } from 'fabric'

interface CanvasTab {
  id: string
  name: string
  canvas: fabric.Canvas
  thumbnailUrl?: string
}

interface CanvasTabsProps {
  tabs: CanvasTab[]
  activeTabId: string
  onAddTab: () => void
  onDeleteTab: (tabId: string) => void
  onSwitchTab: (tabId: string) => void
  onReorderTabs?: (newOrder: CanvasTab[]) => void
}

export default function CanvasTabs({
  tabs,
  activeTabId,
  onAddTab,
  onDeleteTab,
  onSwitchTab,
  onReorderTabs,
}: CanvasTabsProps) {
  const handleDeleteTab = (tabId: string) => {
    if (tabs.length <= 1) {
      message.warning('至少需要保留一个画板')
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此画板吗？删除后不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => onDeleteTab(tabId),
    })
  }

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('tabId', tabId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    const sourceTabId = e.dataTransfer.getData('tabId')
    
    if (sourceTabId && sourceTabId !== targetTabId) {
      const sourceIndex = tabs.findIndex(t => t.id === sourceTabId)
      const targetIndex = tabs.findIndex(t => t.id === targetTabId)
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newTabs = [...tabs]
        const [removed] = newTabs.splice(sourceIndex, 1)
        newTabs.splice(targetIndex, 0, removed)
        if (onReorderTabs) {
          onReorderTabs(newTabs)
        }
      }
    }
  }

  return (
    <div className="bg-white border-t border-border p-4 flex items-center">
      <div className="flex-1 flex items-center gap-4 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`relative cursor-pointer flex-shrink-0 transition-all ${activeTabId === tab.id ? 'opacity-100' : 'opacity-70 hover:opacity-90'}`}
            onClick={() => onSwitchTab(tab.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
          >
            <div className="w-32 h-24 border border-border rounded overflow-hidden bg-white">
              {tab.thumbnailUrl ? (
                <img src={tab.thumbnailUrl} alt={tab.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-xs text-center">{tab.name}</div>
                </div>
              )}
            </div>
            {activeTabId === tab.id && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-primary rounded-full" />
            )}
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              className="absolute -top-4 -right-4 w-6 h-6 p-0 rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteTab(tab.id)
              }}
            />
          </div>
        ))}
      </div>
      
      <Button
        type="default"
        icon={<PlusOutlined />}
        onClick={onAddTab}
        disabled={tabs.length >= 20}
        className="flex-shrink-0"
      >
        新建画板
      </Button>
    </div>
  )
}
