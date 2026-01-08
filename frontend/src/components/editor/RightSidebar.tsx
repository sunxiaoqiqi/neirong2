import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, InputNumber, Input, Select, Slider, Space, Divider, Radio, Modal, message, Switch, Drawer } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  DeleteOutlined,
  FormatPainterOutlined,
  PlusOutlined,
  MinusOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
  VerticalAlignMiddleOutlined,
  BorderOuterOutlined,
  UngroupOutlined,
  OrderedListOutlined,
} from '@ant-design/icons'
import { fabric } from 'fabric'
import ColorPickerWithEyeDropper from './ColorPickerWithEyeDropper'

interface RightSidebarProps {
  canvas: fabric.Canvas | null
  selectedObject: fabric.Object | null
  onEnterCropMode?: (target: fabric.Object) => void
  onEnterMagicWandMode?: (target: fabric.Object) => void
  onEnterEraseMode?: (target: fabric.Object) => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  onFormatBrushActive?: (type: 'text' | 'image' | 'shape' | null, styles: any) => void
  isPencilModeActive?: boolean
  pencilColor?: string
  pencilWidth?: number
  pencilStrokeLineCap?: 'round' | 'butt'
  pencilStrokeDashArray?: number[] | null
  pencilOpacity?: number
  onPencilColorChange?: (color: string) => void
  onPencilWidthChange?: (width: number) => void
  onPencilStrokeLineCapChange?: (cap: 'round' | 'butt') => void
  onPencilStrokeDashArrayChange?: (dashArray: number[] | null) => void
  onPencilOpacityChange?: (opacity: number) => void
}

export default function RightSidebar({ 
  canvas, 
  selectedObject, 
  onEnterCropMode, 
  onEnterMagicWandMode, 
  onEnterEraseMode, 
  zoom = 1, 
  onZoomChange, 
  onFormatBrushActive,
  isPencilModeActive = false,
  pencilColor = '#000000',
  pencilWidth = 2,
  pencilStrokeLineCap = 'round',
  pencilStrokeDashArray = null,
  pencilOpacity = 100,
  onPencilColorChange,
  onPencilWidthChange,
  onPencilStrokeLineCapChange,
  onPencilStrokeDashArrayChange,
  onPencilOpacityChange,
}: RightSidebarProps) {
  // 所有Hooks必须在组件顶层调用
  // 面板状态
  const [activePanel, setActivePanel] = useState<'canvas' | 'text' | 'image' | 'shape' | 'group' | 'pencil' | null>(null);
  
  // 格式刷状态
  const [formatBrushActive, setFormatBrushActive] = useState<'text' | 'image' | 'shape' | null>(null);
  const [formatBrushStyles, setFormatBrushStyles] = useState<any>(null);
  
  // 序号功能状态
  const [bulletModalVisible, setBulletModalVisible] = useState(false)
  const [bulletType, setBulletType] = useState<'number' | 'dot' | 'circle' | 'diamond' | 'emptyDiamond' | 'arrow' | 'square' | 'emptySquare' | 'triangle' | 'emptyTriangle' | 'star' | 'emptyStar'>('number')
  const [bulletColor, setBulletColor] = useState('#000000')
  const [bulletSize, setBulletSize] = useState(16)
  const [bulletPosition, setBulletPosition] = useState<'before' | 'after'>('before')
  const [bulletSpacing, setBulletSpacing] = useState(8)
  const [bulletAlign, setBulletAlign] = useState<'top' | 'middle' | 'bottom'>('middle')
  const [numberStart, setNumberStart] = useState(1)
  const [numberFormat, setNumberFormat] = useState<'1' | '①' | '一' | '壹'>('1')
  
  // 序号弹框拖动状态
  const [bulletModalPosition, setBulletModalPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  
  // 提取文字样式（排除位置和尺寸）
  const extractTextStyles = (textObject: fabric.Textbox): any => {
    return {
      fontSize: textObject.fontSize,
      fontFamily: textObject.fontFamily,
      fontWeight: textObject.fontWeight,
      fontStyle: textObject.fontStyle,
      fill: textObject.fill,
      textAlign: textObject.textAlign,
      textDecoration: textObject.textDecoration,
      underline: textObject.underline,
      linethrough: textObject.linethrough,
      overline: textObject.overline,
      charSpacing: textObject.charSpacing,
      lineHeight: textObject.lineHeight,
      angle: textObject.angle,
      opacity: textObject.opacity,
      shadow: textObject.shadow,
      stroke: textObject.stroke,
      strokeWidth: textObject.strokeWidth,
      // 不包含：left, top, width, height, scaleX, scaleY
    }
  }
  
  // 提取图片样式（排除位置和尺寸）
  const extractImageStyles = (imageObject: fabric.Image): any => {
    return {
      angle: imageObject.angle,
      opacity: imageObject.opacity,
      shadow: imageObject.shadow,
      stroke: imageObject.stroke,
      strokeWidth: imageObject.strokeWidth,
      filters: imageObject.filters,
      // 不包含：left, top, width, height, scaleX, scaleY
    }
  }
  
  // 提取图形样式（排除位置和尺寸）
  const extractShapeStyles = (shapeObject: fabric.Object): any => {
    return {
      fill: shapeObject.fill,
      stroke: shapeObject.stroke,
      strokeWidth: shapeObject.strokeWidth,
      strokeDashArray: shapeObject.strokeDashArray,
      angle: shapeObject.angle,
      opacity: shapeObject.opacity,
      shadow: shapeObject.shadow,
      // 对于矩形，还包含圆角
      ...(shapeObject.type === 'rect' && {
        rx: (shapeObject as fabric.Rect).rx,
        ry: (shapeObject as fabric.Rect).ry,
      }),
      // 不包含：left, top, width, height, scaleX, scaleY
    }
  }
  
  // 新增的文字属性状态管理钩子
  const [lineHeight, setLineHeight] = useState<number>(1.2);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  
  // 当选中文字对象变化时更新文字属性状态
  useEffect(() => {
    if (activePanel === 'text' && selectedObject && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
      const textObject = selectedObject as fabric.Textbox;
      setLineHeight(textObject.lineHeight || 1.2);
      setLetterSpacing(textObject.charSpacing || 0);
    }
  }, [activePanel, selectedObject]);
  
  // 文字编辑状态
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fill, setFill] = useState('#000000')
  const [angle, setAngle] = useState(0)
  const [opacity, setOpacity] = useState(100)
  
  // 图片编辑状态
  const [imageAngle, setImageAngle] = useState(0)
  const [imageOpacity, setImageOpacity] = useState(100)
  // 图片调色状态
  const [imageBrightness, setImageBrightness] = useState(0)
  const [imageContrast, setImageContrast] = useState(0)
  const [imageSaturation, setImageSaturation] = useState(0)
  const [imageTemperature, setImageTemperature] = useState(0)
  // 图片描边状态
  const [imageStrokeColor, setImageStrokeColor] = useState('#000000')
  const [imageStrokeWidth, setImageStrokeWidth] = useState(0)
  const [imageStrokeStyle, setImageStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  // 图片投影状态
  const [imageShadowColor, setImageShadowColor] = useState('#000000')
  const [imageShadowBlur, setImageShadowBlur] = useState(0)
  const [imageShadowOffsetX, setImageShadowOffsetX] = useState(0)
  const [imageShadowOffsetY, setImageShadowOffsetY] = useState(0)
  
  // 图形编辑状态
  const [shapeFill, setShapeFill] = useState('#ffffff')
  const [shapeStroke, setShapeStroke] = useState('#000000')
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2)
  const [shapeStrokeStyle, setShapeStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [shapeAngle, setShapeAngle] = useState(0)
  const [shapeOpacity, setShapeOpacity] = useState(100)
  const [shapeRadius, setShapeRadius] = useState(0) // 圆角半径
  const [shapeWidth, setShapeWidth] = useState(100)
  const [shapeHeight, setShapeHeight] = useState(100)
  const [shapeLeft, setShapeLeft] = useState(0)
  const [shapeTop, setShapeTop] = useState(0)

  useEffect(() => {
    // ⭐ 优先检查铅笔模式
    if (isPencilModeActive) {
      setActivePanel('pencil')
      return
    }
    
    if (!selectedObject) {
      setActivePanel('canvas')
      return
    }

    // 检查是否为多选（activeSelection 或 group）
    const isMultiSelect = selectedObject.type === 'activeSelection' || selectedObject.type === 'group'
    
    if (isMultiSelect) {
      setActivePanel('group')
      return
    }

    // 检查是否为emoji元素（通过name属性判断）
    const isEmoji = selectedObject.name?.includes('Emoji') || false;
    
    if (isEmoji) {
      setActivePanel('shape')
      // 更新图形编辑状态
      const obj = selectedObject as any
      setShapeFill(typeof obj.fill === 'string' ? obj.fill : '#ffffff')
      setShapeStroke(typeof obj.stroke === 'string' ? obj.stroke : '#000000')
      setShapeStrokeWidth(obj.strokeWidth || 0)
      setShapeAngle(obj.angle || 0)
      setShapeOpacity((obj.opacity || 1) * 100)
      setShapeWidth(obj.width || 50)
      setShapeHeight(obj.height || 50)
      setShapeLeft(obj.left || 0)
      setShapeTop(obj.top || 0)
    } else if (selectedObject.type === 'textbox' || selectedObject.type === 'text') {
      setActivePanel('text')
      // 更新文字编辑状态
      const textObject = selectedObject as fabric.Textbox
      setFontSize(textObject.fontSize || 16)
      setFontFamily(textObject.fontFamily || 'Arial')
      // 确保fill是字符串类型
      setFill(typeof textObject.fill === 'string' ? textObject.fill : '#000000')
      setAngle(textObject.angle || 0)
      setOpacity((textObject.opacity || 1) * 100)
    } else if (selectedObject.type === 'image') {
      setActivePanel('image')
      // 更新图片编辑状态
      const imageObject = selectedObject as fabric.Image
      setImageAngle(imageObject.angle || 0)
      setImageOpacity((imageObject.opacity || 1) * 100)
      // 更新图片调色状态
      setImageBrightness(0)
      setImageContrast(0)
      setImageSaturation(0)
      setImageTemperature(0)
      // 更新图片描边状态
      setImageStrokeColor(imageObject.stroke || '#000000')
      setImageStrokeWidth(imageObject.strokeWidth || 0)
      setImageStrokeStyle('solid') // 默认为实线
      // 更新图片投影状态
      const shadow = imageObject.shadow as fabric.Shadow
      setImageShadowColor(shadow?.color || '#000000')
      setImageShadowBlur(shadow?.blur || 0)
      setImageShadowOffsetX(shadow?.offsetX || 0)
      setImageShadowOffsetY(shadow?.offsetY || 0)
    } else {
      setActivePanel('shape')
      // 更新图形编辑状态
      // 确保fill是字符串类型
      setShapeFill(typeof selectedObject.fill === 'string' ? selectedObject.fill : '#ffffff')
      setShapeStroke(selectedObject.stroke || '#000000')
      setShapeStrokeWidth(selectedObject.strokeWidth || 2)
      setShapeAngle(selectedObject.angle || 0)
      setShapeOpacity((selectedObject.opacity || 1) * 100)
      // 对于矩形，设置圆角半径
      if (selectedObject.type === 'rect') {
        const rect = selectedObject as fabric.Rect
        setShapeRadius(rect.rx || rect.ry || 0)
      } else {
        setShapeRadius(0)
      }
      // 设置尺寸和位置
      setShapeWidth(selectedObject.width || 100)
      setShapeHeight(selectedObject.height || 100)
      setShapeLeft(selectedObject.left || 0)
      setShapeTop(selectedObject.top || 0)
    }
  }, [selectedObject, isPencilModeActive])

  // 拖动处理函数 - 必须在早期返回之前定义
  const dragStartRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // 只允许在标题栏区域拖动，排除按钮
    if (target.closest('.ant-modal-header') && !target.closest('button') && !target.closest('.ant-modal-close')) {
      e.preventDefault()
      setIsDragging(true)
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.clientX - bulletModalPosition.x,
        y: e.clientY - bulletModalPosition.y
      }
    }
  }, [bulletModalPosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      setBulletModalPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!canvas) return null

  // 序号功能：生成序号符号
  const getBulletSymbol = (type: string, index: number = 1): string => {
    switch (type) {
      case 'number':
        switch (numberFormat) {
          case '1':
            return `${numberStart + index - 1}.`
          case '①':
            const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
            return circleNumbers[(numberStart + index - 2) % 10] || `${numberStart + index - 1}.`
          case '一':
            const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
            return chineseNumbers[(numberStart + index - 2) % 10] || `${numberStart + index - 1}.`
          case '壹':
            const traditionalNumbers = ['壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖', '拾']
            return traditionalNumbers[(numberStart + index - 2) % 10] || `${numberStart + index - 1}.`
          default:
            return `${numberStart + index - 1}.`
        }
      case 'dot':
        return '●'
      case 'circle':
        return '○'
      case 'diamond':
        return '◆'
      case 'emptyDiamond':
        return '◇'
      case 'arrow':
        return '→'
      case 'square':
        return '■'
      case 'emptySquare':
        return '□'
      case 'triangle':
        return '▲'
      case 'emptyTriangle':
        return '△'
      case 'star':
        return '★'
      case 'emptyStar':
        return '☆'
      default:
        return '•'
    }
  }

  // 序号功能：应用序号到文字
  const applyBulletToText = () => {
    if (!canvas || !selectedObject || (selectedObject.type !== 'textbox' && selectedObject.type !== 'text')) {
      message.warning('请先选中文字元素')
      return
    }

    const textObject = selectedObject as fabric.Textbox
    const currentText = textObject.text || ''
    
    // 检查是否已有序号
    const hasBullet = (textObject as any).hasBullet || false
    
    if (hasBullet) {
      // 如果已有序号，先移除
      const lines = currentText.split('\n')
      const cleanedLines = lines.map(line => {
        // 移除常见的序号格式
        return line.replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩一二三四五六七八九十壹貳參肆伍陸柒捌玖拾]+[\.、]\s*/, '')
          .replace(/^[●○◆◇→■□▲△★☆•]\s*/, '')
      })
      textObject.set('text', cleanedLines.join('\n'))
      ;(textObject as any).hasBullet = false
    } else {
      // 添加序号
      const lines = currentText.split('\n')
      const bulletedLines = lines.map((line, index) => {
        const symbol = getBulletSymbol(bulletType, index + 1)
        const spacing = ' '.repeat(Math.max(0, Math.floor(bulletSpacing / 4))) // 简单的间距实现
        return bulletPosition === 'before' ? `${symbol}${spacing}${line}` : `${line}${spacing}${symbol}`
      })
      textObject.set('text', bulletedLines.join('\n'))
      ;(textObject as any).hasBullet = true
      ;(textObject as any).bulletType = bulletType
      ;(textObject as any).bulletColor = bulletColor
      ;(textObject as any).bulletSize = bulletSize
    }
    
    // 更新文字尺寸
    if (typeof (textObject as any).initDimensions === 'function') {
      try {
        ;(textObject as any).initDimensions()
      } catch (e) {
        console.warn('initDimensions 调用失败:', e)
      }
    }
    
    textObject.setCoords()
    canvas.renderAll()
    message.success(hasBullet ? '已移除序号' : '已添加序号')
    setBulletModalVisible(false)
  }

  // 序号设置弹窗（在所有面板中都可以访问）
  const bulletModalJSX = (
    <Modal
      key="bullet-modal"
      title="序号设置"
      open={bulletModalVisible}
      onCancel={() => {
        setBulletModalVisible(false)
        setBulletModalPosition({ x: 0, y: 0 })
      }}
      onOk={applyBulletToText}
      width={600}
      okText="应用"
      cancelText="取消"
      modalRender={(modal) => (
        <div
          style={{
            transform: `translate(${bulletModalPosition.x}px, ${bulletModalPosition.y}px)`,
          }}
          onMouseDown={handleMouseDown}
        >
          <style>{`
            .ant-modal-header {
              cursor: ${isDragging ? 'grabbing' : 'move'} !important;
            }
          `}</style>
          {modal}
        </div>
      )}
    >
      <div className="space-y-4">
        {/* 序号类型 */}
        <div>
          <div className="mb-2 text-sm font-medium">序号类型</div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              type={bulletType === 'number' ? 'primary' : 'default'}
              onClick={() => setBulletType('number')}
            >
              数字
            </Button>
            <Button
              type={bulletType === 'dot' ? 'primary' : 'default'}
              onClick={() => setBulletType('dot')}
            >
              ●
            </Button>
            <Button
              type={bulletType === 'circle' ? 'primary' : 'default'}
              onClick={() => setBulletType('circle')}
            >
              ○
            </Button>
            <Button
              type={bulletType === 'diamond' ? 'primary' : 'default'}
              onClick={() => setBulletType('diamond')}
            >
              ◆
            </Button>
            <Button
              type={bulletType === 'emptyDiamond' ? 'primary' : 'default'}
              onClick={() => setBulletType('emptyDiamond')}
            >
              ◇
            </Button>
            <Button
              type={bulletType === 'arrow' ? 'primary' : 'default'}
              onClick={() => setBulletType('arrow')}
            >
              →
            </Button>
            <Button
              type={bulletType === 'square' ? 'primary' : 'default'}
              onClick={() => setBulletType('square')}
            >
              ■
            </Button>
            <Button
              type={bulletType === 'emptySquare' ? 'primary' : 'default'}
              onClick={() => setBulletType('emptySquare')}
            >
              □
            </Button>
            <Button
              type={bulletType === 'triangle' ? 'primary' : 'default'}
              onClick={() => setBulletType('triangle')}
            >
              ▲
            </Button>
            <Button
              type={bulletType === 'emptyTriangle' ? 'primary' : 'default'}
              onClick={() => setBulletType('emptyTriangle')}
            >
              △
            </Button>
            <Button
              type={bulletType === 'star' ? 'primary' : 'default'}
              onClick={() => setBulletType('star')}
            >
              ★
            </Button>
            <Button
              type={bulletType === 'emptyStar' ? 'primary' : 'default'}
              onClick={() => setBulletType('emptyStar')}
            >
              ☆
            </Button>
          </div>
        </div>

        {/* 数字序号设置 */}
        {bulletType === 'number' && (
          <>
            <Divider />
            <div>
              <div className="mb-2 text-sm font-medium">数字格式</div>
              <Select
                style={{ width: '100%' }}
                value={numberFormat}
                onChange={setNumberFormat}
                options={[
                  { label: '1, 2, 3...', value: '1' },
                  { label: '①, ②, ③...', value: '①' },
                  { label: '一, 二, 三...', value: '一' },
                  { label: '壹, 貳, 參...', value: '壹' },
                ]}
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">起始数字</div>
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={9999}
                value={numberStart}
                onChange={(value) => setNumberStart(value || 1)}
              />
            </div>
          </>
        )}

        <Divider />

        {/* 序号颜色 */}
        <div>
          <div className="mb-2 text-sm font-medium">序号颜色</div>
          <ColorPickerWithEyeDropper
            value={bulletColor}
            onChange={(color) => {
              const colorString = typeof color === 'string' 
                ? color 
                : (color && typeof color.toHexString === 'function' 
                    ? color.toHexString() 
                    : String(color || '#000000'))
              setBulletColor(colorString)
            }}
          />
        </div>

        <Divider />

        {/* 序号大小 */}
        <div>
          <div className="mb-2 text-sm font-medium">序号大小</div>
          <Slider
            min={8}
            max={72}
            value={bulletSize}
            onChange={setBulletSize}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={8}
              max={72}
              value={bulletSize}
              onChange={(value) => setBulletSize(value || 16)}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
          </Space.Compact>
        </div>

        <Divider />

        {/* 序号位置 */}
        <div>
          <div className="mb-2 text-sm font-medium">序号位置</div>
          <Radio.Group
            value={bulletPosition}
            onChange={(e) => setBulletPosition(e.target.value)}
            options={[
              { label: '文字前', value: 'before' },
              { label: '文字后', value: 'after' },
            ]}
          />
        </div>

        <Divider />

        {/* 序号间距 */}
        <div>
          <div className="mb-2 text-sm font-medium">序号间距</div>
          <Slider
            min={0}
            max={50}
            value={bulletSpacing}
            onChange={setBulletSpacing}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={50}
              value={bulletSpacing}
              onChange={(value) => setBulletSpacing(value || 0)}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
          </Space.Compact>
          <div className="text-xs text-gray-500 mt-1">控制序号与文字的距离</div>
        </div>

        <Divider />

        {/* 序号对齐 */}
        <div>
          <div className="mb-2 text-sm font-medium">序号对齐</div>
          <Select
            style={{ width: '100%' }}
            value={bulletAlign}
            onChange={setBulletAlign}
            options={[
              { label: '上对齐', value: 'top' },
              { label: '居中', value: 'middle' },
              { label: '下对齐', value: 'bottom' },
            ]}
          />
        </div>
      </div>
    </Modal>
  )

  // 组编辑面板（多选）
  if (activePanel === 'group' && selectedObject && (selectedObject.type === 'activeSelection' || selectedObject.type === 'group')) {
    const groupObject = selectedObject as fabric.ActiveSelection | fabric.Group
    const objects = groupObject.type === 'activeSelection' 
      ? (groupObject as fabric.ActiveSelection).getObjects()
      : (groupObject as fabric.Group).getObjects()
    
    // 图层顺序调整
    const handleLayerOrder = (action: 'bringForward' | 'sendBackwards' | 'bringToFront' | 'sendToBack') => {
      if (!canvas) return
      
      objects.forEach((obj: fabric.Object) => {
        switch (action) {
          case 'bringForward':
            canvas.bringForward(obj)
            break
          case 'sendBackwards':
            canvas.sendBackwards(obj)
            break
          case 'bringToFront':
            canvas.bringToFront(obj)
            break
          case 'sendToBack':
            canvas.sendToBack(obj)
            break
        }
      })
      canvas.renderAll()
    }
    
    // 对齐功能
    const handleAlign = (alignType: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle' | 'distributeH' | 'distributeV') => {
      if (objects.length < 2) return
      
      let minX = Infinity, maxX = -Infinity
      let minY = Infinity, maxY = -Infinity
      let sumX = 0, sumY = 0
      
      objects.forEach((obj: fabric.Object) => {
        const left = obj.left || 0
        const top = obj.top || 0
        const width = (obj.width || 0) * (obj.scaleX || 1)
        const height = (obj.height || 0) * (obj.scaleY || 1)
        
        minX = Math.min(minX, left)
        maxX = Math.max(maxX, left + width)
        minY = Math.min(minY, top)
        maxY = Math.max(maxY, top + height)
        sumX += left + width / 2
        sumY += top + height / 2
      })
      
      const centerX = sumX / objects.length
      const centerY = sumY / objects.length
      
      objects.forEach((obj: fabric.Object) => {
        const width = (obj.width || 0) * (obj.scaleX || 1)
        const height = (obj.height || 0) * (obj.scaleY || 1)
        
        switch (alignType) {
          case 'left':
            obj.set({ left: minX })
            break
          case 'right':
            obj.set({ left: maxX - width })
            break
          case 'center':
            obj.set({ left: centerX - width / 2 })
            break
          case 'top':
            obj.set({ top: minY })
            break
          case 'bottom':
            obj.set({ top: maxY - height })
            break
          case 'middle':
            obj.set({ top: centerY - height / 2 })
            break
          case 'distributeH':
            // 水平等距分布
            if (objects.length > 2) {
              const sorted = [...objects].sort((a, b) => (a.left || 0) - (b.left || 0))
              const firstLeft = sorted[0].left || 0
              const lastLeft = sorted[sorted.length - 1].left || 0
              const totalWidth = lastLeft - firstLeft
              const spacing = totalWidth / (sorted.length - 1)
              sorted.forEach((obj, index) => {
                if (index > 0 && index < sorted.length - 1) {
                  obj.set({ left: firstLeft + spacing * index })
                }
              })
            }
            break
          case 'distributeV':
            // 垂直等距分布
            if (objects.length > 2) {
              const sorted = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0))
              const firstTop = sorted[0].top || 0
              const lastTop = sorted[sorted.length - 1].top || 0
              const totalHeight = lastTop - firstTop
              const spacing = totalHeight / (sorted.length - 1)
              sorted.forEach((obj, index) => {
                if (index > 0 && index < sorted.length - 1) {
                  obj.set({ top: firstTop + spacing * index })
                }
              })
            }
            break
        }
        obj.setCoords()
      })
      
      // 标记这是用户操作，触发 object:modified 事件以更新保存的位置
      objects.forEach((obj: fabric.Object) => {
        canvas.fire('object:modified', { target: obj, userOperation: true })
      })
      
      canvas.renderAll()
    }
    
    // 组合功能
    const handleGroup = () => {
      if (!canvas || objects.length < 2) return
      
      try {
        // 如果当前已经是 activeSelection，直接使用 toGroup 方法
        if (groupObject.type === 'activeSelection') {
          const activeSelection = groupObject as fabric.ActiveSelection
          // 使用 toGroup 方法，它会自动处理坐标转换
          activeSelection.toGroup()
          
          // 获取新创建的组合
          const newGroup = canvas.getActiveObject() as fabric.Group
          if (newGroup && newGroup.type === 'group') {
            newGroup.setCoords()
            canvas.renderAll()
            return
          }
        }
        
        // 如果不是 activeSelection 或 toGroup 失败，手动创建组合
        // 计算所有对象的边界框
        let minX = Infinity, minY = Infinity
        
        objects.forEach((obj: fabric.Object) => {
          const left = obj.left || 0
          const top = obj.top || 0
          minX = Math.min(minX, left)
          minY = Math.min(minY, top)
        })
        
        // 创建组合，fabric.Group 会自动处理坐标转换
        // 对象的坐标会自动转换为相对于组合的坐标
        const group = new fabric.Group([...objects], {
          left: minX,
          top: minY,
        })
        
        // 移除原对象（已经在 Group 构造函数中处理了）
        // 添加组合到画布
        canvas.add(group)
        
        // 设置组合为选中状态
        canvas.setActiveObject(group)
        
        // 确保组合可见
        group.setCoords()
        canvas.renderAll()
      } catch (error) {
        console.error('组合失败:', error)
        message.error('组合失败，请重试')
      }
    }
    
    // 取消组合功能
    const handleUngroup = () => {
      if (!canvas || groupObject.type !== 'group') return
      
      const group = groupObject as fabric.Group
      const groupObjects = group.getObjects()
      
      // 获取组合的变换信息
      const groupLeft = group.left || 0
      const groupTop = group.top || 0
      const groupAngle = group.angle || 0
      const groupScaleX = group.scaleX || 1
      const groupScaleY = group.scaleY || 1
      
      // 保存每个对象在画布上的绝对位置
      // 使用 fabric.js 的坐标转换方法
      const objectAbsolutePositions: Array<{ obj: fabric.Object; left: number; top: number; angle: number; scaleX: number; scaleY: number }> = []
      
      groupObjects.forEach((obj: fabric.Object) => {
        // 获取对象在组合内的相对位置（相对于组合的左上角）
        const relativeLeft = obj.left || 0
        const relativeTop = obj.top || 0
        
        // 使用 fabric.js 的变换矩阵计算绝对位置
        // 组合的变换矩阵
        const radians = (groupAngle * Math.PI) / 180
        const cos = Math.cos(radians)
        const sin = Math.sin(radians)
        
        // 应用缩放
        const scaledX = relativeLeft * groupScaleX
        const scaledY = relativeTop * groupScaleY
        
        // 应用旋转（绕组合左上角旋转）
        const rotatedX = scaledX * cos - scaledY * sin
        const rotatedY = scaledX * sin + scaledY * cos
        
        // 绝对位置 = 组合位置 + 旋转后的相对位置
        const absoluteLeft = groupLeft + rotatedX
        const absoluteTop = groupTop + rotatedY
        
        // 保存绝对位置和变换信息
        objectAbsolutePositions.push({
          obj,
          left: absoluteLeft,
          top: absoluteTop,
          angle: (obj.angle || 0) + groupAngle,
          scaleX: (obj.scaleX || 1) * groupScaleX,
          scaleY: (obj.scaleY || 1) * groupScaleY,
        })
      })
      
      // 移除组合
      canvas.remove(group)
      
      // 恢复每个对象到画布上的绝对位置
      objectAbsolutePositions.forEach(({ obj, left, top, angle, scaleX, scaleY }) => {
        obj.set({
          left,
          top,
          angle,
          scaleX,
          scaleY,
        })
        obj.setCoords()
        canvas.add(obj)
      })
      
      canvas.discardActiveObject()
      canvas.renderAll()
    }
    
    return (
      <div className="space-y-4 w-full overflow-x-hidden">
        <div className="font-semibold text-text-primary">组编辑 ({objects.length}个元素)</div>
        
        {/* 图层顺序 */}
        <div className="space-y-2">
          <div className="text-sm text-text-secondary">图层顺序</div>
          <Space wrap>
            <Button
              size="small"
              icon={<VerticalAlignTopOutlined />}
              onClick={() => handleLayerOrder('bringToFront')}
              title="置顶"
            >
              置顶
            </Button>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => handleLayerOrder('bringForward')}
              title="上移一层"
            >
              上移
            </Button>
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => handleLayerOrder('sendBackwards')}
              title="下移一层"
            >
              下移
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignBottomOutlined />}
              onClick={() => handleLayerOrder('sendToBack')}
              title="置底"
            >
              置底
            </Button>
          </Space>
        </div>
        
        <Divider />
        
        {/* 对齐方式 */}
        <div className="space-y-2">
          <div className="text-sm text-text-secondary">对齐方式</div>
          <div className="space-y-2">
            <Space wrap>
              <Button
                size="small"
                icon={<AlignLeftOutlined />}
                onClick={() => handleAlign('left')}
                title="左对齐"
              >
                左对齐
              </Button>
              <Button
                size="small"
                icon={<AlignCenterOutlined />}
                onClick={() => handleAlign('center')}
                title="水平居中"
              >
                水平居中
              </Button>
              <Button
                size="small"
                icon={<AlignRightOutlined />}
                onClick={() => handleAlign('right')}
                title="右对齐"
              >
                右对齐
              </Button>
            </Space>
            <Space wrap>
              <Button
                size="small"
                icon={<VerticalAlignTopOutlined />}
                onClick={() => handleAlign('top')}
                title="顶部对齐"
              >
                顶部对齐
              </Button>
              <Button
                size="small"
                icon={<VerticalAlignMiddleOutlined />}
                onClick={() => handleAlign('middle')}
                title="垂直居中"
              >
                垂直居中
              </Button>
              <Button
                size="small"
                icon={<VerticalAlignBottomOutlined />}
                onClick={() => handleAlign('bottom')}
                title="底部对齐"
              >
                底部对齐
              </Button>
            </Space>
            <Space wrap>
              <Button
                size="small"
                onClick={() => handleAlign('distributeH')}
                title="水平等距分布"
                disabled={objects.length < 3}
              >
                水平等距
              </Button>
              <Button
                size="small"
                onClick={() => handleAlign('distributeV')}
                title="垂直等距分布"
                disabled={objects.length < 3}
              >
                垂直等距
              </Button>
            </Space>
          </div>
        </div>
        
        <Divider />
        
        {/* 组合/取消组合 */}
        <div className="space-y-2">
          <div className="text-sm text-text-secondary">组合操作</div>
          <Space wrap>
            {groupObject.type === 'group' ? (
              <Button
                size="small"
                icon={<UngroupOutlined />}
                onClick={handleUngroup}
                title="取消组合"
              >
                取消组合
              </Button>
            ) : (
              <Button
                size="small"
                icon={<BorderOuterOutlined />}
                onClick={handleGroup}
                title="组合"
                disabled={objects.length < 2}
              >
                组合
              </Button>
            )}
          </Space>
        </div>
      </div>
    )
  }

  // 铅笔编辑面板
  if (activePanel === 'pencil') {
    return (
      <div className="space-y-4 w-full overflow-x-hidden">
        <div className="font-semibold text-text-primary">铅笔编辑</div>
        
        {/* 线条颜色 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">线条颜色</div>
          {onPencilColorChange && (
            <ColorPickerWithEyeDropper
              value={pencilColor}
              onChange={(color) => {
                // ColorPickerWithEyeDropper 返回的是颜色对象，需要调用 toHexString() 方法
                const colorString = typeof color === 'string' 
                  ? color 
                  : (color && typeof color.toHexString === 'function' 
                      ? color.toHexString() 
                      : String(color || '#000000'))
                onPencilColorChange(colorString)
                // 更新画布的画笔颜色
                if (canvas && canvas.isDrawingMode && canvas.freeDrawingBrush) {
                  canvas.freeDrawingBrush.color = colorString
                }
              }}
            />
          )}
        </div>

        <Divider className="my-2" />

        {/* 线条粗细 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">线条粗细</div>
          <Slider
            min={1}
            max={50}
            value={pencilWidth}
            onChange={(value) => {
              if (onPencilWidthChange) {
                onPencilWidthChange(value)
                // 更新画布的画笔宽度
                if (canvas && canvas.isDrawingMode && canvas.freeDrawingBrush) {
                  canvas.freeDrawingBrush.width = value
                }
              }
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={1}
              max={50}
              value={pencilWidth}
              onChange={(value) => {
                if (onPencilWidthChange && value !== null) {
                  onPencilWidthChange(value)
                  // 更新画布的画笔宽度
                  if (canvas && canvas.isDrawingMode && canvas.freeDrawingBrush) {
                    canvas.freeDrawingBrush.width = value
                  }
                }
              }}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 线条端点 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">线条端点</div>
          <Space>
            <Button
              type={pencilStrokeLineCap === 'round' ? 'primary' : 'default'}
              icon={<span>○</span>}
              onClick={() => {
                if (onPencilStrokeLineCapChange) {
                  onPencilStrokeLineCapChange('round')
                }
              }}
            >
              圆头
            </Button>
            <Button
              type={pencilStrokeLineCap === 'butt' ? 'primary' : 'default'}
              icon={<span>▬</span>}
              onClick={() => {
                if (onPencilStrokeLineCapChange) {
                  onPencilStrokeLineCapChange('butt')
                }
              }}
            >
              平头
            </Button>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 线条样式 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">线条样式</div>
          <Select
            style={{ width: '100%' }}
            value={pencilStrokeDashArray === null ? 'solid' : (pencilStrokeDashArray[0] === 5 ? 'dashed' : 'dotted')}
            onChange={(value) => {
              if (onPencilStrokeDashArrayChange) {
                if (value === 'solid') {
                  onPencilStrokeDashArrayChange(null)
                } else if (value === 'dashed') {
                  onPencilStrokeDashArrayChange([5, 5])
                } else if (value === 'dotted') {
                  onPencilStrokeDashArrayChange([2, 2])
                }
              }
            }}
            options={[
              { label: '实线', value: 'solid' },
              { label: '虚线', value: 'dashed' },
              { label: '点线', value: 'dotted' },
            ]}
          />
        </div>

        <Divider className="my-2" />

        {/* 透明度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">透明度</div>
          <Slider
            min={0}
            max={100}
            value={pencilOpacity}
            onChange={(value) => {
              if (onPencilOpacityChange) {
                onPencilOpacityChange(value)
              }
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={100}
              value={pencilOpacity}
              onChange={(value) => {
                if (onPencilOpacityChange && value !== null) {
                  onPencilOpacityChange(value)
                }
              }}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">%</span>
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 清除线条 */}
        <div>
          <Button
            block
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              if (canvas && selectedObject) {
                canvas.remove(selectedObject)
                canvas.renderAll()
                message.success('已删除线条')
              } else {
                message.warning('请先选中要删除的线条')
              }
            }}
          >
            清除线条
          </Button>
        </div>
      </div>
    )
  }

  // 画板编辑面板
  if (activePanel === 'canvas' || !selectedObject) {
    return (
      <>
      <div className="space-y-4 w-full overflow-x-hidden">
        <div className="font-semibold text-text-primary">画板编辑</div>
        
        {/* 缩放控制 */}
        {onZoomChange && (
          <div className="space-y-2">
            <div className="text-sm text-text-secondary mb-2">画布缩放</div>
            <div className="flex items-center gap-2">
              <Button 
                icon={<MinusOutlined />}
                onClick={() => {
                  const newZoom = Math.max(0.1, zoom - 0.1)
                  onZoomChange(newZoom)
                }}
                disabled={zoom <= 0.1}
              />
              <Space.Compact style={{ flex: 1 }}>
                <InputNumber
                  value={Math.round(zoom * 100)}
                  min={10}
                  max={500}
                  onChange={(value) => {
                    if (value !== null) {
                      const newZoom = Math.max(0.1, Math.min(5, value / 100))
                      onZoomChange(newZoom)
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">%</span>
              </Space.Compact>
              <Button 
                icon={<PlusOutlined />}
                onClick={() => {
                  const newZoom = Math.min(5, zoom + 0.1)
                  onZoomChange(newZoom)
                }}
                disabled={zoom >= 5}
              />
            </div>
            <Button 
              block 
              size="small"
              onClick={() => {
                onZoomChange(1)
              }}
            >
              重置为 100%
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          <Button block icon={<FormatPainterOutlined />}>
            格式刷
          </Button>
          <Button block>新建</Button>
          <Button block danger>删除</Button>
          <Button 
            block 
            onClick={() => {
              // 使用 state 管理输入值
              let canvasWidth = canvas.width || 1080
              let canvasHeight = canvas.height || 1440
              
              // 显示尺寸调整模态框
              Modal.confirm({
                title: '调整画板尺寸',
                width: 400,
                content: (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 50 }} className="text-sm text-text-secondary">宽度</span>
                      <InputNumber 
                        id="canvas-width-input" 
                        placeholder="输入宽度" 
                        min={100} 
                        max={5000} 
                        defaultValue={canvasWidth}
                        style={{ flex: 1 }}
                        formatter={(value) => value ? `${value}px` : ''}
                        parser={(value) => value ? parseInt(value.replace('px', '')) || 0 : 0}
                        onChange={(value) => {
                          if (value !== null && value !== undefined) {
                            canvasWidth = value
                          }
                        }}
                        onPressEnter={(e: any) => {
                          const value = parseInt(e.target.value) || 0
                          if (value >= 100 && value <= 5000) {
                            canvasWidth = value
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ width: 50 }} className="text-sm text-text-secondary">高度</span>
                      <InputNumber 
                        id="canvas-height-input" 
                        placeholder="输入高度" 
                        min={100} 
                        max={5000} 
                        defaultValue={canvasHeight}
                        style={{ flex: 1 }}
                        formatter={(value) => value ? `${value}px` : ''}
                        parser={(value) => value ? parseInt(value.replace('px', '')) || 0 : 0}
                        onChange={(value) => {
                          if (value !== null && value !== undefined) {
                            canvasHeight = value
                          }
                        }}
                        onPressEnter={(e: any) => {
                          const value = parseInt(e.target.value) || 0
                          if (value >= 100 && value <= 5000) {
                            canvasHeight = value
                          }
                        }}
                      />
                    </div>
                  </div>
                ),
                onOk: () => {
                  // 获取输入的尺寸（从 DOM 元素获取最新值）
                  const widthInput = document.getElementById('canvas-width-input') as HTMLInputElement
                  const heightInput = document.getElementById('canvas-height-input') as HTMLInputElement
                  
                  let newWidth = canvasWidth
                  let newHeight = canvasHeight
                  
                  // 尝试从输入框获取值
                  if (widthInput) {
                    const widthValue = widthInput.value
                    if (widthValue) {
                      const parsed = parseInt(widthValue.replace('px', ''))
                      if (!isNaN(parsed) && parsed >= 100 && parsed <= 5000) {
                        newWidth = parsed
                      }
                    }
                  }
                  
                  if (heightInput) {
                    const heightValue = heightInput.value
                    if (heightValue) {
                      const parsed = parseInt(heightValue.replace('px', ''))
                      if (!isNaN(parsed) && parsed >= 100 && parsed <= 5000) {
                        newHeight = parsed
                      }
                    }
                  }
                  
                  // 验证尺寸
                  if (newWidth < 100 || newWidth > 5000 || newHeight < 100 || newHeight > 5000) {
                    message.error('尺寸必须在 100-5000px 范围内')
                    return false
                  }
                  
                  // 更新画布尺寸
                  canvas.setWidth(newWidth)
                  canvas.setHeight(newHeight)
                  canvas.renderAll()
                  message.success(`画板尺寸已调整为 ${newWidth} × ${newHeight}px`)
                },
                onCancel: () => {},
              })
            }}
          >
            尺寸调整
          </Button>
        </div>
      </div>
      {bulletModalJSX}
    </>
    )
  }

  // 文字编辑面板
  if (activePanel === 'text' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
    const textObject = selectedObject as fabric.Textbox
    
    // ⭐ 核心修复：验证 textObject 是否为有效的 fabric.js 对象
    if (!textObject || typeof textObject !== 'object') {
      return null
    }
    
    // 获取文字类型（如果有设置）
    const textType = (textObject as any).__type || '普通文字';

    const updateText = (updates: Partial<fabric.ITextboxOptions>) => {
      // ⭐ 核心修复：验证 textObject 和 canvas 是否存在
      if (!textObject || !canvas) {
        console.error('updateText: textObject 或 canvas 不存在')
        return
      }
      
      // ⭐ 核心修复：字间距更新需要特殊处理
      if ('charSpacing' in updates && updates.charSpacing !== undefined) {
        // ⚠️ 重要：Fabric.js 的 charSpacing 单位是 1/1000 em，不是像素！
        // 用户输入的是像素值（px），需要转换为 1/1000 em
        // 公式：charSpacing (1/1000 em) = (px值 / fontSize) * 1000
        const fontSize = textObject.fontSize || 16 // 获取当前字体大小
        const pxValue = updates.charSpacing // 用户输入的像素值
        const newCharSpacing = (pxValue / fontSize) * 1000 // 转换为 1/1000 em
        
        // 方法1：直接设置属性（最可靠的方式）
        // 先获取旧值（使用 get 方法或直接访问）
        let oldCharSpacing = 0
        try {
          const oldCharSpacingInEm = (textObject as any).charSpacing ?? 0
          // 将旧值从 1/1000 em 转换回像素，用于显示
          oldCharSpacing = (oldCharSpacingInEm / 1000) * fontSize
        } catch (e) {
          // 如果读取失败，使用默认值
          oldCharSpacing = 0
        }
        
        // 设置新值（1/1000 em 单位）
        (textObject as any).charSpacing = newCharSpacing
        
        // 验证设置是否成功
        const actualCharSpacing = (textObject as any).charSpacing
        const actualCharSpacingInPx = (actualCharSpacing / 1000) * fontSize
        console.log('字间距更新:', { 
          oldCharSpacing, 
          newCharSpacing: pxValue, 
          actualInPx: actualCharSpacingInPx,
          actualInEm: actualCharSpacing,
          fontSize 
        })
        
        // 方法2：尝试使用 set 方法（如果存在且可用），这会触发内部更新机制和事件
        if (typeof (textObject as any).set === 'function') {
          try {
            // 使用 set 方法更新，这会触发内部更新机制和事件
            (textObject as any).set('charSpacing', newCharSpacing)
            console.log('set 方法调用成功')
          } catch (e) {
            // 如果 set 失败，我们已经用直接属性赋值了，所以继续
            console.warn('set 方法失败，但已使用直接属性赋值:', e)
          }
        } else {
          console.warn('textObject.set 不是函数，类型:', typeof (textObject as any).set)
        }
        
        // 标记对象为已修改（dirty），强制重新渲染
        // dirty 是一个属性，不是方法
        (textObject as any).dirty = true
        
        // 如果对象有 setDirty 方法，也调用它
        if (typeof (textObject as any).setDirty === 'function') {
          try {
            (textObject as any).setDirty(true)
          } catch (e) {
            // 忽略错误
          }
        }
        
        // 清除文本缓存（fabric.js 内部方法）
        if (typeof (textObject as any)._clearCache === 'function') {
          try {
            (textObject as any)._clearCache()
          } catch (e) {
            console.warn('_clearCache 调用失败:', e)
          }
        }
        
        // 重新初始化文本尺寸（这会重新计算文本的宽度和高度）
        if (typeof (textObject as any).initDimensions === 'function') {
          try {
            (textObject as any).initDimensions()
          } catch (e) {
            console.warn('initDimensions 调用失败:', e)
          }
        }
        
        // 重新计算文本边界框
        if (typeof (textObject as any).setCoords === 'function') {
          try {
            (textObject as any).setCoords()
          } catch (e) {
            console.warn('setCoords 调用失败:', e)
          }
        }
        
        // 触发对象修改事件
        canvas.fire('object:modified', { target: textObject })
        
        // 强制重新渲染（使用 renderAll 而不是 requestRenderAll，确保立即渲染）
        console.log('开始渲染画布，charSpacing:', (textObject as any).charSpacing)
        canvas.renderAll()
        
        // 延迟再次渲染，确保更新生效
        setTimeout(() => {
          console.log('延迟渲染，charSpacing:', (textObject as any).charSpacing)
          canvas.renderAll()
          // 再次触发修改事件，确保状态同步
          canvas.fire('object:modified', { target: textObject })
        }, 50)
        
        // 再次延迟渲染，确保所有更新都生效
        setTimeout(() => {
          console.log('最终渲染，charSpacing:', (textObject as any).charSpacing)
          canvas.renderAll()
        }, 100)
      } else {
        // 对于其他属性，使用 set 方法（如果存在）
        if (typeof (textObject as any).set === 'function') {
          try {
            (textObject as any).set(updates)
          } catch (e) {
            console.warn('textObject.set 调用失败，使用直接属性赋值:', e)
            // 如果 set 方法失败，直接设置属性
            Object.keys(updates).forEach(key => {
              (textObject as any)[key] = (updates as any)[key]
            })
          }
        } else {
          // 如果 set 方法不存在，直接设置属性
          Object.keys(updates).forEach(key => {
            (textObject as any)[key] = (updates as any)[key]
          })
        }
        canvas.renderAll()
      }
      // 手动触发画布变化事件，确保保存历史记录
      canvas.fire('object:modified', { target: textObject });
    }

    return (
      <>
      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden w-full">
        <div className="font-semibold text-text-primary">文字编辑 ({textType})</div>

        {/* 图层顺序 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">图层顺序</div>
          <Space>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => {
                if (!textObject || !canvas) return;
                setTimeout(() => {
                  canvas.bringForward(textObject);
                  canvas.calcOffset();
                  canvas.renderAll();
                  canvas.fire('object:modified', { target: textObject });
                }, 0);
              }}
            />
            
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!textObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.sendBackwards(textObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: textObject });
                }, 0);
              }}
            >
              下移
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignTopOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!textObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.bringToFront(textObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: textObject });
                }, 0);
              }}
            >
              顶部
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignBottomOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!textObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.sendToBack(textObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: textObject });
                }, 0);
              }}
            >
              底部
            </Button>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 角度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">角度</div>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={360}
              value={angle}
              onChange={(value) => {
                const newAngle = value || 0
                setAngle(newAngle)
                updateText({ angle: newAngle })
              }}
              formatter={(value) => `${value}°`}
            />
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 锁定/解锁 */}
        <div>
          <Button
            block
            icon={textObject.selectable ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => {
              // ⭐ 核心修复：安全地设置属性
              const currentSelectable = (textObject as any).selectable ?? true
              const currentEvented = (textObject as any).evented ?? true
              const newSelectable = !currentSelectable
              const newEvented = !currentEvented
              
              if (typeof (textObject as any).set === 'function') {
                try {
                  (textObject as any).set({ selectable: newSelectable, evented: newEvented })
                } catch (e) {
                  // 如果 set 失败，直接设置属性
                  (textObject as any).selectable = newSelectable
                  (textObject as any).evented = newEvented
                }
              } else {
                // 直接设置属性
                (textObject as any).selectable = newSelectable
                (textObject as any).evented = newEvented
              }
              canvas.renderAll()
              canvas.fire('object:modified', { target: textObject });
            }}
          >
            {textObject.selectable ? '锁定' : '解锁'}
          </Button>
        </div>

        <Divider className="my-2" />

        {/* 格式刷 */}
        <div className="mb-2">
          <Button 
            block 
            type={formatBrushActive === 'text' ? 'primary' : 'default'}
            icon={<FormatPainterOutlined />}
            onClick={() => {
              if (formatBrushActive === 'text') {
                // 取消格式刷
                setFormatBrushActive(null)
                setFormatBrushStyles(null)
                if (onFormatBrushActive) {
                  onFormatBrushActive(null, null)
                }
                message.info('已取消格式刷')
              } else {
                // 激活格式刷
                const styles = extractTextStyles(textObject)
                setFormatBrushActive('text')
                setFormatBrushStyles(styles)
                if (onFormatBrushActive) {
                  onFormatBrushActive('text', styles)
                }
                message.success('格式刷已激活，点击其他文字元素应用样式')
              }
            }}
          >
            {formatBrushActive === 'text' ? '格式刷（已激活）' : '格式刷'}
          </Button>
        </div>

        {/* 序号 */}
        <div>
          <Button
            block
            icon={<OrderedListOutlined />}
            onClick={() => {
              setBulletModalVisible(true)
            }}
          >
            序号
          </Button>
        </div>

        <Divider className="my-2" />

        {/* 复制/删除 */}
        <Space className="w-full">
          <Button 
            block 
            icon={<CopyOutlined />}
            onClick={() => {
              // 复制文字对象
              textObject.clone((cloned: fabric.Object) => {
                cloned.set({
                  left: (textObject.left || 0) + 10,
                  top: (textObject.top || 0) + 10
                })
                canvas.add(cloned)
                canvas.setActiveObject(cloned)
                canvas.renderAll()
                // 手动触发画布变化事件，确保保存历史记录
                canvas.fire('object:modified', { target: cloned });
              })
            }}
          >
            复制
          </Button>
          <Button 
            block 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => {
              try {
                // 确保文字对象和画布都存在
                if (!textObject || !canvas) {
                  message.error('请先选中有效的文字对象')
                  return
                }
                
                // 确认文字对象是否为当前选中对象
                const isActive = canvas.getActiveObject() === textObject;
                
                if (!isActive) {
                  // 如果不是当前选中对象，先将其设为选中
                  canvas.setActiveObject(textObject)
                  canvas.renderAll()
                }
                
                // 删除文字对象
                canvas.remove(textObject)
                
                // 清除选中状态
                canvas.discardActiveObject()
                
                // 强制重新计算画布偏移并渲染
                canvas.calcOffset()
                canvas.renderAll()
                
                // 手动触发画布变化事件，确保保存历史记录
                setTimeout(() => {
                  canvas.fire('object:removed', { target: textObject });
                  
                  // 额外触发onChange事件确保状态更新
                  setTimeout(() => {
                    console.log('触发画布变更更新')
                    // 这里假设外部有监听object:removed事件来处理变更
                  }, 10);
                }, 0);
                
                message.success('文字已删除')
              } catch (error) {
                console.error('删除文字对象时出错:', error)
                message.error('删除失败，请重试')
              }
            }}
          >
            删除
          </Button>
        </Space>

        <Divider className="my-2" />

        {/* 字体、字号 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">字体</div>
          <Select
            style={{ width: '100%' }}
            value={fontFamily}
            onChange={(value) => {
              setFontFamily(value)
              updateText({ fontFamily: value })
            }}
            options={[
              { label: 'Arial', value: 'Arial' },
              { label: 'Times New Roman', value: 'Times New Roman' },
              { label: 'Courier New', value: 'Courier New' },
              { label: 'Verdana', value: 'Verdana' },
            ]}
          />
        </div>
        <div>
          <div className="mb-2 text-sm text-text-secondary">字号</div>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ flex: 1 }}
              min={8}
              max={200}
              value={fontSize}
              onChange={(value) => {
                const newSize = value || 16
                setFontSize(newSize)
                updateText({ fontSize: newSize })
              }}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
          </Space.Compact>
        </div>

        {/* 新增：行高 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">行高</div>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0.5}
              max={3.0}
              step={0.1}
              value={lineHeight}
              onChange={(value) => {
                const newLineHeight = value || 1.2
                setLineHeight(newLineHeight)
                updateText({ lineHeight: newLineHeight })
              }}
            />
          </Space.Compact>
        </div>

        {/* 新增：字间距 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">字间距</div>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ flex: 1 }}
              min={-50}
              max={500}
              value={letterSpacing}
              onChange={(value) => {
                const newLetterSpacing = value || 0
                setLetterSpacing(newLetterSpacing)
                // ⭐ 核心修复：使用 updateText 函数来更新字间距
                updateText({ charSpacing: newLetterSpacing })
              }}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 文字样式 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">文字样式</div>
          <Space wrap>
            <Button
              type={textObject.fontWeight === 'bold' ? 'primary' : 'default'}
              onClick={() => {
                updateText({
                  fontWeight: textObject.fontWeight === 'bold' ? 'normal' : 'bold',
                })
              }}
            >
              加粗
            </Button>
            <Button
              type={textObject.fontStyle === 'italic' ? 'primary' : 'default'}
              onClick={() => {
                updateText({
                  fontStyle: textObject.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }}
            >
              变斜
            </Button>
            <Button
              type={textObject.underline ? 'primary' : 'default'}
              onClick={() => {
                updateText({ underline: !textObject.underline })
              }}
            >
              下划线
            </Button>
            <Button
              type={textObject.linethrough ? 'primary' : 'default'}
              onClick={() => {
                updateText({ linethrough: !textObject.linethrough })
              }}
            >
              删除线
            </Button>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 对齐 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">对齐</div>
          <Space>
            <Button
              onClick={() => updateText({ textAlign: 'left' })}
              type={textObject.textAlign === 'left' ? 'primary' : 'default'}
            >
              左
            </Button>
            <Button
              onClick={() => updateText({ textAlign: 'center' })}
              type={textObject.textAlign === 'center' ? 'primary' : 'default'}
            >
              中
            </Button>
            <Button
              onClick={() => updateText({ textAlign: 'right' })}
              type={textObject.textAlign === 'right' ? 'primary' : 'default'}
            >
              右
            </Button>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 文字颜色 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">文字颜色</div>
          <ColorPickerWithEyeDropper
            value={fill as string}
            onChange={(color) => {
              const newFill = color.toHexString()
              setFill(newFill)
              updateText({ fill: newFill })
            }}
            canvas={canvas}
            showText
          />
        </div>

        <Divider className="my-2" />

        {/* 透明度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">透明度</div>
          <Slider
            min={0}
            max={100}
            value={opacity}
            onChange={(value) => {
              const newOpacity = value / 100
              setOpacity(value)
              updateText({ opacity: newOpacity })
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={100}
              value={opacity}
              onChange={(value) => {
                const newOpacity = (value || 0) / 100
                setOpacity(value || 0)
                updateText({ opacity: newOpacity })
              }}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">%</span>
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 尺寸 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">尺寸</div>
          <Space>
            <Space.Compact>
              <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">宽</span>
              <InputNumber
                value={Math.round(textObject.width || 0)}
                onChange={(value) => {
                  updateText({ width: value || 0 })
                }}
              />
              <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
            </Space.Compact>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">高</span>
                <InputNumber
                  value={Math.round(textObject.height || 0)}
                  onChange={(value) => {
                    updateText({ height: value || 0 })
                  }}
                />
                <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
              </Space.Compact>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 位置 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">位置</div>
          <Space>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">X</span>
                <InputNumber
                  value={Math.round(textObject.left || 0)}
                  onChange={(value) => {
                    updateText({ left: value || 0 })
                  }}
                />
                <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
              </Space.Compact>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">Y</span>
                <InputNumber
                  value={Math.round(textObject.top || 0)}
                  onChange={(value) => {
                    updateText({ top: value || 0 })
                  }}
                />
                <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
              </Space.Compact>
          </Space>
        </div>
        
        {/* 新增：变形文字特殊参数控制 */}
        {(textType === 'transform' || (textObject as any).__config?.transform) && (
          <>
            <Divider className="my-2" />
            <div className="text-sm font-medium text-text-primary">变形参数</div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">X轴倾斜</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={-45}
                  max={45}
                  value={(textObject as any).skewX || 0}
                  onChange={(value) => {
                    updateText({ skewX: value || 0 })
                  }}
                  formatter={(value) => `${value}°`}
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">Y轴倾斜</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={-45}
                  max={45}
                  value={(textObject as any).skewY || 0}
                  onChange={(value) => {
                    updateText({ skewY: value || 0 })
                  }}
                  formatter={(value) => `${value}°`}
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">X轴缩放</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={(textObject as any).scaleX || 1}
                  onChange={(value) => {
                    updateText({ scaleX: value || 1 })
                  }}
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">Y轴缩放</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={(textObject as any).scaleY || 1}
                  onChange={(value) => {
                    updateText({ scaleY: value || 1 })
                  }}
                />
              </Space.Compact>
            </div>
          </>
        )}
        
        {/* 新增：3D文字特殊参数控制 */}
        {(textType === '3d' || (textObject as any).__config?.threeD) && (
          <>
            <Divider className="my-2" />
            <div className="text-sm font-medium text-text-primary">3D参数</div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">文字厚度</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={1}
                  max={50}
                  value={(textObject as any).__config?.threeD?.depth || 8}
                  onChange={(value) => {
                    // 注意：这里只能更新配置信息，实际3D效果可能需要额外的渲染处理
                    if (!(textObject as any).__config) {
                      (textObject as any).__config = { threeD: {} };
                    }
                    if (!(textObject as any).__config.threeD) {
                      (textObject as any).__config.threeD = {};
                    }
                    (textObject as any).__config.threeD.depth = value;
                    // 这里可以添加实际应用3D效果的代码
                    canvas.renderAll();
                    canvas.fire('object:modified', { target: textObject });
                  }}
                  formatter={(value) => `${value}px`}
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">X轴旋转</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={-90}
                  max={90}
                  value={(textObject as any).__config?.threeD?.rotateX || 15}
                  onChange={(value) => {
                    if (!(textObject as any).__config) {
                      (textObject as any).__config = { threeD: {} };
                    }
                    if (!(textObject as any).__config.threeD) {
                      (textObject as any).__config.threeD = {};
                    }
                    (textObject as any).__config.threeD.rotateX = value;
                    canvas.renderAll();
                    canvas.fire('object:modified', { target: textObject });
                  }}
                  formatter={(value) => `${value}°`}
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">Y轴旋转</div>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={-180}
                  max={180}
                  value={(textObject as any).__config?.threeD?.rotateY || 0}
                  onChange={(value) => {
                    if (!(textObject as any).__config) {
                      (textObject as any).__config = { threeD: {} };
                    }
                    if (!(textObject as any).__config.threeD) {
                      (textObject as any).__config.threeD = {};
                    }
                    (textObject as any).__config.threeD.rotateY = value;
                    canvas.renderAll();
                    canvas.fire('object:modified', { target: textObject });
                  }}
                  formatter={(value) => `${value}°`}
                />
              </Space.Compact>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-text-secondary">显示阴影</div>
              <Switch
                checked={(textObject as any).__config?.threeD?.shadow?.show ?? true}
                onChange={(checked) => {
                  if (!(textObject as any).__config) {
                    (textObject as any).__config = { threeD: {} };
                  }
                  if (!(textObject as any).__config.threeD) {
                    (textObject as any).__config.threeD = {};
                  }
                  if (!(textObject as any).__config.threeD.shadow) {
                    (textObject as any).__config.threeD.shadow = {};
                  }
                  (textObject as any).__config.threeD.shadow.show = checked;
                  // 应用阴影效果
                  if (checked) {
                    updateText({
                      shadow: new fabric.Shadow({
                        color: '#00000033',
                        blur: 10,
                        offsetX: 5,
                        offsetY: 5
                      })
                    });
                  } else {
                    updateText({ shadow: null });
                  }
                }}
              />
            </div>
          </>
        )}
      </div>
      {bulletModalJSX}
    </>
    )
  }

  // 图片编辑面板
  if (activePanel === 'image' && selectedObject.type === 'image') {
    const imageObject = selectedObject as fabric.Image

    const updateImage = (updates: Partial<fabric.IImageOptions>) => {
      imageObject.set(updates)
      canvas.renderAll()
    }

    return (
      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden w-full">
        <div className="font-semibold text-text-primary">图片编辑</div>

        {/* 图层顺序 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">图层顺序</div>
          <Space>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!imageObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.bringForward(imageObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: imageObject });
                }, 0);
              }}
            >
              上移
            </Button>
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!imageObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.sendBackwards(imageObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: imageObject });
                }, 0);
              }}
            >
              下移
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignTopOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!imageObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.bringToFront(imageObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: imageObject });
                }, 0);
              }}
            >
              顶部
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignBottomOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!imageObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.sendToBack(imageObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: imageObject });
                }, 0);
              }}
            >
              底部
            </Button>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 角度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">角度</div>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={360}
              value={imageAngle}
              onChange={(value) => {
                const newAngle = value || 0
                setImageAngle(newAngle)
                updateImage({ angle: newAngle })
              }}
              formatter={(value) => `${value}°`}
            />
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 锁定/解锁 */}
        <div>
          <Button
            block
            icon={imageObject.selectable ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => {
              imageObject.set({
                selectable: !imageObject.selectable,
                evented: !imageObject.evented,
              })
              canvas.renderAll()
            }}
          >
            {imageObject.selectable ? '锁定' : '解锁'}
          </Button>
        </div>

        <Divider className="my-2" />

        {/* 图片编辑工具 */}
        <div className="space-y-2">
          <div className="font-semibold text-xs text-text-secondary mb-2">图片工具</div>
          
          {/* 裁剪 */}
          <Button
            block
            size="small"
            onClick={() => {
              // 调用父组件的裁剪模式函数
              if (onEnterCropMode) {
                onEnterCropMode(imageObject);
              }
            }}
          >
            裁剪
          </Button>
          
          {/* 魔法棒抠图 */}
          <Button
            block
            size="small"
            onClick={() => {
              // 调用父组件的魔法棒模式函数
              if (onEnterMagicWandMode) {
                onEnterMagicWandMode(imageObject);
              }
            }}
          >
            魔法棒抠图
          </Button>
          
          {/* 格式刷 */}
          <Button
            block
            size="small"
            type={formatBrushActive === 'image' ? 'primary' : 'default'}
            icon={<FormatPainterOutlined />}
            onClick={() => {
              if (formatBrushActive === 'image') {
                // 取消格式刷
                setFormatBrushActive(null)
                setFormatBrushStyles(null)
                if (onFormatBrushActive) {
                  onFormatBrushActive(null, null)
                }
                message.info('已取消格式刷')
              } else {
                // 激活格式刷
                const styles = extractImageStyles(imageObject)
                setFormatBrushActive('image')
                setFormatBrushStyles(styles)
                if (onFormatBrushActive) {
                  onFormatBrushActive('image', styles)
                }
                message.success('格式刷已激活，点击其他图片元素应用样式')
              }
            }}
          >
            {formatBrushActive === 'image' ? '格式刷（已激活）' : '格式刷'}
          </Button>
          
          {/* 复制 */}
          <Button
            block
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              // 确保选中的对象存在
              if (!imageObject || !canvas) return;
              
              // 复制图片对象
              imageObject.clone((cloned: fabric.Object) => {
                // 设置克隆对象的位置稍微偏移，使其可见
                cloned.set({
                  left: (cloned.left || 0) + 10,
                  top: (cloned.top || 0) + 10,
                  selectable: true,
                  evented: true
                });
                
                // 添加克隆对象到画布
                canvas.add(cloned);
                canvas.setActiveObject(cloned);
                canvas.renderAll();
              });
            }}
          >
            复制
          </Button>
          
          {/* 删除 */}
          <Button
            block
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              try {
                console.log('【右侧边栏】删除按钮点击 - 图片编辑面板')
                console.log('图片对象状态检查:', {
                  exists: !!imageObject,
                  type: imageObject?.type,
                  canvasExists: !!canvas,
                  activeObject: canvas?.getActiveObject()?.type || '无'
                })
                
                // 确保选中的对象存在
                if (!imageObject || !canvas) {
                  console.error('无法删除: 图片对象或画布不存在')
                  message.error('请先选中有效的图片对象')
                  return;
                }
                
                // 确认图片对象是否为当前选中对象
                const isActive = canvas.getActiveObject() === imageObject;
                console.log('图片对象是否为当前选中对象:', isActive)
                
                if (!isActive) {
                  // 如果不是当前选中对象，先将其设为选中
                  console.log('设置图片对象为当前选中对象')
                  canvas.setActiveObject(imageObject)
                  canvas.renderAll()
                }
                
                console.log('开始删除图片对象:', {
                  type: imageObject.type,
                  id: (imageObject as any).id,
                  left: imageObject.left,
                  top: imageObject.top
                })
                
                // 从画布中移除对象
                canvas.remove(imageObject);
                console.log('图片对象已从画布移除')
                
                // 清除选中状态
                canvas.discardActiveObject();
                console.log('画布选中状态已清除')
                
                // 强制重新计算画布偏移并渲染
                canvas.calcOffset();
                console.log('画布偏移已重新计算')
                
                canvas.renderAll();
                console.log('画布已重新渲染')
                
                // 手动触发画布变化事件，确保保存历史记录
                setTimeout(() => {
                  console.log('触发object:removed事件 - 图片对象')
                  canvas.fire('object:removed', { target: imageObject });
                  
                  // 额外触发变更更新
                  setTimeout(() => {
                    console.log('触发画布变更更新')
                    // 这里假设外部有监听object:removed事件来处理变更
                  }, 10);
                }, 0);
                
                message.success('图片已删除')
              } catch (error) {
                console.error('删除图片对象时出错:', error)
                message.error('删除失败，请重试')
              }
            }}
          >
            删除
          </Button>
          
          {/* 消除某个区域 */}
          <Button
            block
            size="small"
            onClick={() => {
              // 调用父组件的消除区域模式函数
              if (onEnterEraseMode) {
                onEnterEraseMode(imageObject);
              }
            }}
          >
            消除区域
          </Button>
        </div>

        <Divider className="my-2" />

        {/* 透明度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">透明度</div>
          <Slider
            min={0}
            max={100}
            value={imageOpacity}
            onChange={(value) => {
              const newOpacity = value / 100
              setImageOpacity(value)
              updateImage({ opacity: newOpacity })
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={100}
              value={imageOpacity}
              onChange={(value) => {
                const newOpacity = (value || 0) / 100
                setImageOpacity(value || 0)
                updateImage({ opacity: newOpacity })
              }}
            />
            <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">%</span>
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 调色 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">亮度</div>
          <Slider
            min={-100}
            max={100}
            value={imageBrightness}
            onChange={(value) => {
              setImageBrightness(value)
              // 应用亮度调节逻辑
              const image = imageObject as any;
              if (image.filters) {
                // 移除现有亮度滤镜
                image.filters = image.filters.filter((filter: any) => filter.type !== 'brightness');
              } else {
                image.filters = [];
              }
              // 添加新亮度滤镜
              image.filters.push(new fabric.Image.filters.Brightness({
                brightness: value / 100
              }));
              // 应用滤镜
              image.applyFilters();
              canvas.renderAll();
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={-100}
              max={100}
              value={imageBrightness}
              onChange={(value) => {
                setImageBrightness(value || 0)
                // 应用亮度调节逻辑
                const image = imageObject as any;
                if (image.filters) {
                  // 移除现有亮度滤镜
                  image.filters = image.filters.filter((filter: any) => filter.type !== 'brightness');
                } else {
                  image.filters = [];
                }
                // 添加新亮度滤镜
                image.filters.push(new fabric.Image.filters.Brightness({
                  brightness: (value || 0) / 100
                }));
                // 应用滤镜
                image.applyFilters();
                canvas.renderAll();
              }}
              formatter={(value) => `${value}%`}
            />
          </Space.Compact>
        </div>

        <div>
          <div className="mb-2 text-sm text-text-secondary">对比度</div>
          <Slider
            min={-100}
            max={100}
            value={imageContrast}
            onChange={(value) => {
              setImageContrast(value)
              // 应用对比度调节逻辑
              const image = imageObject as any;
              if (image.filters) {
                // 移除现有对比度滤镜
                image.filters = image.filters.filter((filter: any) => filter.type !== 'contrast');
              } else {
                image.filters = [];
              }
              // 添加新对比度滤镜
              image.filters.push(new fabric.Image.filters.Contrast({
                contrast: value / 100
              }));
              // 应用滤镜
              image.applyFilters();
              canvas.renderAll();
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={-100}
              max={100}
              value={imageContrast}
              onChange={(value) => {
                setImageContrast(value || 0)
                // 应用对比度调节逻辑
                const image = imageObject as any;
                if (image.filters) {
                  // 移除现有对比度滤镜
                  image.filters = image.filters.filter((filter: any) => filter.type !== 'contrast');
                } else {
                  image.filters = [];
                }
                // 添加新对比度滤镜
                image.filters.push(new fabric.Image.filters.Contrast({
                  contrast: (value || 0) / 100
                }));
                // 应用滤镜
                image.applyFilters();
                canvas.renderAll();
              }}
              formatter={(value) => `${value}%`}
            />
          </Space.Compact>
        </div>

        <div>
          <div className="mb-2 text-sm text-text-secondary">饱和度</div>
          <Slider
            min={-100}
            max={100}
            value={imageSaturation}
            onChange={(value) => {
              setImageSaturation(value)
              // 应用饱和度调节逻辑
              const image = imageObject as any;
              if (image.filters) {
                // 移除现有饱和度滤镜
                image.filters = image.filters.filter((filter: any) => filter.type !== 'saturation');
              } else {
                image.filters = [];
              }
              // 添加新饱和度滤镜
              image.filters.push(new fabric.Image.filters.Saturation({
                saturation: value / 100
              }));
              // 应用滤镜
              image.applyFilters();
              canvas.renderAll();
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={-100}
              max={100}
              value={imageSaturation}
              onChange={(value) => {
                setImageSaturation(value || 0)
                // 应用饱和度调节逻辑
                const image = imageObject as any;
                if (image.filters) {
                  // 移除现有饱和度滤镜
                  image.filters = image.filters.filter((filter: any) => filter.type !== 'saturation');
                } else {
                  image.filters = [];
                }
                // 添加新饱和度滤镜
                image.filters.push(new fabric.Image.filters.Saturation({
                  saturation: (value || 0) / 100
                }));
                // 应用滤镜
                image.applyFilters();
                canvas.renderAll();
              }}
              formatter={(value) => `${value}%`}
            />
          </Space.Compact>
        </div>

        <div>
          <div className="mb-2 text-sm text-text-secondary">色温</div>
          <Slider
            min={-100}
            max={100}
            value={imageTemperature}
            onChange={(value) => {
              setImageTemperature(value)
              // 应用色温调节逻辑（模拟）
              const image = imageObject as any;
              if (image.filters) {
                // 移除现有色温相关滤镜
                image.filters = image.filters.filter((filter: any) => !['sepia', 'grayscale'].includes(filter.type));
              } else {
                image.filters = [];
              }
              // 根据色温值调整图片颜色
              if (value > 0) {
                // 暖色调（增加黄色/红色）
                image.filters.push(new fabric.Image.filters.Sepia({
                  sepia: value / 200
                }));
              } else if (value < 0) {
                // 冷色调（增加蓝色）
                image.filters.push(new fabric.Image.filters.Grayscale());
                image.filters.push(new fabric.Image.filters.Contrast({
                  contrast: Math.abs(value) / 200
                }));
              }
              // 应用滤镜
              image.applyFilters();
              canvas.renderAll();
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={-100}
              max={100}
              value={imageTemperature}
              onChange={(value) => {
                setImageTemperature(value || 0)
                // 应用色温调节逻辑（模拟）
                const image = imageObject as any;
                if (image.filters) {
                  // 移除现有色温相关滤镜
                  image.filters = image.filters.filter((filter: any) => !['sepia', 'grayscale'].includes(filter.type));
                } else {
                  image.filters = [];
                }
                // 根据色温值调整图片颜色
                if (value && value > 0) {
                  // 暖色调（增加黄色/红色）
                  image.filters.push(new fabric.Image.filters.Sepia({
                    sepia: value / 200
                  }));
                } else if (value && value < 0) {
                  // 冷色调（增加蓝色）
                  image.filters.push(new fabric.Image.filters.Grayscale());
                  image.filters.push(new fabric.Image.filters.Contrast({
                    contrast: Math.abs(value) / 200
                  }));
                }
                // 应用滤镜
                image.applyFilters();
                canvas.renderAll();
              }}
              formatter={(value) => `${value}K`}
            />
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 描边 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">描边</div>
          
          {/* 描边颜色 */}
          <div className="mb-4">
              <div className="text-xs text-text-secondary mb-2">颜色</div>
              <ColorPickerWithEyeDropper
                value={imageStrokeColor}
                onChange={(color) => {
                  setImageStrokeColor(color.toHexString())
                  updateImage({ stroke: color.toHexString() })
                }}
                canvas={canvas}
                showText
              />
            </div>
          
          {/* 描边宽度 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-secondary">宽度</span>
              <span className="text-xs text-text-secondary">{imageStrokeWidth}px</span>
            </div>
            <Slider
              min={0}
              max={50}
              value={imageStrokeWidth}
              onChange={(value) => {
                setImageStrokeWidth(value)
                updateImage({ strokeWidth: value })
              }}
            />
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={50}
                value={imageStrokeWidth}
                onChange={(value) => {
                  const newWidth = value || 0
                  setImageStrokeWidth(newWidth)
                  updateImage({ strokeWidth: newWidth })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </div>
          
          {/* 描边样式 */}
          <div>
            <div className="text-xs text-text-secondary mb-2">样式</div>
            <Radio.Group
              value={imageStrokeStyle}
              onChange={(e) => {
                const newStyle = e.target.value
                setImageStrokeStyle(newStyle)
                
                // 根据样式设置strokeDashArray
                let strokeDashArray: number[] | undefined
                switch (newStyle) {
                  case 'dashed':
                    strokeDashArray = [10, 5]
                    break
                  case 'dotted':
                    strokeDashArray = [2, 2]
                    break
                  default:
                    strokeDashArray = undefined
                }
                
                updateImage({ strokeDashArray })
              }}
              buttonStyle="solid"
            >
              <Radio.Button value="solid">实线</Radio.Button>
              <Radio.Button value="dashed">虚线</Radio.Button>
              <Radio.Button value="dotted">点线</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        <Divider className="my-2" />

        {/* 投影 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">投影</div>
          
          {/* 投影颜色 */}
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">颜色</div>
            <ColorPickerWithEyeDropper
              value={imageShadowColor}
              onChange={(color) => {
                setImageShadowColor(color.toHexString())
                // 创建Shadow对象
                const shadow = new fabric.Shadow({
                  color: color.toHexString(),
                  blur: imageShadowBlur,
                  offsetX: imageShadowOffsetX,
                  offsetY: imageShadowOffsetY
                })
                updateImage({ shadow })
              }}
              canvas={canvas}
              showText
            />

          </div>
          
          {/* 投影模糊度 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-secondary">模糊度</span>
              <span className="text-xs text-text-secondary">{imageShadowBlur}px</span>
            </div>
            <Slider
              min={0}
              max={50}
              value={imageShadowBlur}
              onChange={(value) => {
                setImageShadowBlur(value)
                // 创建Shadow对象
                const shadow = new fabric.Shadow({
                  color: imageShadowColor,
                  blur: value,
                  offsetX: imageShadowOffsetX,
                  offsetY: imageShadowOffsetY
                })
                updateImage({ shadow })
              }}
            />
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={50}
                value={imageShadowBlur}
                onChange={(value) => {
                  const newBlur = value || 0
                  setImageShadowBlur(newBlur)
                  // 创建Shadow对象
                    const shadow = new fabric.Shadow({
                      color: imageShadowColor,
                      blur: newBlur,
                      offsetX: imageShadowOffsetX,
                      offsetY: imageShadowOffsetY
                    })
                    updateImage({ shadow })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </div>
          
          {/* 投影偏移X */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-secondary">偏移X</span>
              <span className="text-xs text-text-secondary">{imageShadowOffsetX}px</span>
            </div>
            <Slider
              min={-100}
              max={100}
              value={imageShadowOffsetX}
              onChange={(value) => {
                setImageShadowOffsetX(value)
                // 创建Shadow对象
                const shadow = new fabric.Shadow({
                  color: imageShadowColor,
                  blur: imageShadowBlur,
                  offsetX: value,
                  offsetY: imageShadowOffsetY
                })
                updateImage({ shadow })
              }}
            />
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                style={{ flex: 1 }}
                min={-100}
                max={100}
                value={imageShadowOffsetX}
                onChange={(value) => {
                  const newOffsetX = value || 0
                  setImageShadowOffsetX(newOffsetX)
                  // 创建Shadow对象
                    const shadow = new fabric.Shadow({
                      color: imageShadowColor,
                      blur: imageShadowBlur,
                      offsetX: newOffsetX,
                      offsetY: imageShadowOffsetY
                    })
                    updateImage({ shadow })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </div>
          
          {/* 投影偏移Y */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-secondary">偏移Y</span>
              <span className="text-xs text-text-secondary">{imageShadowOffsetY}px</span>
            </div>
            <Slider
              min={-100}
              max={100}
              value={imageShadowOffsetY}
              onChange={(value) => {
                setImageShadowOffsetY(value)
                // 创建Shadow对象
                const shadow = new fabric.Shadow({
                  color: imageShadowColor,
                  blur: imageShadowBlur,
                  offsetX: imageShadowOffsetX,
                  offsetY: value
                })
                updateImage({ shadow })
              }}
            />
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                style={{ flex: 1 }}
                min={-100}
                max={100}
                value={imageShadowOffsetY}
                onChange={(value) => {
                  const newOffsetY = value || 0
                  setImageShadowOffsetY(newOffsetY)
                  // 创建Shadow对象
                    const shadow = new fabric.Shadow({
                      color: imageShadowColor,
                      blur: imageShadowBlur,
                      offsetX: imageShadowOffsetX,
                      offsetY: newOffsetY
                    })
                    updateImage({ shadow })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </div>
        </div>

        <Divider className="my-2" />

        {/* 尺寸 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">尺寸</div>
          <Space>
            <Space.Compact>
              <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">宽</span>
              <InputNumber
                value={Math.round(imageObject.getScaledWidth())}
                onChange={(value) => {
                  // 使用fabric.js提供的方法设置宽度
                  // 使用scaleX和scaleY来调整尺寸
                  const originalWidth = imageObject.width || 1;
                  const newScaleX = (value || originalWidth) / originalWidth;
                  updateImage({ scaleX: newScaleX });
                }}
              />
              <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
            </Space.Compact>
            <Space.Compact>
              <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">高</span>
              <InputNumber
                value={Math.round(imageObject.getScaledHeight())}
                onChange={(value) => {
                  // 使用fabric.js提供的方法设置高度
                  // 使用scaleX和scaleY来调整尺寸
                  const originalHeight = imageObject.height || 1;
                  const newScaleY = (value || originalHeight) / originalHeight;
                  updateImage({ scaleY: newScaleY });
                }}
              />
              <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
            </Space.Compact>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 位置 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">位置</div>
          <Space>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">X</span>
                <InputNumber
                  value={Math.round(imageObject.left || 0)}
                  onChange={(value) => {
                    updateImage({ left: value || 0 })
                  }}
                />
                <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
              </Space.Compact>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">Y</span>
                <InputNumber
                  value={Math.round(imageObject.top || 0)}
                  onChange={(value) => {
                    updateImage({ top: value || 0 })
                  }}
                />
                <span style={{ width: 30, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">px</span>
              </Space.Compact>
          </Space>
        </div>
      </div>
    )
  }

  // 图形编辑面板
  if (activePanel === 'shape' && selectedObject) {
    const updateShape = (updates: Partial<fabric.IObjectOptions>) => {
      selectedObject.set(updates)
      canvas.renderAll()
    }

    return (
      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden w-full">
        <div className="font-semibold text-text-primary">图形编辑</div>

        {/* 图层顺序 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">图层顺序</div>
          <Space>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!selectedObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.bringForward(selectedObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: selectedObject });
                }, 0);
              }}
            >
              上移
            </Button>
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!selectedObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.sendBackwards(selectedObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: selectedObject });
                }, 0);
              }}
            >
              下移
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignTopOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!selectedObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.bringToFront(selectedObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: selectedObject });
                }, 0);
              }}
            >
              顶部
            </Button>
            <Button
              size="small"
              icon={<VerticalAlignBottomOutlined />}
              onClick={() => {
                // 确保选中的对象存在
                if (!selectedObject) return;
                // 使用setTimeout确保操作在事件循环的下一个周期执行
                setTimeout(() => {
                  canvas.sendToBack(selectedObject);
                  // 强制重新计算画布尺寸和渲染
                  canvas.calcOffset();
                  canvas.renderAll();
                  // 手动触发画布变化事件，确保保存历史记录
                  canvas.fire('object:modified', { target: selectedObject });
                }, 0);
              }}
            >
              底部
            </Button>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 角度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">角度</div>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={360}
              value={shapeAngle}
              onChange={(value) => {
                const newAngle = value || 0
                setShapeAngle(newAngle)
                updateShape({ angle: newAngle })
              }}
              formatter={(value) => `${value}°`}
            />
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 锁定/解锁 */}
        <div>
          <Button
            block
            icon={selectedObject.selectable ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => {
              selectedObject.set({ selectable: !selectedObject.selectable, evented: !selectedObject.evented })
              canvas.renderAll()
            }}
          >
            {selectedObject.selectable ? '锁定' : '解锁'}
          </Button>
        </div>

        <Divider className="my-2" />

        {/* 格式刷 */}
        <div className="mb-2">
          <Button 
            block 
            type={formatBrushActive === 'shape' ? 'primary' : 'default'}
            icon={<FormatPainterOutlined />}
            onClick={() => {
              if (formatBrushActive === 'shape') {
                // 取消格式刷
                setFormatBrushActive(null)
                setFormatBrushStyles(null)
                if (onFormatBrushActive) {
                  onFormatBrushActive(null, null)
                }
                message.info('已取消格式刷')
              } else {
                // 激活格式刷
                const styles = extractShapeStyles(selectedObject)
                setFormatBrushActive('shape')
                setFormatBrushStyles(styles)
                if (onFormatBrushActive) {
                  onFormatBrushActive('shape', styles)
                }
                message.success('格式刷已激活，点击其他图形元素应用样式')
              }
            }}
          >
            {formatBrushActive === 'shape' ? '格式刷（已激活）' : '格式刷'}
          </Button>
        </div>

        {/* 复制/删除 */}
        <Space className="w-full">
          <Button 
            block 
            icon={<CopyOutlined />}
            onClick={() => {
              selectedObject.clone((cloned: fabric.Object) => {
                cloned.set({
                  left: (selectedObject.left || 0) + 10,
                  top: (selectedObject.top || 0) + 10
                })
                canvas.add(cloned)
                canvas.setActiveObject(cloned)
                canvas.renderAll()
              })
            }}
          >
            复制
          </Button>
          <Button 
            block 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => {
              try {
                console.log('【右侧边栏】删除按钮点击 - 图形编辑面板')
                console.log('图形对象状态检查:', {
                  exists: !!selectedObject,
                  type: selectedObject?.type,
                  canvasExists: !!canvas,
                  activeObject: canvas?.getActiveObject()?.type || '无'
                })
                
                // 确保选中的对象存在
                if (!selectedObject || !canvas) {
                  console.error('无法删除: 图形对象或画布不存在')
                  message.error('请先选中有效的图形对象')
                  return
                }
                
                // 确认图形对象是否为当前选中对象
                const isActive = canvas.getActiveObject() === selectedObject;
                console.log('图形对象是否为当前选中对象:', isActive)
                
                if (!isActive) {
                  // 如果不是当前选中对象，先将其设为选中
                  console.log('设置图形对象为当前选中对象')
                  canvas.setActiveObject(selectedObject)
                  canvas.renderAll()
                }
                
                console.log('开始删除图形对象:', {
                  type: selectedObject.type,
                  id: (selectedObject as any).id,
                  left: selectedObject.left,
                  top: selectedObject.top
                })
                
                // 从画布中移除对象
                canvas.remove(selectedObject)
                console.log('图形对象已从画布移除')
                
                // 清除选中状态
                canvas.discardActiveObject()
                console.log('画布选中状态已清除')
                
                // 强制重新计算画布偏移并渲染
                canvas.calcOffset()
                console.log('画布偏移已重新计算')
                
                canvas.renderAll()
                console.log('画布已重新渲染')
                
                // 手动触发画布变化事件，确保保存历史记录
                setTimeout(() => {
                  console.log('触发object:removed事件 - 图形对象')
                  canvas.fire('object:removed', { target: selectedObject });
                  
                  // 额外触发变更更新
                  setTimeout(() => {
                    console.log('触发画布变更更新')
                    // 这里假设外部有监听object:removed事件来处理变更
                  }, 10);
                }, 0);
                
                message.success('图形已删除')
              } catch (error) {
                console.error('删除图形对象时出错:', error)
                message.error('删除失败，请重试')
              }
            }}
          >
            删除
          </Button>
        </Space>

        <Divider className="my-2" />

        {/* 填充 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">填充</div>
          <ColorPickerWithEyeDropper
            value={shapeFill}
            onChange={(color) => {
              const newFill = color.toHexString()
              setShapeFill(newFill)
              updateShape({ fill: newFill })
            }}
            canvas={canvas}
            showText
          />
        </div>

        <Divider className="my-2" />

        {/* 描边 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">描边</div>
          
          {/* 描边颜色 */}
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">颜色</div>
            <ColorPickerWithEyeDropper
              value={shapeStroke}
              onChange={(color) => {
                const newStroke = color.toHexString()
                setShapeStroke(newStroke)
                updateShape({ stroke: newStroke })
              }}
              canvas={canvas}
              showText
            />
          </div>
          
          {/* 描边宽度 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-text-secondary">宽度</span>
              <span className="text-xs text-text-secondary">{shapeStrokeWidth}px</span>
            </div>
            <Slider
              min={0}
              max={50}
              value={shapeStrokeWidth}
              onChange={(value) => {
                setShapeStrokeWidth(value)
                updateShape({ strokeWidth: value })
              }}
            />
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={50}
                value={shapeStrokeWidth}
                onChange={(value) => {
                  const newWidth = value || 0
                  setShapeStrokeWidth(newWidth)
                  updateShape({ strokeWidth: newWidth })
                }}
              />
              <Input readOnly value="px" style={{ width: 30 }} />
            </Space.Compact>
          </div>
          
          {/* 描边样式 */}
          <div>
            <div className="text-xs text-text-secondary mb-2">样式</div>
            <Radio.Group
              value={shapeStrokeStyle}
              onChange={(e) => {
                const newStyle = e.target.value
                setShapeStrokeStyle(newStyle)
                
                // 根据样式设置strokeDashArray
                let strokeDashArray: number[] | undefined
                switch (newStyle) {
                  case 'dashed':
                    strokeDashArray = [10, 5]
                    break
                  case 'dotted':
                    strokeDashArray = [2, 2]
                    break
                  default:
                    strokeDashArray = undefined
                }
                
                updateShape({ strokeDashArray })
              }}
              buttonStyle="solid"
            >
              <Radio.Button value="solid">实线</Radio.Button>
              <Radio.Button value="dashed">虚线</Radio.Button>
              <Radio.Button value="dotted">点线</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        <Divider className="my-2" />

        {/* 圆角 */}
        {selectedObject.type === 'rect' && (
          <div>
            <div className="mb-2 text-sm text-text-secondary">圆角</div>
            <Slider
              min={0}
              max={100}
              value={shapeRadius}
              onChange={(value) => {
                setShapeRadius(value)
                // 只有矩形对象才有rx和ry属性，使用类型断言
                if (selectedObject?.type === 'rect') {
                  const rect = selectedObject as fabric.Rect
                  rect.set({ rx: value, ry: value })
                  canvas?.renderAll()
                }
              }}
            />
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={100}
                value={shapeRadius}
                onChange={(value) => {
                  const newRadius = value || 0
                  setShapeRadius(newRadius)
                  // 只有矩形对象才有rx和ry属性，使用类型断言
                  if (selectedObject?.type === 'rect') {
                    const rect = selectedObject as fabric.Rect
                    rect.set({ rx: newRadius, ry: newRadius })
                    canvas?.renderAll()
                  }
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </div>
        )}

        <Divider className="my-2" />

        {/* 透明度 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">透明度</div>
          <Slider
            min={0}
            max={100}
            value={shapeOpacity}
            onChange={(value) => {
              const newOpacity = value / 100
              setShapeOpacity(value)
              updateShape({ opacity: newOpacity })
            }}
          />
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={100}
              value={shapeOpacity}
              onChange={(value) => {
                const newOpacity = (value || 0) / 100
                setShapeOpacity(value || 0)
                updateShape({ opacity: newOpacity })
              }}
              formatter={(value) => `${value}%`}
            />
          </Space.Compact>
        </div>

        <Divider className="my-2" />

        {/* 尺寸 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">尺寸</div>
          <Space>
            <Space.Compact>
              <Input readOnly value="宽" style={{ width: 40 }} />
              <InputNumber
                value={Math.round(shapeWidth || 0)}
                onChange={(value) => {
                  const newWidth = value || 0
                  setShapeWidth(newWidth)
                  updateShape({ width: newWidth })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
            <Space.Compact>
              <Input readOnly value="高" style={{ width: 40 }} />
              <InputNumber
                value={Math.round(shapeHeight || 0)}
                onChange={(value) => {
                  const newHeight = value || 0
                  setShapeHeight(newHeight)
                  updateShape({ height: newHeight })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </Space>
        </div>

        <Divider className="my-2" />

        {/* 位置 */}
        <div>
          <div className="mb-2 text-sm text-text-secondary">位置</div>
          <Space>
            <Space.Compact>
              <Input readOnly value="X" style={{ width: 40 }} />
              <InputNumber
                value={Math.round(shapeLeft || 0)}
                onChange={(value) => {
                  const newLeft = value || 0
                  setShapeLeft(newLeft)
                  updateShape({ left: newLeft })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
            <Space.Compact>
              <Input readOnly value="Y" style={{ width: 40 }} />
              <InputNumber
                value={Math.round(shapeTop || 0)}
                onChange={(value) => {
                  const newTop = value || 0
                  setShapeTop(newTop)
                  updateShape({ top: newTop })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
          </Space>
        </div>
      </div>
    )
  }

  // 如果没有任何面板匹配，返回 null，但序号弹窗仍然可以显示
  return bulletModalJSX
}


