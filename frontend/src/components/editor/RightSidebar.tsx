import { useState, useEffect } from 'react'
import { Button, InputNumber, Input, Select, Slider, Space, Divider, Radio, Modal, message, Switch } from 'antd'
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
}

export default function RightSidebar({ canvas, selectedObject, onEnterCropMode, onEnterMagicWandMode, onEnterEraseMode, zoom = 1, onZoomChange }: RightSidebarProps) {
  // 所有Hooks必须在组件顶层调用
  // 面板状态
  const [activePanel, setActivePanel] = useState<'canvas' | 'text' | 'image' | 'shape' | null>(null);
  
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
    if (!selectedObject) {
      setActivePanel('canvas')
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
  }, [selectedObject])

  if (!canvas) return null

  // 画板编辑面板
  if (activePanel === 'canvas' || !selectedObject) {
    return (
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
              <InputNumber
                value={Math.round(zoom * 100)}
                min={10}
                max={500}
                formatter={(value) => `${value}%`}
                parser={(value) => parseFloat(value?.replace('%', '') || '100') / 100}
                onChange={(value) => {
                  if (value !== null) {
                    const newZoom = Math.max(0.1, Math.min(5, value / 100))
                    onZoomChange(newZoom)
                  }
                }}
                style={{ flex: 1 }}
              />
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
              // 显示尺寸调整模态框
              Modal.confirm({
                title: '调整画板尺寸',
                content: (
                  <div className="space-y-2">
                    <div className="flex items-center mb-2">
                      <span style={{ width: 40 }} className="text-sm text-text-secondary">宽</span>
                      <InputNumber 
                        id="canvas-width" 
                        placeholder="输入宽度" 
                        min={100} 
                        max={2000} 
                        defaultValue={canvas.width}
                        style={{ flex: 1 }}
                        formatter={(value) => `${value}px`}
                      />
                    </div>
                    <div className="flex items-center">
                      <span style={{ width: 40 }} className="text-sm text-text-secondary">高</span>
                      <InputNumber 
                        id="canvas-height" 
                        placeholder="输入高度" 
                        min={100} 
                        max={2000} 
                        defaultValue={canvas.height}
                        style={{ flex: 1 }}
                        formatter={(value) => `${value}px`}
                      />
                    </div>
                  </div>
                ),
                onOk: () => {
                  // 获取输入的尺寸
                  const widthInput = document.getElementById('canvas-width') as any;
                  const heightInput = document.getElementById('canvas-height') as any;
                  const newWidth = widthInput?.value || canvas.width;
                  const newHeight = heightInput?.value || canvas.height;
                  
                  // 更新画布尺寸
                  canvas.setWidth(newWidth);
                  canvas.setHeight(newHeight);
                  canvas.renderAll();
                  
                  message.success('画板尺寸已调整');
                },
                onCancel: () => {},
              });
            }}
          >
            尺寸调整
          </Button>
        </div>
      </div>
    )
  }

  // 文字编辑面板
  if (activePanel === 'text' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
    const textObject = selectedObject as fabric.Textbox
    
    // 获取文字类型（如果有设置）
    const textType = (textObject as any).__type || '普通文字';

    const updateText = (updates: Partial<fabric.ITextboxOptions>) => {
      textObject.set(updates)
      canvas.renderAll()
      // 手动触发画布变化事件，确保保存历史记录
      canvas.fire('object:modified', { target: textObject });
    }

    return (
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
              textObject.set({ selectable: !textObject.selectable, evented: !textObject.evented })
              canvas.renderAll()
              canvas.fire('object:modified', { target: textObject });
            }}
          >
            {textObject.selectable ? '锁定' : '解锁'}
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
                console.log('【右侧边栏】删除按钮点击 - 文字编辑面板')
                console.log('文字对象状态检查:', {
                  exists: !!textObject,
                  type: textObject?.type,
                  canvasExists: !!canvas,
                  activeObject: canvas?.getActiveObject()?.type || '无'
                })
                
                // 确保文字对象和画布都存在
                if (!textObject || !canvas) {
                  console.error('无法删除: 文字对象或画布不存在')
                  message.error('请先选中有效的文字对象')
                  return
                }
                
                // 确认文字对象是否为当前选中对象
                const isActive = canvas.getActiveObject() === textObject;
                console.log('文字对象是否为当前选中对象:', isActive)
                
                if (!isActive) {
                  // 如果不是当前选中对象，先将其设为选中
                  console.log('设置文字对象为当前选中对象')
                  canvas.setActiveObject(textObject)
                  canvas.renderAll()
                }
                
                console.log('开始删除文字对象:', {
                  type: textObject.type,
                  id: (textObject as any).id,
                  left: textObject.left,
                  top: textObject.top
                })
                
                // 删除文字对象
                canvas.remove(textObject)
                console.log('文字对象已从画布移除')
                
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
                  console.log('触发object:removed事件 - 文字对象')
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
              formatter={(value) => `${value}px`}
            />
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
              max={100}
              value={letterSpacing}
              onChange={(value) => {
                const newLetterSpacing = value || 0
                setLetterSpacing(newLetterSpacing)
                updateText({ charSpacing: newLetterSpacing })
              }}
              formatter={(value) => `${value}px`}
            />
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
              <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">宽</span>
              <InputNumber
                value={Math.round(textObject.width || 0)}
                onChange={(value) => {
                  updateText({ width: value || 0 })
                }}
                formatter={(value) => `${value}px`}
              />
            </Space.Compact>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">高</span>
                <InputNumber
                  value={Math.round(textObject.height || 0)}
                  onChange={(value) => {
                    updateText({ height: value || 0 })
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
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">X</span>
                <InputNumber
                  value={Math.round(textObject.left || 0)}
                  onChange={(value) => {
                    updateText({ left: value || 0 })
                  }}
                  formatter={(value) => `${value}px`}
                />
              </Space.Compact>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">Y</span>
                <InputNumber
                  value={Math.round(textObject.top || 0)}
                  onChange={(value) => {
                    updateText({ top: value || 0 })
                  }}
                  formatter={(value) => `${value}px`}
                />
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
              formatter={(value) => `${value}%`}
            />
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
                formatter={(value) => `${value}px`}
              />
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
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">X</span>
                <InputNumber
                  value={Math.round(imageObject.left || 0)}
                  onChange={(value) => {
                    updateImage({ left: value || 0 })
                  }}
                  formatter={(value) => `${value}px`}
                />
              </Space.Compact>
            <Space.Compact>
                <span style={{ width: 40, display: 'inline-block', textAlign: 'center', height: 32, lineHeight: '32px' }} className="text-sm text-text-secondary">Y</span>
                <InputNumber
                  value={Math.round(imageObject.top || 0)}
                  onChange={(value) => {
                    updateImage({ top: value || 0 })
                  }}
                  formatter={(value) => `${value}px`}
                />
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

  return null
}


