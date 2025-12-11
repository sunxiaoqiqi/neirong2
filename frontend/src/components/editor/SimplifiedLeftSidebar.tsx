import { useState, useEffect } from 'react'
import { Button, Drawer, Input, Upload, message, Modal, Space, Tabs, Select, Slider, Collapse, Tooltip } from 'antd'
import ColorPickerWithEyeDropper from './ColorPickerWithEyeDropper'
import {
  FileImageOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FormOutlined,
  UploadOutlined,
  CodeOutlined,
  DeleteOutlined,
  BarChartOutlined,
  CopyOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { aiService } from '@/services/aiService'
import { templateService } from '@/services/templateService'
import { fabric } from 'fabric'
import { testUniqueCodeMatching } from './testUniqueCodeMatching'

const { TextArea } = Input
const { TabPane } = Tabs
const { Panel } = Collapse

// 验证颜色格式
const validateColor = (color) => {
  // 检查是否是有效的十六进制颜色
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color
  }
  // 预定义颜色映射
  const colorMap: Record<string, string> = {
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'black': '#000000',
    'white': '#ffffff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080',
    '粉色': '#ffc0cb',
    '红色': '#ff0000',
    '绿色': '#00ff00',
    '蓝色': '#0000ff',
    '黑色': '#000000',
    '白色': '#ffffff',
    '黄色': '#ffff00',
    '橙色': '#ffa500',
  }
  
  return colorMap[color.toLowerCase()] || '#000000'
}

// LeftSidebar组件属性

// 生成唯一图层名称
const generateUniqueLayerName = (canvas, baseName) => {
  if (!canvas) return baseName
  
  const objects = canvas.getObjects()
  const nameCount: Record<string, number> = {}
  
  // 统计现有名称
  objects.forEach((obj: any) => {
    const name = obj.name || ''
    if (name.startsWith(baseName)) {
      if (name === baseName) {
        nameCount[baseName] = (nameCount[baseName] || 0) + 1
      } else {
        const match = name.match(new RegExp(`^${baseName}(\d+)$`))
        if (match) {
          const count = parseInt(match[1])
          nameCount[baseName] = Math.max(nameCount[baseName] || 0, count + 1)
        }
      }
    }
  })
  
  // 生成新名称
  if (nameCount[baseName] === 1) {
    return `${baseName}0`
  } else if (nameCount[baseName] > 1) {
    return `${baseName}${nameCount[baseName] - 1}`
  }
  
  return baseName
}



export default function SimplifiedLeftSidebar({
    canvas,
    onAddText,
    onAddImage,
    onApplyTemplate,
  }) {
  // 简化版组件 - 保留基本结构但移除可能有问题的内容
  return (
    <div className="left-sidebar">
      <div className="sidebar-content">
        {/* 简化的侧边栏内容 */}
        <h3>左侧边栏</h3>
        <p>这是一个简化版的LeftSidebar组件</p>
      </div>
    </div>
  );
}
