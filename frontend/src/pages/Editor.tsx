import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Space, Modal, Input, message } from 'antd'
import {
  HomeOutlined,
  ExportOutlined,
  PlusOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { fabric } from 'fabric'

import { useEditorStore } from '@/stores/editorStore'
import { workService } from '@/services/workService'
import { templateService } from '@/services/templateService'
import { getThemeStyles } from '@/utils/articleThemes'
import FileMenu from '@/components/editor/FileMenu'
import HistoryControls from '@/components/editor/HistoryControls'
import ExportDialog from '@/components/editor/ExportDialog'
import LeftSidebar from '@/components/editor/LeftSidebar'
import RightSidebar from '@/components/editor/RightSidebar'
import ArticlePaginationModal from '@/components/editor/ArticlePaginationModal'
import ImageCropModal from '@/components/editor/ImageCropModal'
import MagicWandModal from '@/components/editor/MagicWandModal'
import EraseModal from '@/components/editor/EraseModal'
import type { Article } from '@/types/article'

/* =========================
   常量
========================= */

const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1440
const MAX_HISTORY = 50
const THUMB_SIZE = 120
const THUMB_DEBOUNCE = 300

/* =========================
   Page 数据模型
========================= */

interface PageModel {
  id: string
  json: string
  thumbnail?: string
  history: string[]
  historyIndex: number
}

/* =========================
   工具函数
========================= */

const uuid = () =>
  crypto?.randomUUID
    ? crypto.randomUUID()
    : `page_${Date.now()}_${Math.random()}`

const createEmptyPage = (): PageModel => {
  const json = JSON.stringify({
    version: '5.3.0',
    objects: [],
    background: '#ffffff',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  })

  return {
    id: uuid(),
    json,
    thumbnail: undefined,
    history: [json],
    historyIndex: 0,
  }
}

const safeParse = (s: string) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

/* =========================
   Editor
========================= */

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setCanvasData } = useEditorStore()

  /* ---------- canvas ---------- */
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<fabric.Canvas | null>(null)

  /* ---------- pages ---------- */
  const [pages, setPages] = useState<PageModel[]>([createEmptyPage()])
  const pagesRef = useRef<PageModel[]>(pages)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const currentPageIndexRef = useRef(0)

  /* ---------- UI ---------- */
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const [zoom, setZoom] = useState(1)
  const [canvasBarVisible, setCanvasBarVisible] = useState(true)
  const [exportVisible, setExportVisible] = useState(false)
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [workName, setWorkName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [articlePaginationVisible, setArticlePaginationVisible] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [articleCanvasSize, setArticleCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const [cropTargetImage, setCropTargetImage] = useState<fabric.Image | null>(null)
  const [magicWandModalVisible, setMagicWandModalVisible] = useState(false)
  const [magicWandTargetImage, setMagicWandTargetImage] = useState<fabric.Image | null>(null)
  const [eraseModalVisible, setEraseModalVisible] = useState(false)
  const [eraseTargetImage, setEraseTargetImage] = useState<fabric.Image | null>(null)

  /* ---------- guard ---------- */
  const isApplyingRef = useRef(false)
  const thumbTimerRef = useRef<number | null>(null)
  
  /* ---------- clipboard ---------- */
  const clipboardRef = useRef<string | null>(null) // 保存复制的对象 JSON 数据
  
  /* ---------- format brush ---------- */
  const formatBrushRef = useRef<{ type: 'text' | 'image' | 'shape' | null; styles: any }>({ type: null, styles: null })
  
  /* ---------- pencil tool ---------- */
  const [isPencilModeActive, setIsPencilModeActive] = useState(false)
  const [pencilDrawMode, setPencilDrawMode] = useState<'free' | 'line'>('free')
  const [pencilAutoSmooth, setPencilAutoSmooth] = useState(true)
  const [pencilSmoothLevel, setPencilSmoothLevel] = useState(50)
  const [pencilColor, setPencilColor] = useState('#000000')
  const [pencilWidth, setPencilWidth] = useState(2)
  const [pencilStrokeLineCap, setPencilStrokeLineCap] = useState<'round' | 'butt'>('round')
  const [pencilStrokeDashArray, setPencilStrokeDashArray] = useState<number[] | null>(null)
  const [pencilOpacity, setPencilOpacity] = useState(100)
  const lineDrawingStartPointRef = useRef<{ x: number; y: number } | null>(null)
  const lineDrawingModeRef = useRef(false)
  
  // 使用 ref 存储最新的铅笔工具参数，确保在事件处理中使用最新值
  const pencilColorRef = useRef('#000000')
  const pencilWidthRef = useRef(2)
  const pencilStrokeLineCapRef = useRef<'round' | 'butt'>('round')
  const pencilStrokeDashArrayRef = useRef<number[] | null>(null)
  const pencilOpacityRef = useRef(100)
  
  // 同步状态到 ref
  useEffect(() => {
    pencilColorRef.current = pencilColor
  }, [pencilColor])
  
  useEffect(() => {
    pencilWidthRef.current = pencilWidth
  }, [pencilWidth])
  
  useEffect(() => {
    pencilStrokeLineCapRef.current = pencilStrokeLineCap
  }, [pencilStrokeLineCap])
  
  useEffect(() => {
    pencilStrokeDashArrayRef.current = pencilStrokeDashArray
  }, [pencilStrokeDashArray])
  
  useEffect(() => {
    pencilOpacityRef.current = pencilOpacity
  }, [pencilOpacity])

  /* =========================
     refs 同步
  ========================= */

  useEffect(() => {
    pagesRef.current = pages
  }, [pages])

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex
  }, [currentPageIndex])

  const currentPage = useMemo(
    () => pages[currentPageIndex],
    [pages, currentPageIndex]
  )

  /* =========================
     初始化 Fabric Canvas
  ========================= */

  useEffect(() => {
    if (!canvasElRef.current) return

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    })

    // 设置canvas元素可接收键盘事件
    const canvasElement = canvas.getElement()
    if (canvasElement) {
      canvasElement.setAttribute('tabindex', '0')
      canvasElement.style.outline = 'none'
    }

    canvasRef.current = canvas
    bindCanvasEvents(canvas)
    renderPageToCanvas(pagesRef.current[0])

    if (id) loadWork(id)

    return () => {
      canvas.dispose()
      if (thumbTimerRef.current) clearTimeout(thumbTimerRef.current)
      
      // 清理画布的键盘事件监听器
      const keyHandler = (canvas as any)._deleteKeyHandler
      const windowHandler = (canvas as any)._windowKeyHandler
      const docHandler = (canvas as any)._documentKeyHandler
      const canvasHandler = (canvas as any)._canvasKeyHandler
      const positionRestoreInterval = (canvas as any)._positionRestoreInterval
      
      if (keyHandler) {
        const canvasElement = canvas.getElement()
        if (canvasElement) {
          canvasElement.removeEventListener('keydown', keyHandler, true)
        }
        delete (canvas as any)._deleteKeyHandler
      }
      if (windowHandler) {
        window.removeEventListener('keydown', windowHandler, true)
        delete (canvas as any)._windowKeyHandler
      }
      if (docHandler) {
        document.removeEventListener('keydown', docHandler, true)
        delete (canvas as any)._documentKeyHandler
      }
      if (canvasHandler) {
        const canvasElement = canvas.getElement()
        if (canvasElement) {
          canvasElement.removeEventListener('keydown', canvasHandler, true)
        }
        delete (canvas as any)._canvasKeyHandler
      }
      if (positionRestoreInterval) {
        clearInterval(positionRestoreInterval)
        delete (canvas as any)._positionRestoreInterval
      }
    }
  }, [])

  /* =========================
     Fabric 事件绑定
  ========================= */

  // 铅笔工具：进入/退出绘制模式
  const handleEnterPencilMode = (drawMode: 'free' | 'line', autoSmooth: boolean, smoothLevel: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 更新状态
    setIsPencilModeActive(true)
    setPencilDrawMode(drawMode)
    setPencilAutoSmooth(autoSmooth)
    setPencilSmoothLevel(smoothLevel)
    
    // 根据绘制模式设置
    if (drawMode === 'free') {
      // 自由绘制模式
      canvas.isDrawingMode = true
      const brush = canvas.freeDrawingBrush
      if (brush) {
        // 确保颜色值是字符串格式，使用 ref 获取最新值
        brush.color = typeof pencilColorRef.current === 'string' 
          ? pencilColorRef.current 
          : String(pencilColorRef.current || '#000000')
        brush.width = pencilWidthRef.current
      }
      
      // 监听路径创建事件，应用平滑
      const pathCreatedHandler = (e: any) => {
        const path = e.path
        if (!path) return
        
        // ⭐ 使用 ref 获取最新的值，而不是闭包中的旧值
        const currentColor = typeof pencilColorRef.current === 'string' 
          ? pencilColorRef.current 
          : String(pencilColorRef.current || '#000000')
        const currentWidth = pencilWidthRef.current
        const currentLineCap = pencilStrokeLineCapRef.current
        const currentDashArray = pencilStrokeDashArrayRef.current
        const currentOpacity = pencilOpacityRef.current
        
        // 应用样式（确保颜色值是字符串格式）
        path.set({
          stroke: currentColor,
          strokeWidth: currentWidth,
          strokeLineCap: currentLineCap,
          strokeDashArray: currentDashArray,
          opacity: currentOpacity / 100,
        })
        
        // 应用平滑算法
        if (autoSmooth && smoothLevel > 0 && path.path) {
          const points = path.path.map((p: any) => ({ x: p[1], y: p[2] }))
          const tolerance = (smoothLevel / 100) * 10 // 根据平滑级别计算容差
          const simplified = simplifyPath(points, tolerance)
          
          // 更新路径
          if (simplified.length >= 2) {
            const newPath = simplified.map((p, i) => {
              if (i === 0) return ['M', p.x, p.y]
              return ['L', p.x, p.y]
            })
            path.set('path', newPath as any)
          }
        }
        
        // ⭐ 重要：在应用平滑后，再次确保样式正确应用（因为 set('path') 可能会重置某些属性）
        path.set({
          stroke: currentColor,
          strokeWidth: currentWidth,
          strokeLineCap: currentLineCap,
          strokeDashArray: currentDashArray,
          opacity: currentOpacity / 100,
        })
        
        canvas.renderAll()
        
        // 触发变更（保存画布状态）
        if (isApplyingRef.current) return
        syncCanvasToPage(true, true)
        setHasUnsavedChanges(true)
      }
      
      canvas.on('path:created', pathCreatedHandler)
    } else {
      // 直线绘制模式
      canvas.isDrawingMode = false
      lineDrawingModeRef.current = true
      lineDrawingStartPointRef.current = null
    }
    
    canvas.renderAll()
  }
  
  const handleExitPencilMode = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    setIsPencilModeActive(false)
    canvas.isDrawingMode = false
    lineDrawingModeRef.current = false
    lineDrawingStartPointRef.current = null
    
    // 移除路径创建事件监听
    canvas.off('path:created')
    
    canvas.renderAll()
  }
  
  // 铅笔工具：Douglas-Peucker 简化算法（用于线条平滑）
  const simplifyPath = (points: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] => {
    if (points.length <= 2) return points
    
    const sqTolerance = tolerance * tolerance
    
    const simplifyDPStep = (points: { x: number; y: number }[], first: number, last: number, sqTolerance: number, simplified: { x: number; y: number }[]): void => {
      let maxSqDist = sqTolerance
      let index = 0
      
      for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegDist(points[i], points[first], points[last])
        if (sqDist > maxSqDist) {
          index = i
          maxSqDist = sqDist
        }
      }
      
      if (maxSqDist > sqTolerance) {
        if (index - first > 1) {
          simplifyDPStep(points, first, index, sqTolerance, simplified)
        }
        simplified.push(points[index])
        if (last - index > 1) {
          simplifyDPStep(points, index, last, sqTolerance, simplified)
        }
      }
    }
    
    const getSqSegDist = (p: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
      let x = p1.x
      let y = p1.y
      let dx = p2.x - x
      let dy = p2.y - y
      
      if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
        if (t > 1) {
          x = p2.x
          y = p2.y
        } else if (t > 0) {
          x += dx * t
          y += dy * t
        }
      }
      
      dx = p.x - x
      dy = p.y - y
      return dx * dx + dy * dy
    }
    
    const simplified: { x: number; y: number }[] = [points[0]]
    simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified)
    simplified.push(points[points.length - 1])
    
    return simplified
  }

  const bindCanvasEvents = (canvas: fabric.Canvas) => {
    // 保存对象在"选择前"的位置（用于检测 fabric.js 是否自动改变了位置）
    const positionsBeforeSelection = new WeakMap<fabric.Object, { left: number; top: number }>()
    let positionRestoreInterval: number | null = null
    let isUserOperating = false // 标记用户是否在操作（拖拽、对齐等）
    
    // 在鼠标按下时保存所有对象的位置（在创建 ActiveSelection 之前）
    // 这是"选择前的状态"，用于检测 fabric.js 是否自动改变了位置
    canvas.on('mouse:down', (e: fabric.IEvent) => {
      isUserOperating = false
      
      // ⭐ 铅笔工具：直线绘制模式处理
      if (isPencilModeActive && pencilDrawMode === 'line' && lineDrawingModeRef.current) {
        const pointer = canvas.getPointer(e.e)
        
        if (!lineDrawingStartPointRef.current) {
          // 第一次点击：记录起点
          lineDrawingStartPointRef.current = { x: pointer.x, y: pointer.y }
        } else {
          // 第二次点击：创建直线
          const start = lineDrawingStartPointRef.current
          // ⭐ 使用 ref 获取最新的值
          const currentColor = typeof pencilColorRef.current === 'string' 
            ? pencilColorRef.current 
            : String(pencilColorRef.current || '#000000')
          const line = new fabric.Line([start.x, start.y, pointer.x, pointer.y], {
            stroke: currentColor,
            strokeWidth: pencilWidthRef.current,
            strokeLineCap: pencilStrokeLineCapRef.current,
            strokeDashArray: pencilStrokeDashArrayRef.current,
            opacity: pencilOpacityRef.current / 100,
            selectable: true,
            evented: true,
          })
          
          canvas.add(line)
          canvas.setActiveObject(line)
          canvas.renderAll()
          
          // 重置起点，准备下一次绘制
          lineDrawingStartPointRef.current = { x: pointer.x, y: pointer.y }
          
          // 触发变更
          setTimeout(() => {
            onChange()
          }, 10)
        }
        
        return // 阻止默认行为
      }
      
      const objects = canvas.getObjects()
      objects.forEach((obj: fabric.Object) => {
        // 确保保存的位置是有效的（不是 undefined 或 null）
        const left = typeof obj.left === 'number' ? obj.left : 0
        const top = typeof obj.top === 'number' ? obj.top : 0
        positionsBeforeSelection.set(obj, {
          left,
          top,
        })
      })
    })
    
    // 监听用户拖拽
    canvas.on('object:moving', () => {
      isUserOperating = true
    })
    
    // 监听用户操作完成（拖拽、对齐等），更新保存的位置
    canvas.on('object:modified', (e: any) => {
      const obj = e.target
      if (!obj) return
      
      // 如果是用户操作（拖拽、对齐等），更新保存的位置
      // 检查事件中是否有 userOperation 标记，或者 isUserOperating 标志
      if (isUserOperating || e.userOperation) {
        positionsBeforeSelection.set(obj, {
          left: obj.left || 0,
          top: obj.top || 0,
        })
        
        // 如果是 ActiveSelection，更新所有对象的位置
        const activeObject = canvas.getActiveObject()
        if (activeObject && activeObject.type === 'activeSelection') {
          const activeSelection = activeObject as fabric.ActiveSelection
          const objects = activeSelection.getObjects()
          objects.forEach((o: fabric.Object) => {
            positionsBeforeSelection.set(o, {
              left: o.left || 0,
              top: o.top || 0,
            })
          })
        }
      }
    })
    
    // 获取对象在画布上的绝对位置（考虑 ActiveSelection 的变换）
    const getAbsolutePosition = (obj: fabric.Object, activeSelection?: fabric.ActiveSelection): { left: number; top: number } => {
      if (activeSelection) {
        // 如果对象在 ActiveSelection 中，需要计算绝对位置
        // ActiveSelection 中的对象坐标是相对于 ActiveSelection 的
        const objLeft = obj.left || 0
        const objTop = obj.top || 0
        const selectionLeft = activeSelection.left || 0
        const selectionTop = activeSelection.top || 0
        const selectionAngle = activeSelection.angle || 0
        const selectionScaleX = activeSelection.scaleX || 1
        const selectionScaleY = activeSelection.scaleY || 1
        
        // 计算旋转后的偏移
        const rad = fabric.util.degreesToRadians(selectionAngle)
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        
        const rotatedX = objLeft * cos - objTop * sin
        const rotatedY = objLeft * sin + objTop * cos
        
        return {
          left: selectionLeft + rotatedX * selectionScaleX,
          top: selectionTop + rotatedY * selectionScaleY,
        }
      } else {
        // 如果不在 ActiveSelection 中，直接返回对象的位置
        return {
          left: typeof obj.left === 'number' ? obj.left : 0,
          top: typeof obj.top === 'number' ? obj.top : 0,
        }
      }
    }
    
    // 恢复对象位置的函数（只在 fabric.js 自动改变位置时调用）
    const restoreObjectPositions = (activeSelection: fabric.ActiveSelection) => {
      // 如果用户正在操作，不恢复位置
      if (isUserOperating) return
      
      const objects = activeSelection.getObjects()
      let hasChanges = false
      
      objects.forEach((obj: fabric.Object) => {
        const posBeforeSelection = positionsBeforeSelection.get(obj)
        
        if (posBeforeSelection) {
          // 获取对象当前的绝对位置
          const currentAbsolute = getAbsolutePosition(obj, activeSelection)
          
          // 如果位置被改变了（fabric.js 自动改变的），恢复选择前的位置
          if (Math.abs(currentAbsolute.left - posBeforeSelection.left) > 0.1 || 
              Math.abs(currentAbsolute.top - posBeforeSelection.top) > 0.1) {
            // 计算需要设置的相对位置（相对于 ActiveSelection）
            const selectionLeft = activeSelection.left || 0
            const selectionTop = activeSelection.top || 0
            const selectionAngle = activeSelection.angle || 0
            const selectionScaleX = activeSelection.scaleX || 1
            const selectionScaleY = activeSelection.scaleY || 1
            
            // 计算相对位置
            const deltaX = posBeforeSelection.left - selectionLeft
            const deltaY = posBeforeSelection.top - selectionTop
            
            // 反向旋转
            const rad = -fabric.util.degreesToRadians(selectionAngle)
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            
            const rotatedX = (deltaX * cos - deltaY * sin) / selectionScaleX
            const rotatedY = (deltaX * sin + deltaY * cos) / selectionScaleY
            
            obj.set({
              left: rotatedX,
              top: rotatedY,
            })
            obj.setCoords()
            hasChanges = true
          }
        } else {
          // 如果没有保存的位置，保存当前的绝对位置
          const absolute = getAbsolutePosition(obj, activeSelection)
          positionsBeforeSelection.set(obj, absolute)
        }
      })
      
      if (hasChanges) {
        activeSelection.setCoords()
        canvas.renderAll()
      }
    }
    
    canvas.on('selection:created', e => {
      const activeObject = canvas.getActiveObject()
      
      // 如果是多选（activeSelection），需要恢复对象的原始位置
      if (activeObject && activeObject.type === 'activeSelection') {
        const activeSelection = activeObject as fabric.ActiveSelection
        const objects = activeSelection.getObjects()
        
        // 立即恢复每个对象的位置（在 ActiveSelection 创建后立即恢复）
        // 使用同步方式立即恢复，不等待异步操作
        objects.forEach((obj: fabric.Object) => {
          const posBeforeSelection = positionsBeforeSelection.get(obj)
          if (posBeforeSelection) {
            // 获取对象当前的绝对位置
            const currentAbsolute = getAbsolutePosition(obj, activeSelection)
            
            // 如果位置被改变了，恢复选择前的位置
            if (Math.abs(currentAbsolute.left - posBeforeSelection.left) > 0.1 || 
                Math.abs(currentAbsolute.top - posBeforeSelection.top) > 0.1) {
              // 计算需要设置的相对位置（相对于 ActiveSelection）
              const selectionLeft = activeSelection.left || 0
              const selectionTop = activeSelection.top || 0
              const selectionAngle = activeSelection.angle || 0
              const selectionScaleX = activeSelection.scaleX || 1
              const selectionScaleY = activeSelection.scaleY || 1
              
              // 计算相对位置
              const deltaX = posBeforeSelection.left - selectionLeft
              const deltaY = posBeforeSelection.top - selectionTop
              
              // 反向旋转
              const rad = -fabric.util.degreesToRadians(selectionAngle)
              const cos = Math.cos(rad)
              const sin = Math.sin(rad)
              
              const rotatedX = (deltaX * cos - deltaY * sin) / selectionScaleX
              const rotatedY = (deltaX * sin + deltaY * cos) / selectionScaleY
              
              obj.set({
                left: rotatedX,
                top: rotatedY,
              })
              obj.setCoords()
            }
          } else {
            // 如果没有保存的位置，保存当前的绝对位置
            const absolute = getAbsolutePosition(obj, activeSelection)
            positionsBeforeSelection.set(obj, absolute)
          }
        })
        
        // 更新 ActiveSelection 的边界框
        activeSelection.setCoords()
        canvas.renderAll()
        
        // 使用 setTimeout 再次恢复（确保在 fabric.js 完成所有操作后）
        setTimeout(() => {
          if (canvas.getActiveObject() === activeSelection && !isUserOperating) {
            restoreObjectPositions(activeSelection)
          }
        }, 0)
        
        // 持续监控并恢复位置（每16ms检查一次，约60fps）
        // 只在 fabric.js 自动改变位置时恢复，不在用户操作时恢复
        if (positionRestoreInterval) {
          clearInterval(positionRestoreInterval)
        }
        positionRestoreInterval = window.setInterval(() => {
          if (canvas.getActiveObject() === activeSelection && !isUserOperating) {
            restoreObjectPositions(activeSelection)
          } else if (canvas.getActiveObject() !== activeSelection) {
            // 如果不再是 activeSelection，清除监控
            if (positionRestoreInterval) {
              clearInterval(positionRestoreInterval)
              positionRestoreInterval = null
            }
          }
        }, 16)
        
        // 保存 interval 引用以便清理
        ;(canvas as any)._positionRestoreInterval = positionRestoreInterval
        
        setSelectedObject(activeObject)
      } else if (activeObject && activeObject.type === 'group') {
        setSelectedObject(activeObject)
      } else {
        // 单选对象：fabric.js 在单选时不应该改变位置，所以不需要恢复
        // 只需要更新保存的位置，以防下次选中时位置被改变
        const selectedObj = e.selected?.[0] || activeObject
        if (selectedObj && selectedObj.type !== 'activeSelection' && selectedObj.type !== 'group') {
          // 更新保存的位置（使用当前位置）
          positionsBeforeSelection.set(selectedObj, {
            left: selectedObj.left || 0,
            top: selectedObj.top || 0,
          })
          
          // ⭐ 格式刷应用逻辑
          const formatBrush = formatBrushRef.current
          if (formatBrush.type && formatBrush.styles) {
            // 检查是否为同类型元素
            const isText = (selectedObj.type === 'textbox' || selectedObj.type === 'text') && formatBrush.type === 'text'
            const isImage = selectedObj.type === 'image' && formatBrush.type === 'image'
            const isShape = (selectedObj.type === 'rect' || selectedObj.type === 'circle' || selectedObj.type === 'triangle' || selectedObj.type === 'ellipse' || selectedObj.name?.includes('Emoji')) && formatBrush.type === 'shape'
            
            if (isText || isImage || isShape) {
              // 保存位置和尺寸
              const savedLeft = selectedObj.left
              const savedTop = selectedObj.top
              const savedWidth = selectedObj.width
              const savedHeight = selectedObj.height
              const savedScaleX = selectedObj.scaleX
              const savedScaleY = selectedObj.scaleY
              
              // 应用格式刷样式（排除位置和尺寸）
              selectedObj.set(formatBrush.styles)
              
              // 恢复位置和尺寸
              selectedObj.set({
                left: savedLeft,
                top: savedTop,
                width: savedWidth,
                height: savedHeight,
                scaleX: savedScaleX,
                scaleY: savedScaleY,
              })
              
              selectedObj.setCoords()
              canvas.renderAll()
              canvas.fire('object:modified', { target: selectedObj })
              
              message.success('已应用格式刷样式')
            }
          }
        }
        setSelectedObject(selectedObj || null)
      }
    })
    
    canvas.on('selection:updated', e => {
      const activeObject = canvas.getActiveObject()
      
      // 如果是多选（activeSelection），需要恢复对象的原始位置
      if (activeObject && activeObject.type === 'activeSelection') {
        const activeSelection = activeObject as fabric.ActiveSelection
        
        // 立即恢复位置
        restoreObjectPositions(activeSelection)
        
        // 使用 setTimeout 再次恢复
        setTimeout(() => {
          if (canvas.getActiveObject() === activeSelection) {
            restoreObjectPositions(activeSelection)
          }
        }, 0)
        
        setSelectedObject(activeObject)
      } else if (activeObject && activeObject.type === 'group') {
        setSelectedObject(activeObject)
      } else {
        // 单选对象：fabric.js 在单选时不应该改变位置，所以不需要恢复
        // 只需要更新保存的位置，以防下次选中时位置被改变
        const selectedObj = e.selected?.[0] || activeObject
        if (selectedObj && selectedObj.type !== 'activeSelection' && selectedObj.type !== 'group') {
          // 更新保存的位置（使用当前位置）
          positionsBeforeSelection.set(selectedObj, {
            left: selectedObj.left || 0,
            top: selectedObj.top || 0,
          })
          
          // ⭐ 格式刷应用逻辑（与 selection:created 相同）
          const formatBrush = formatBrushRef.current
          if (formatBrush.type && formatBrush.styles) {
            const isText = (selectedObj.type === 'textbox' || selectedObj.type === 'text') && formatBrush.type === 'text'
            const isImage = selectedObj.type === 'image' && formatBrush.type === 'image'
            const isShape = (selectedObj.type === 'rect' || selectedObj.type === 'circle' || selectedObj.type === 'triangle' || selectedObj.type === 'ellipse' || selectedObj.name?.includes('Emoji')) && formatBrush.type === 'shape'
            
            if (isText || isImage || isShape) {
              const savedLeft = selectedObj.left
              const savedTop = selectedObj.top
              const savedWidth = selectedObj.width
              const savedHeight = selectedObj.height
              const savedScaleX = selectedObj.scaleX
              const savedScaleY = selectedObj.scaleY
              
              selectedObj.set(formatBrush.styles)
              
              selectedObj.set({
                left: savedLeft,
                top: savedTop,
                width: savedWidth,
                height: savedHeight,
                scaleX: savedScaleX,
                scaleY: savedScaleY,
              })
              
              selectedObj.setCoords()
              canvas.renderAll()
              canvas.fire('object:modified', { target: selectedObj })
              
              message.success('已应用格式刷样式')
            }
          }
        }
        setSelectedObject(selectedObj || null)
      }
    })
    
    canvas.on('selection:cleared', () => {
      // 清除监控
      if (positionRestoreInterval) {
        clearInterval(positionRestoreInterval)
        positionRestoreInterval = null
        delete (canvas as any)._positionRestoreInterval
      }
      
      // 重置用户操作标志
      isUserOperating = false
      
      // 注意：不在取消选中时恢复位置，因为用户可能已经做了对齐等操作
      // 位置恢复只在创建 ActiveSelection 时进行，防止 fabric.js 自动改变位置
      
      setSelectedObject(null)
    })

    const onChange = () => {
      if (isApplyingRef.current) return
      syncCanvasToPage(true, true)
      setHasUnsavedChanges(true)
    }

    canvas.on('object:added', onChange)
    canvas.on('object:modified', onChange)
    canvas.on('object:removed', onChange)
    canvas.on('text:changed', onChange)
    
    // 添加键盘删除事件处理
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      
      // 检查是否在输入框、文本区域或可编辑元素中
      const isInputElement = target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable ||
          target.closest('.ant-input') ||
          target.closest('.ant-input-number') ||
          target.closest('.ant-select') ||
          target.closest('.ant-modal') ||
          target.closest('.ant-drawer')
      
      // 处理 ESC 键（退出直线绘制模式）
      if (e.key === 'Escape' && isPencilModeActive && pencilDrawMode === 'line' && lineDrawingModeRef.current) {
        lineDrawingStartPointRef.current = null
        message.info('已退出直线绘制模式，可继续绘制或切换模式')
        return
      }
      
      // 处理 Ctrl+C (复制)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isInputElement) {
        const activeObject = canvas.getActiveObject()
        
        // 检查是否处于文本编辑模式
        const isTextEditing = activeObject && 
          (activeObject.type === 'i-text' || activeObject.type === 'textbox' || activeObject.type === 'text') &&
          (activeObject as any).isEditing
        
        // 如果有选中的对象且不是处于文本编辑模式
        if (activeObject && !isTextEditing && !canvas.isDrawingMode) {
          e.preventDefault()
          e.stopPropagation()
          
          try {
            // 处理多选情况
            if (activeObject.type === 'activeSelection') {
              // 多选：复制所有选中的对象
              const activeSelection = activeObject as fabric.ActiveSelection
              const objects = activeSelection.getObjects()
              
              // 序列化所有对象
              const objectsData = objects.map(obj => obj.toJSON())
              clipboardRef.current = JSON.stringify(objectsData)
              
              message.success(`已复制 ${objects.length} 个对象`)
            } else {
              // 单选：复制单个对象
              const objectData = activeObject.toJSON()
              clipboardRef.current = JSON.stringify([objectData])
              
              message.success('已复制对象')
            }
          } catch (error) {
            console.error('复制对象失败:', error)
            message.error('复制失败')
          }
        }
        return
      }
      
      // 处理 Ctrl+V (粘贴)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isInputElement) {
        if (!clipboardRef.current) {
          return // 没有复制的内容
        }
        
        // 检查是否处于文本编辑模式
        const activeObject = canvas.getActiveObject()
        const isTextEditing = activeObject && 
          (activeObject.type === 'i-text' || activeObject.type === 'textbox' || activeObject.type === 'text') &&
          (activeObject as any).isEditing
        
        if (isTextEditing || canvas.isDrawingMode) {
          return // 文本编辑模式或绘制模式下不粘贴
        }
        
        e.preventDefault()
        e.stopPropagation()
        
        try {
          // 解析复制的对象数据
          const objectsData = JSON.parse(clipboardRef.current)
          
          if (!Array.isArray(objectsData) || objectsData.length === 0) {
            message.warning('没有可粘贴的内容')
            return
          }
          
          // 清除当前选择
          canvas.discardActiveObject()
          
          // 计算粘贴偏移量（默认偏移 20px）
          const offset = 20
          
          // 加载并添加所有复制的对象
          const loadedObjects: fabric.Object[] = []
          
          fabric.util.enlivenObjects(objectsData, (objects: fabric.Object[]) => {
            objects.forEach((obj, index) => {
              // 设置新位置（偏移）
              const originalLeft = (obj.left || 0)
              const originalTop = (obj.top || 0)
              
              obj.set({
                left: originalLeft + offset,
                top: originalTop + offset,
              })
              
              // 生成新的 ID（如果有）
              if ((obj as any).id) {
                (obj as any).id = `${(obj as any).id}_copy_${Date.now()}_${index}`
              }
              
              // 添加到画布
              canvas.add(obj)
              loadedObjects.push(obj)
            })
            
            // 如果只有一个对象，选中它；如果有多个，创建多选
            if (loadedObjects.length === 1) {
              canvas.setActiveObject(loadedObjects[0])
              setSelectedObject(loadedObjects[0])
            } else if (loadedObjects.length > 1) {
              // 创建多选
              const selection = new fabric.ActiveSelection(loadedObjects, {
                canvas: canvas,
              })
              canvas.setActiveObject(selection)
              setSelectedObject(selection)
            }
            
            // 重新渲染
            canvas.renderAll()
            
            // 触发变更
            setTimeout(() => {
              onChange()
            }, 10)
            
            message.success(`已粘贴 ${loadedObjects.length} 个对象`)
          }, 'fabric')
        } catch (error) {
          console.error('粘贴对象失败:', error)
          message.error('粘贴失败')
        }
        return
      }
      
      // 检查是否按下了删除键或退格键
      if (e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace') {
        // 已经在上面定义了 isInputElement，这里直接使用
        if (isInputElement) {
          return
        }
        
        // 获取当前选中的对象
        const activeObject = canvas.getActiveObject()
        
        // 检查是否处于文本编辑模式（IText 对象正在编辑）
        const isTextEditing = activeObject && 
          (activeObject.type === 'i-text' || activeObject.type === 'textbox' || activeObject.type === 'text') &&
          (activeObject as any).isEditing
        
        // 如果有选中的对象且不是处于文本编辑模式且不是绘制模式
        if (activeObject && !isTextEditing && !canvas.isDrawingMode) {
          // 阻止默认行为（如浏览器后退等）
          e.preventDefault()
          e.stopPropagation()
          
          try {
            // 处理多选情况
            if (activeObject.type === 'activeSelection') {
              // 多选：删除所有选中的对象
              const activeSelection = activeObject as fabric.ActiveSelection
              const objects = activeSelection.getObjects()
              
              objects.forEach((obj: fabric.Object) => {
                canvas.remove(obj)
                // 触发对象移除事件
                canvas.fire('object:removed', { target: obj })
              })
            } else {
              // 单选：删除单个对象
              canvas.remove(activeObject)
              // 触发对象移除事件
              canvas.fire('object:removed', { target: activeObject })
            }
            
            // 清除选择状态
            canvas.discardActiveObject()
            
            // 更新选中对象状态
            setSelectedObject(null)
            
            // 强制重新计算画布偏移
            canvas.calcOffset()
            
            // 重新渲染画布
            canvas.renderAll()
            
            // 手动触发变更处理
            setTimeout(() => {
              onChange()
            }, 10)
          } catch (error) {
            console.error('删除对象过程中出错:', error)
          }
        }
      }
    }
    
    // 使用window监听键盘事件（最可靠的方式）
    const windowHandler = (e: KeyboardEvent) => {
      handleKeyDown(e)
    }
    window.addEventListener('keydown', windowHandler, true) // 使用捕获阶段
    
    // 同时绑定到document（备用）
    const documentHandler = (e: KeyboardEvent) => {
      handleKeyDown(e)
    }
    document.addEventListener('keydown', documentHandler, true)
    
    // 在canvas元素上绑定键盘事件（优先）
    const canvasElement = canvas.getElement()
    if (canvasElement) {
      // 确保canvas元素可以获得焦点
      canvasElement.setAttribute('tabindex', '0')
      canvasElement.style.outline = 'none'
      
      const canvasHandler = (e: KeyboardEvent) => {
        handleKeyDown(e)
      }
      canvasElement.addEventListener('keydown', canvasHandler, true)
      
      // 添加点击事件，使canvas获得焦点
      canvasElement.addEventListener('click', () => {
        canvasElement.focus()
      }, false)
      
      // 保存canvas事件处理器引用
      ;(canvas as any)._canvasKeyHandler = canvasHandler
    }
    
    // 保存事件监听器引用，以便在需要时移除
    ;(canvas as any)._windowKeyHandler = windowHandler
    ;(canvas as any)._documentKeyHandler = documentHandler
  }

  /* =========================
     Canvas → Page 同步
  ========================= */

  const computeThumbnail = (canvas: fabric.Canvas) => {
    const multiplier = THUMB_SIZE / Math.max(CANVAS_WIDTH, CANVAS_HEIGHT)
    return canvas.toDataURL({
      format: 'png',
      quality: 0.6,
      multiplier,
    })
  }

  const scheduleThumbnail = () => {
    if (thumbTimerRef.current) clearTimeout(thumbTimerRef.current)
    thumbTimerRef.current = window.setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const thumb = computeThumbnail(canvas)
      const idx = currentPageIndexRef.current
      setPages(p => {
        const n = [...p]
        n[idx] = { ...n[idx], thumbnail: thumb }
        return n
      })
    }, THUMB_DEBOUNCE)
  }

  const syncCanvasToPage = (pushHistory: boolean, updateThumb: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const json = JSON.stringify(canvas.toJSON(['crossOrigin']))
    const idx = currentPageIndexRef.current

    setPages(p => {
      const n = [...p]
      let page = n[idx]

      if (pushHistory) {
        const h = page.history.slice(0, page.historyIndex + 1)
        h.push(json)
        page = {
          ...page,
          json,
          history: h.slice(-MAX_HISTORY),
          historyIndex: h.length - 1,
        }
      } else {
        page = { ...page, json }
      }

      n[idx] = page
      // ⭐ 核心修复：同步更新 pagesRef.current
      pagesRef.current = n
      return n
    })

    if (updateThumb) scheduleThumbnail()
  }

  /* =========================
     Page → Canvas
  ========================= */

  const renderPageToCanvas = (page: PageModel) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parsed = safeParse(page.json)
    if (!parsed) return

    isApplyingRef.current = true
    setSelectedObject(null)
    
    // 清理之前的键盘事件监听器，防止内存泄漏
    const prevKeyHandler = (canvas as any)._deleteKeyHandler
    if (prevKeyHandler) {
      document.removeEventListener('keydown', prevKeyHandler, true) // 保持与添加时相同的useCapture参数
      delete (canvas as any)._deleteKeyHandler
    }

    canvas.clear()
    canvas.loadFromJSON(parsed, () => {
      // ⭐ 核心修复：确保所有图片都加载完成后再渲染
      const objects = canvas.getObjects()
      const imageObjects = objects.filter((obj: any) => obj.type === 'image') as fabric.Image[]
      
      if (imageObjects.length > 0) {
        // 等待所有图片加载完成
        Promise.all(
          imageObjects.map((img: fabric.Image) => {
            return new Promise<void>((resolve) => {
              const checkImage = () => {
                try {
                  const imgElement = img.getElement?.() as HTMLImageElement | undefined
                  if (imgElement) {
                    if (imgElement.complete && imgElement.naturalWidth > 0) {
                      resolve()
                    } else {
                      imgElement.onload = () => resolve()
                      imgElement.onerror = () => resolve() // 即使加载失败也继续
                      // 设置超时，避免无限等待
                      setTimeout(() => resolve(), 5000)
                    }
                  } else {
                    // 如果获取不到元素，等待一下再试
                    setTimeout(() => {
                      if (img.getElement?.()) {
                        checkImage()
                      } else {
                        resolve() // 如果还是获取不到，直接 resolve
                      }
                    }, 100)
                  }
                } catch (e) {
                  resolve() // 即使出错也继续
                }
              }
              checkImage()
            })
          })
        ).then(() => {
          canvas.renderAll()
          if (!page.thumbnail) scheduleThumbnail()
          isApplyingRef.current = false
        })
      } else {
        canvas.renderAll()
        if (!page.thumbnail) scheduleThumbnail()
        isApplyingRef.current = false
      }
    }, (o: any, object: fabric.Object) => {
      // ⭐ 核心修复：在加载每个对象时，如果是图片，确保正确设置 crossOrigin
      if (object.type === 'image') {
        (object as fabric.Image).set({
          crossOrigin: 'anonymous'
        })
      }
    })
  }

  /* =========================
     Undo / Redo（跨画布）
  ========================= */

  const undo = () => {
    if (!currentPage || currentPage.historyIndex <= 0) return
    applyHistory(currentPage.historyIndex - 1)
  }

  const redo = () => {
    if (
      !currentPage ||
      currentPage.historyIndex >= currentPage.history.length - 1
    )
      return
    applyHistory(currentPage.historyIndex + 1)
  }

  const applyHistory = (index: number) => {
    const page = pagesRef.current[currentPageIndexRef.current]
    const snapshot = page.history[index]
    const parsed = safeParse(snapshot)
    if (!parsed || !canvasRef.current) return

    isApplyingRef.current = true
    canvasRef.current.loadFromJSON(parsed, () => {
      canvasRef.current!.renderAll()
      setPages(p => {
        const n = [...p]
        n[currentPageIndexRef.current] = {
          ...n[currentPageIndexRef.current],
          json: snapshot,
          historyIndex: index,
        }
        return n
      })
      scheduleThumbnail()
      isApplyingRef.current = false
    })
  }

  /* =========================
     Page 操作
  ========================= */

  const addPage = () => {
    syncCanvasToPage(false, true)
    const page = createEmptyPage()
    setPages(p => [...p, page])
    const idx = pagesRef.current.length
    setCurrentPageIndex(idx)
    currentPageIndexRef.current = idx
    renderPageToCanvas(page)
  }

  const switchPage = (idx: number) => {
    if (idx === currentPageIndex) return
    
    const targetPage = pagesRef.current[idx]
    if (!targetPage) {
      console.error(`切换画布失败：索引 ${idx} 的画布不存在`)
      message.error(`画布 ${idx + 1} 不存在`)
      return
    }
    
    
    syncCanvasToPage(false, true)
    setCurrentPageIndex(idx)
    currentPageIndexRef.current = idx
    renderPageToCanvas(targetPage)
  }

  const deletePage = (idx: number) => {
    if (pages.length <= 1) return message.warning('至少保留一个画布')
    Modal.confirm({
      title: '删除画布',
      content: '确定删除此画布？',
      okType: 'danger',
      onOk: () => {
        const next = pagesRef.current.filter((_, i) => i !== idx)
        const nextIndex = Math.max(0, idx - 1)
        setPages(next)
        setCurrentPageIndex(nextIndex)
        currentPageIndexRef.current = nextIndex
        renderPageToCanvas(next[nextIndex])
        setHasUnsavedChanges(true)
      },
    })
  }

  /* =========================
     示例编辑操作
  ========================= */

  const addText = (type: 'title' | 'subtitle' | 'body' | 'transform' | '3d' | string = 'body') => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.error('画布未初始化')
      return
    }
    
    try {
      // 为所有类型文字使用相同的基础创建方式，但位置错开以避免重叠
      const baseConfig = {
        title: { content: "主标题", fontSize: 36, fontWeight: "bold" as const, color: "#333333", y: 100 },
        subtitle: { content: "副标题", fontSize: 24, fontWeight: "600" as const, color: "#666666", y: 180 },
        body: { content: "请输入正文内容...", fontSize: 16, fontWeight: "normal" as const, color: "#444444", y: 260 },
        transform: { content: "变形文字", fontSize: 28, fontWeight: "bold" as const, color: "#e63946", y: 340 },
        "3d": { content: "3D文字", fontSize: 40, fontWeight: "bold" as const, color: "#2a9d8f", y: 420 }
      }
      
      const config = baseConfig[type as keyof typeof baseConfig] || baseConfig.body
      
      // 创建文本对象
      const textObj = new fabric.Textbox(config.content, {
        left: CANVAS_WIDTH / 2,  // 水平居中
        top: config.y,           // 垂直位置错开
        originX: 'center',       // 以中心点定位
        originY: 'center',
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        fill: config.color,      // 使用基本颜色
        textAlign: 'center' as const,  // 全部居中对齐
        width: 500,              // 统一宽度以确保文本换行行为一致
        id: `text_${type}_${Date.now()}`
      })
      
      // 添加到画布
      canvas.add(textObj)
      
      // 选中对象
      canvas.setActiveObject(textObj)
      
      // 强制渲染画布
      canvas.renderAll()
      
      // 额外的刷新步骤
      setTimeout(() => {
        canvas.renderAll()
      }, 50)
    } catch (error: any) {
      console.error('添加文字时出错:', error)
      message.error(`添加文字失败: ${error.message || '未知错误'}`)
    }
  }

  /* =========================
     图片裁剪
  ========================= */

  // 进入裁剪模式
  const handleEnterCropMode = (target: fabric.Object) => {
    if (target instanceof fabric.Image) {
      setCropTargetImage(target)
      setCropModalVisible(true)
    } else {
      message.warning('只能裁剪图片对象')
    }
  }

  // 裁剪确认回调
  const handleCropConfirm = (croppedImage: fabric.Image) => {
    syncCanvasToPage(true, true)
    setHasUnsavedChanges(true)
    setSelectedObject(croppedImage)
  }

  /* =========================
     魔法棒抠图
  ========================= */

  // 进入魔法棒模式
  const handleEnterMagicWandMode = (target: fabric.Object) => {
    if (target instanceof fabric.Image) {
      setMagicWandTargetImage(target)
      setMagicWandModalVisible(true)
    } else {
      message.warning('只能对图片对象使用魔法棒')
    }
  }

  // 魔法棒确认回调
  const handleMagicWandConfirm = (processedImage: fabric.Image) => {
    syncCanvasToPage(true, true)
    setHasUnsavedChanges(true)
    setSelectedObject(processedImage)
  }

  /* =========================
     消除区域
  ========================= */

  // 进入消除模式
  const handleEnterEraseMode = (target: fabric.Object) => {
    if (target instanceof fabric.Image) {
      setEraseTargetImage(target)
      setEraseModalVisible(true)
    } else {
      message.warning('只能对图片对象使用消除功能')
    }
  }

  // 消除确认回调
  const handleEraseConfirm = (processedImage: fabric.Image) => {
    syncCanvasToPage(true, true)
    setHasUnsavedChanges(true)
    setSelectedObject(processedImage)
  }

  /* =========================
     文章处理
  ========================= */

  // 处理文章选择
  const handleSelectArticle = (article: Article, canvasSize?: { width: number; height: number }) => {
    setSelectedArticle(article)
    // 如果提供了自定义尺寸，使用自定义尺寸；否则使用默认尺寸
    setArticleCanvasSize(canvasSize || { width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
    setArticlePaginationVisible(true)
  }

  // 解析 HTML 并转换为 Fabric.js 对象
  const parseHtmlToFabricObjects = (
    html: string,
    themeStyles: any,
    startY: number,
    maxWidth: number,
    padding: number
  ): Array<{ obj: fabric.Object; height: number; nextY: number }> => {
    const div = document.createElement('div')
    div.innerHTML = html
    const objects: Array<{ obj: fabric.Object; height: number; nextY: number }> = []
    let currentY = startY

    // 递归处理所有节点，包括文本节点
    const processNode = (node: Node, depth: number = 0): void => {
      const indent = '  '.repeat(depth)
      
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          // 文本节点，只在没有块级父元素时才创建对象
          const parent = node.parentElement
          const parentTag = parent?.tagName.toLowerCase()
          if (!parent || !['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li'].includes(parentTag || '')) {
            const fontSize = parseInt(String(themeStyles.content.fontSize).replace('px', '')) || 16
            const lineHeight = themeStyles.container.lineHeight as number || 1.8
            const textObj = new fabric.Textbox(text, {
              left: padding,
              top: currentY,
              originX: 'left',
              originY: 'top',
              fontSize,
              fontWeight: themeStyles.content.fontWeight as string || 'normal',
              fill: themeStyles.content.color as string || '#333333',
              textAlign: 'left',
              width: maxWidth,
              fontFamily: themeStyles.container.fontFamily as string || 'Arial',
              lineHeight: lineHeight,
            })
            let height = 0
            try {
              height = textObj.calcTextHeight() || fontSize * lineHeight
            } catch {
              const charWidth = fontSize * 0.7
              const estimatedLines = Math.max(1, Math.ceil((text.length * charWidth) / maxWidth))
              height = estimatedLines * fontSize * lineHeight
            }
            const nextY = currentY + height + 16
            objects.push({ obj: textObj, height, nextY })
            currentY = nextY
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const tagName = element.tagName.toLowerCase()
        const text = element.textContent?.trim() || ''
        

        // 处理列表元素
        if (tagName === 'ul' || tagName === 'ol') {
          // 处理列表，将每个 li 转换为文本行
          const listItems = element.querySelectorAll('li')
          listItems.forEach((li, liIndex) => {
            const itemText = li.textContent?.trim() || ''
            if (itemText) {
              const prefix = tagName === 'ul' ? '• ' : `${liIndex + 1}. `
              const fontSize = parseInt(String(themeStyles.content.fontSize).replace('px', '')) || 16
              const lineHeight = themeStyles.container.lineHeight as number || 1.8
              const textObj = new fabric.Textbox(prefix + itemText, {
                left: padding,
                top: currentY,
                originX: 'left',
                originY: 'top',
                fontSize,
                fontWeight: themeStyles.content.fontWeight as string || 'normal',
                fill: themeStyles.content.color as string || '#333333',
                textAlign: 'left',
                width: maxWidth,
                fontFamily: themeStyles.container.fontFamily as string || 'Arial',
                lineHeight: lineHeight,
              })
              let height = 0
              try {
                height = textObj.calcTextHeight() || fontSize * lineHeight
              } catch {
                const charWidth = fontSize * 0.7
                const estimatedLines = Math.max(1, Math.ceil((itemText.length * charWidth) / maxWidth))
                height = estimatedLines * fontSize * lineHeight
              }
              const nextY = currentY + height + 8 // 列表项间距较小
              objects.push({ obj: textObj, height, nextY })
              currentY = nextY
            }
          })
        } else if (tagName === 'li') {
          // 单独的 li 元素（不在 ul/ol 中），也处理
          const itemText = element.textContent?.trim() || ''
          if (itemText) {
            const fontSize = parseInt(String(themeStyles.content.fontSize).replace('px', '')) || 16
            const lineHeight = themeStyles.container.lineHeight as number || 1.8
            const textObj = new fabric.Textbox('• ' + itemText, {
              left: padding,
              top: currentY,
              originX: 'left',
              originY: 'top',
              fontSize,
              fontWeight: themeStyles.content.fontWeight as string || 'normal',
              fill: themeStyles.content.color as string || '#333333',
              textAlign: 'left',
              width: maxWidth,
              fontFamily: themeStyles.container.fontFamily as string || 'Arial',
              lineHeight: lineHeight,
            })
            let height = 0
            try {
              height = textObj.calcTextHeight() || fontSize * lineHeight
            } catch {
              const charWidth = fontSize * 0.7
              const estimatedLines = Math.max(1, Math.ceil((itemText.length * charWidth) / maxWidth))
              height = estimatedLines * fontSize * lineHeight
            }
            const nextY = currentY + height + 8
            objects.push({ obj: textObj, height, nextY })
            currentY = nextY
          }
        } else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          // 处理段落和标题，保留格式（加粗、斜体等）
          const processFormattedText = (el: HTMLElement, isHeading: boolean): void => {
            const fontSize = isHeading 
              ? (tagName === 'h1' ? 32 : tagName === 'h2' ? 24 : tagName === 'h3' ? 20 : tagName === 'h4' ? 18 : tagName === 'h5' ? 16 : 14)
              : parseInt(String(themeStyles.content.fontSize).replace('px', '')) || 16
            const lineHeight = isHeading ? 1.5 : (themeStyles.container.lineHeight as number || 1.8)
            const baseFontWeight = isHeading 
              ? (themeStyles.heading.fontWeight as string || 'bold')
              : (themeStyles.content.fontWeight as string || 'normal')
            const baseColor = isHeading 
              ? (themeStyles.heading.color as string || '#333333')
              : (themeStyles.content.color as string || '#333333')
            
            // 提取文本内容，保留换行和格式信息
            const extractTextWithFormat = (node: Node): string => {
              if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || ''
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childEl = node as HTMLElement
                const childTag = childEl.tagName.toLowerCase()
                
                if (childTag === 'br') {
                  return '\n'
                } else {
                  // 递归处理子节点
                  let result = ''
                  Array.from(childEl.childNodes).forEach(child => {
                    result += extractTextWithFormat(child)
                  })
                  return result
                }
              }
              return ''
            }
            
            // 提取纯文本（保留换行）
            let fullText = ''
            Array.from(el.childNodes).forEach(child => {
              fullText += extractTextWithFormat(child)
            })
            
            // 如果文本为空，尝试使用 textContent 或 innerText
            if (!fullText.trim()) {
              fullText = el.innerText || el.textContent || ''
            }
            
            // 处理 HTML 实体和换行
            // 将 HTML 实体转换为普通字符
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = fullText
            fullText = tempDiv.textContent || tempDiv.innerText || fullText
            
            // 规范化换行：多个连续换行保留为两个
            fullText = fullText.replace(/\n{3,}/g, '\n\n')
            // 移除首尾空白
            fullText = fullText.trim()
            
            if (fullText) {
              // 检查是否包含格式标签
              const hasBold = el.querySelector('strong, b')
              const hasItalic = el.querySelector('em, i')
              
              // 确定字体样式
              let fontWeight = baseFontWeight
              let fontStyle: 'normal' | 'italic' = 'normal'
              
              // 如果包含加粗标签，使用加粗
              if (hasBold) {
                fontWeight = 'bold'
              }
              
              // 如果包含斜体标签，使用斜体
              if (hasItalic) {
                fontStyle = 'italic'
              }
              
              const textObj = new fabric.Textbox(fullText, {
                left: padding,
                top: currentY,
                originX: 'left',
                originY: 'top',
                fontSize,
                fontWeight,
                fontStyle,
                fill: baseColor,
                textAlign: 'left',
                width: maxWidth,
                fontFamily: themeStyles.container.fontFamily as string || 'Arial',
                lineHeight: lineHeight,
              })
              
              let height = 0
              try {
                height = textObj.calcTextHeight() || fontSize * lineHeight
              } catch {
                const charWidth = fontSize * 0.7
                // 计算行数：考虑换行符
                const lines = fullText.split('\n')
                const estimatedLines = lines.reduce((sum, line) => {
                  return sum + Math.max(1, Math.ceil((line.length * charWidth) / maxWidth))
                }, 0)
                height = estimatedLines * fontSize * lineHeight
              }
              
              const marginBottom = isHeading
                ? (themeStyles.heading.marginBottom ? parseInt(String(themeStyles.heading.marginBottom).replace('px', '')) : 12)
                : (themeStyles.paragraph.marginBottom ? parseInt(String(themeStyles.paragraph.marginBottom).replace('px', '')) : 10)
              const nextY = currentY + height + marginBottom
              objects.push({ obj: textObj, height, nextY })
              currentY = nextY
            }
          }
          
          if (tagName.startsWith('h')) {
            // 标题元素
            processFormattedText(element, true)
          } else if (tagName === 'p') {
            // 段落元素
            processFormattedText(element, false)
          }
          
          // 如果元素为空，递归处理子节点
          if (!element.textContent?.trim()) {
            Array.from(element.childNodes).forEach(child => processNode(child, depth + 1))
          }
        } else if (tagName === 'div') {
          // div 容器，递归处理所有子节点
          Array.from(element.childNodes).forEach(child => processNode(child, depth + 1))
        } else if (['span', 'strong', 'em', 'b', 'i', 'a', 'code', 'sup'].includes(tagName)) {
          // 内联元素，不单独创建对象，文本会被父元素处理
          // 递归处理子节点（可能包含文本节点）
          Array.from(element.childNodes).forEach(child => processNode(child, depth + 1))
        } else {
          // 其他元素，如果有文本内容就处理，否则递归处理子节点
          if (text) {
            const fontSize = parseInt(String(themeStyles.content.fontSize).replace('px', '')) || 16
            const lineHeight = themeStyles.container.lineHeight as number || 1.8
            const textObj = new fabric.Textbox(text, {
              left: padding,
              top: currentY,
              originX: 'left',
              originY: 'top',
              fontSize,
              fontWeight: themeStyles.content.fontWeight as string || 'normal',
              fill: themeStyles.content.color as string || '#333333',
              textAlign: 'left',
              width: maxWidth,
              fontFamily: themeStyles.container.fontFamily as string || 'Arial',
              lineHeight: lineHeight,
            })
            let height = 0
            try {
              height = textObj.calcTextHeight() || fontSize * lineHeight
            } catch {
              const charWidth = fontSize * 0.7
              const estimatedLines = Math.max(1, Math.ceil((text.length * charWidth) / maxWidth))
              height = estimatedLines * fontSize * lineHeight
            }
            const nextY = currentY + height + 10
            objects.push({ obj: textObj, height, nextY })
            currentY = nextY
          } else {
            // 递归处理子节点
            Array.from(element.childNodes).forEach(child => processNode(child, depth + 1))
          }
        }
      }
    }

    // 处理所有节点（包括文本节点和元素节点）
    Array.from(div.childNodes).forEach(node => processNode(node, 0))
    
    // 如果处理后没有对象，尝试直接提取文本
    if (objects.length === 0 && div.textContent?.trim()) {
      const text = div.textContent.trim()
      const fontSize = parseInt(String(themeStyles.content.fontSize).replace('px', '')) || 16
      const lineHeight = themeStyles.container.lineHeight as number || 1.8
      const textObj = new fabric.Textbox(text, {
        left: padding,
        top: currentY,
        originX: 'left',
        originY: 'top',
        fontSize,
        fontWeight: themeStyles.content.fontWeight as string || 'normal',
        fill: themeStyles.content.color as string || '#333333',
        textAlign: 'left',
        width: maxWidth,
        fontFamily: themeStyles.container.fontFamily as string || 'Arial',
        lineHeight: lineHeight,
      })
      let height = 0
      try {
        height = textObj.calcTextHeight() || fontSize * lineHeight
      } catch {
        const charWidth = fontSize * 0.7
        const estimatedLines = Math.max(1, Math.ceil((text.length * charWidth) / maxWidth))
        height = estimatedLines * fontSize * lineHeight
      }
      const nextY = currentY + height + 16
      objects.push({ obj: textObj, height, nextY })
    }

    return objects
  }

  // 将文章内容应用到画布
  const applyArticleToCanvas = async (
    pages: Array<{ content: string; htmlContent?: string; pageIndex: number }>,
    article: Article
  ) => {
    const canvas = canvasRef.current
    if (!canvas) {
      message.error('画布未初始化')
      return
    }

    try {
      // 确保有足够的画布页面
      const neededPages = pages.length
      const currentPageCount = pagesRef.current.length

      // 如果需要的页面数大于当前页面数，创建新页面
      if (neededPages > currentPageCount) {
        const newPages = Array(neededPages - currentPageCount)
          .fill(null)
          .map(() => createEmptyPage())
        
        setPages(prev => [...prev, ...newPages])
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 获取主题样式
      const themeStyles = getThemeStyles(article.theme || 'default')
      const titleFontSize = parseInt(themeStyles.title.fontSize as string) || 24
      const contentFontSize = parseInt(themeStyles.content.fontSize as string) || 16
      const lineHeight = themeStyles.container.lineHeight as number || 1.8

      // 为每个页面应用内容
      for (let i = 0; i < pages.length; i++) {
        const pageData = pages[i]
        
        // 切换到对应页面
        if (i !== currentPageIndexRef.current) {
          // 先保存当前页面
          syncCanvasToPage(false, true)
          // 切换到目标页面
          currentPageIndexRef.current = i
          setCurrentPageIndex(i)
          // 等待状态更新
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // 验证切换是否成功
          if (currentPageIndexRef.current !== i) {
            currentPageIndexRef.current = i
          }
          
          // 注意：这里不调用 renderPageToCanvas，因为我们要直接操作画布添加新内容
          // 只需要确保画布引用已更新即可
        }

        const currentCanvas = canvasRef.current
        if (!currentCanvas) {
          console.error(`页面 ${i}: 画布未初始化`)
          continue
        }

        // 清空当前画布
        currentCanvas.clear()

        // 设置画布背景色
        currentCanvas.setBackgroundColor(
          themeStyles.container.backgroundColor as string || '#ffffff',
          () => currentCanvas.renderAll()
        )

        // 添加标题（只在第一页添加）
        if (i === 0) {
          const titleText = new fabric.Textbox(article.title, {
            left: CANVAS_WIDTH / 2,
            top: 60,
            originX: 'center',
            originY: 'top',
            fontSize: titleFontSize,
            fontWeight: themeStyles.title.fontWeight as string || 'bold',
            fill: themeStyles.title.color as string || '#333333',
            textAlign: 'center',
            width: CANVAS_WIDTH - 80,
            fontFamily: themeStyles.container.fontFamily as string || 'Arial',
          })
          currentCanvas.add(titleText)
        }

        // 添加内容
        let currentY = i === 0 ? 120 : 60 // 第一页从标题下方开始，其他页从顶部开始
        const padding = 40
        const maxWidth = CANVAS_WIDTH - padding * 2

        // 如果有 HTML 内容，解析 HTML；否则使用纯文本
        if (pageData.htmlContent) {
          const fabricObjects = parseHtmlToFabricObjects(
            pageData.htmlContent,
            themeStyles,
            currentY,
            maxWidth,
            padding
          )

          if (fabricObjects.length === 0) {
            // 如果 HTML 解析失败，回退到纯文本
            const paragraphs = pageData.content.split(/\n\n+/).filter(p => p.trim())
            for (const para of paragraphs) {
              if (!para.trim()) continue
              const textObj = new fabric.Textbox(para, {
                left: padding,
                top: currentY,
                originX: 'left',
                originY: 'top',
                fontSize: contentFontSize,
                fontWeight: themeStyles.content.fontWeight as string || 'normal',
                fill: themeStyles.content.color as string || '#333333',
                textAlign: 'left',
                width: maxWidth,
                fontFamily: themeStyles.container.fontFamily as string || 'Arial',
                lineHeight: lineHeight,
              })
              const textHeight = textObj.calcTextHeight() || contentFontSize * lineHeight * 2
              currentCanvas.add(textObj)
              currentY += textHeight + 20
              if (currentY > CANVAS_HEIGHT - 40) break
            }
          } else {
            // 先创建所有对象，设置初始位置（在画布外，避免闪烁）
            const objectsToAdd: Array<{ obj: fabric.Object; initialTop: number }> = []
            for (const { obj } of fabricObjects) {
              obj.set('left', padding)
              obj.set('top', -1000) // 先放在画布外
              objectsToAdd.push({ obj, initialTop: currentY })
              currentCanvas.add(obj)
            }
            
            // 渲染一次以让 Fabric.js 计算实际尺寸
            currentCanvas.renderAll()
            
            // 根据实际高度调整位置
            let actualCurrentY = currentY
            for (let idx = 0; idx < objectsToAdd.length; idx++) {
              const { obj, initialTop } = objectsToAdd[idx]
              
              // 获取实际高度
              let actualHeight = 0
              try {
                actualHeight = obj.calcTextHeight() || 0
              } catch (e) {
                // 如果 calcTextHeight 失败，尝试其他方法
                actualHeight = (obj as any).height || 0
              }
              
              // 如果高度为0或无效，使用估算值
              if (actualHeight === 0 || isNaN(actualHeight)) {
                const fontSize = (obj as any).fontSize || 16
                const lineHeight = (obj as any).lineHeight || 1.8
                const text = (obj as any).text || ''
                const charWidth = fontSize * 0.7
                const estimatedLines = Math.max(1, Math.ceil((text.length * charWidth) / maxWidth))
                actualHeight = estimatedLines * fontSize * lineHeight
              }
              
              // 设置正确的位置
              obj.set({
                top: actualCurrentY,
                left: padding,
                visible: true
              })
              
              // 强制更新对象
              obj.setCoords()
              
              // 计算下一个对象的位置（减少间距，从16改为10）
              const marginBottom = idx < objectsToAdd.length - 1 ? 10 : 0
              actualCurrentY = actualCurrentY + actualHeight + marginBottom

              // 如果超出画布高度，移除后续对象
              if (actualCurrentY > CANVAS_HEIGHT - 40) {
                for (let j = idx + 1; j < objectsToAdd.length; j++) {
                  currentCanvas.remove(objectsToAdd[j].obj)
                }
                break
              }
            }
            
            // 最终渲染
            currentCanvas.renderAll()
          }
        } else {
          // 使用纯文本（向后兼容）
          const paragraphs = pageData.content.split(/\n\n+/).filter(p => p.trim())

          for (const para of paragraphs) {
            if (!para.trim()) continue

            const textObj = new fabric.Textbox(para, {
              left: padding,
              top: currentY,
              originX: 'left',
              originY: 'top',
              fontSize: contentFontSize,
              fontWeight: themeStyles.content.fontWeight as string || 'normal',
              fill: themeStyles.content.color as string || '#333333',
              textAlign: 'left',
              width: maxWidth,
              fontFamily: themeStyles.container.fontFamily as string || 'Arial',
              lineHeight: lineHeight,
            })

            // 计算文本高度
              const textHeight = textObj.calcTextHeight() || contentFontSize * lineHeight * 2
              currentCanvas.add(textObj)
              currentY += textHeight + 10 // 减少段落间距，从20改为10

            // 如果超出画布高度，停止添加
            if (currentY > CANVAS_HEIGHT - 40) {
              break
            }
          }
        }

        // 保存当前页面（确保所有对象都被保存）
        // 确保 currentPageIndexRef 指向正确的页面
        if (currentPageIndexRef.current !== i) {
          currentPageIndexRef.current = i
        }
        
        syncCanvasToPage(true, true)
        currentCanvas.renderAll()
      }

      // 切换回第一页并渲染
      if (pages.length > 0) {
        // 先保存当前页面（如果还在其他页面）
        syncCanvasToPage(false, true)
        // 切换到第一页
        currentPageIndexRef.current = 0
        setCurrentPageIndex(0)
        // 等待状态更新
        await new Promise(resolve => setTimeout(resolve, 100))
        // 渲染第一个画布
        const firstPage = pagesRef.current[0]
        if (firstPage) {
          renderPageToCanvas(firstPage)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      message.success(`文章已成功应用到 ${pages.length} 个画布`)
      setArticlePaginationVisible(false)
      setSelectedArticle(null)
    } catch (error: any) {
      console.error('应用文章到画布失败:', error)
      message.error('应用文章失败: ' + (error.message || '未知错误'))
    }
  }

  /* =========================
     导出 PNG / JPG
  ========================= */

  const createTempCanvas = () => {
    const el = document.createElement('canvas')
    el.width = CANVAS_WIDTH
    el.height = CANVAS_HEIGHT
    el.style.display = 'none'
    document.body.appendChild(el)

    const canvas = new fabric.Canvas(el, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
    })

    return { el, canvas }
  }

  const renderPageToTempCanvas = async (
    page: PageModel,
    canvas: fabric.Canvas
  ) => {
    const parsed = JSON.parse(page.json)
    return new Promise<void>(resolve => {
      canvas.loadFromJSON(parsed, () => {
        // ⭐ 核心修复：确保所有图片都加载完成后再渲染
        const objects = canvas.getObjects()
        const imageObjects = objects.filter((obj: any) => obj.type === 'image') as fabric.Image[]
        
        if (imageObjects.length > 0) {
          // 等待所有图片加载完成
          Promise.all(
            imageObjects.map((img: fabric.Image) => {
              return new Promise<void>((imgResolve) => {
                const checkImage = () => {
                  try {
                    const imgElement = img.getElement?.() as HTMLImageElement | undefined
                    if (imgElement) {
                      if (imgElement.complete && imgElement.naturalWidth > 0) {
                        imgResolve()
                      } else {
                        imgElement.onload = () => imgResolve()
                        imgElement.onerror = () => imgResolve() // 即使加载失败也继续
                        // 设置超时，避免无限等待
                        setTimeout(() => imgResolve(), 5000)
                      }
                    } else {
                      // 如果获取不到元素，等待一下再试
                      setTimeout(() => {
                        if (img.getElement?.()) {
                          checkImage()
                        } else {
                          imgResolve() // 如果还是获取不到，直接 resolve
                        }
                      }, 100)
                    }
                  } catch (e) {
                    imgResolve() // 即使出错也继续
                  }
                }
                checkImage()
              })
            })
          ).then(() => {
            canvas.renderAll()
            resolve()
          })
        } else {
          canvas.renderAll()
          resolve()
        }
      }, (o: any, object: fabric.Object) => {
        // ⭐ 核心修复：在加载每个对象时，如果是图片，确保正确设置 crossOrigin
        if (object.type === 'image') {
          (object as fabric.Image).set({
            crossOrigin: 'anonymous'
          })
        }
      })
    })
  }

  const exportAsImage = async (
    pageIndexes: number[],
    format: 'png' | 'jpg'
  ) => {
    for (let i = 0; i < pageIndexes.length; i++) {
      const pageIndex = pageIndexes[i]
      const page = pagesRef.current[pageIndex]
      if (!page) continue

      const { el, canvas } = createTempCanvas()
      await renderPageToTempCanvas(page, canvas)

      const dataURL = canvas.toDataURL({
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: format === 'jpg' ? 0.92 : 1,
      })

      const fileName =
        pageIndexes.length > 1
          ? `画布_${pageIndex + 1}.${format}`
          : `画布.${format}`

      const link = document.createElement('a')
      link.href = dataURL
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      canvas.dispose()
      el.remove()

      if (i < pageIndexes.length - 1) {
        await new Promise(r => setTimeout(r, 400))
      }
    }
  }

  const handleExport = async (
    format: 'png' | 'jpg',
    pages: number[]   // 这是“页码”，1-based
  ) => {
    if (!pages.length) {
      message.warning('请选择至少一个画布')
      return
    }
  
    // ⭐ 核心修复：页码 → 索引
    const pageIndexes = pages
      .map(p => p - 1)
      .filter(i => i >= 0 && i < pagesRef.current.length)
  
    try {
      await exportAsImage(pageIndexes, format)
      message.success('导出完成')
    } catch (e) {
      console.error(e)
      message.error('导出失败')
    }
  }

  /* =========================
     保存 / 加载
  ========================= */

  const loadWork = async (wid: string) => {
    try {
      const w = (await workService.getWork(Number(wid))) as any
      
      if (!w || !w.canvasData) {
        return
      }
      
      // 处理可能的双重转义问题
      let canvasDataStr = w.canvasData
      if (typeof canvasDataStr === 'string') {
        // 如果字符串以引号开头和结尾，可能是双重转义的 JSON
        if (canvasDataStr.startsWith('"') && canvasDataStr.endsWith('"')) {
          try {
            canvasDataStr = JSON.parse(canvasDataStr)
          } catch {
            // 如果解析失败，使用原始字符串
          }
        }
      }
      
      const parsed = safeParse(canvasDataStr)
      
      if (!parsed) {
        console.error('画布数据解析失败')
        message.error('加载作品失败：数据格式错误')
        return
      }

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return
        }
        // 验证数组中的每个元素是否有正确的结构
        const validPages = parsed.filter((page: any) => {
          return page && typeof page === 'object' && page.json
        })
        
        if (validPages.length === 0) {
          console.error('画布数据格式无效：数组中的元素缺少 json 字段')
          message.error('加载作品失败：数据格式错误')
          return
        }
        
        setPages(validPages)
        pagesRef.current = validPages
        setCurrentPageIndex(0)
        renderPageToCanvas(validPages[0])
      } else if (typeof parsed === 'object' && parsed !== null) {
        // 兼容单个画布对象的情况
        const singlePage = {
          id: parsed.id || uuid(),
          json: parsed.json || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed)),
          thumbnail: parsed.thumbnail,
          history: parsed.history || [parsed.json || JSON.stringify(parsed)],
          historyIndex: parsed.historyIndex || 0,
        }
        setPages([singlePage])
        pagesRef.current = [singlePage]
        setCurrentPageIndex(0)
        renderPageToCanvas(singlePage)
      } else {
        console.error('画布数据格式无效：既不是数组也不是对象')
        message.error('加载作品失败：数据格式错误')
      }
    } catch (error: any) {
      console.error('加载作品失败:', error)
      if (error.response?.status === 404) {
        message.error('作品不存在')
      } else {
        message.error(`加载作品失败: ${error.message || '未知错误'}`)
      }
    }
  }

  const saveWork = async (name?: string) => {
    try {
      // 先同步当前画布到页面数据
      syncCanvasToPage(false, true)
      
      // 等待一个 tick，确保 state 更新完成
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 确保 pagesRef.current 是最新的
      const pagesToSave = pagesRef.current
      
      if (!pagesToSave || pagesToSave.length === 0) {
        message.warning('没有可保存的画布数据')
        return
      }
      
      // 验证每个页面的 json 数据是否有效
      const validPages = pagesToSave.filter(page => {
        try {
          const parsed = safeParse(page.json)
          return parsed !== null && typeof parsed === 'object'
        } catch {
          return false
        }
      })
      
      if (validPages.length === 0) {
        message.error('画布数据无效，无法保存')
        return
      }
      
      const payload = JSON.stringify(validPages)
      setCanvasData(payload)

      if (id) {
        await workService.updateWork(Number(id), {
          canvasData: payload,
          ...(name && { name }),
        })
      } else {
        if (!name) return setSaveModalVisible(true)
        const result = await workService.createWork({ name, canvasData: payload })
        // 如果创建成功，更新 URL 中的 ID
        if (result?.data?.id) {
          navigate(`/editor/${result.data.id}`, { replace: true })
        }
      }

      message.success('保存成功')
      setHasUnsavedChanges(false)
    } catch (error: any) {
      console.error('保存失败:', error)
      if (error.response?.status === 404) {
        message.error('作品不存在，无法保存')
      } else {
        message.error(`保存失败: ${error.message || '未知错误'}`)
      }
    }
  }

  /* =========================
     保存为模板
   ========================= */

  const saveAsTemplate = async () => {
    try {
      if (!templateName.trim()) {
        message.warning('请输入模板名称')
        return
      }

      // 先同步当前画布到页面数据
      syncCanvasToPage(false, true)
      
      // 等待一个 tick，确保 state 更新完成
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // 获取当前画布数据
      const pagesToSave = pagesRef.current
      if (!pagesToSave || pagesToSave.length === 0) {
        message.warning('没有可保存的画布数据')
        return
      }

      // 验证每个页面的 json 数据是否有效
      const validPages = pagesToSave.filter(page => {
        try {
          const parsed = safeParse(page.json)
          return parsed !== null && typeof parsed === 'object'
        } catch {
          return false
        }
      })
      
      if (validPages.length === 0) {
        message.error('画布数据无效，无法保存为模板')
        return
      }

      // 生成预览图（使用第一个画布的缩略图）
      // 如果缩略图太长，可能需要截断或使用 URL 而不是 base64
      let thumbnailUrl = validPages[0]?.thumbnail || undefined
      
      // 检查 thumbnailUrl 长度，如果太长则截断或移除
      if (thumbnailUrl && thumbnailUrl.length > 100000) {
        // 可以选择截断或移除
        thumbnailUrl = undefined // 或者截断: thumbnailUrl.substring(0, 100000)
      }
      
      // 保存为模板
      const canvasDataStr = JSON.stringify(validPages)
      
      await templateService.createTemplate({
        name: templateName.trim(),
        canvasData: canvasDataStr, // 传递字符串，后端会检查并处理
        thumbnailUrl,
      })

      message.success('模板保存成功')
      setSaveTemplateModalVisible(false)
      setTemplateName('')
    } catch (error: any) {
      console.error('保存模板失败:', error)
      if (error.response?.status === 400) {
        message.error(error.response.data?.error || '模板名称不能为空或已存在')
      } else {
        message.error(`保存模板失败: ${error.message || '未知错误'}`)
      }
    }
  }

  /* =========================
     应用模板
   ========================= */

  const handleApplyTemplate = async (templateData: string) => {
    try {
      
      // 处理双重转义的 JSON 字符串
      let canvasDataStr = templateData
      if (typeof canvasDataStr === 'string') {
        // 如果字符串以引号开头和结尾，可能是双重转义的 JSON
        if (canvasDataStr.startsWith('"') && canvasDataStr.endsWith('"')) {
          try {
            canvasDataStr = JSON.parse(canvasDataStr)
          } catch {
            // 如果解析失败，使用原始字符串
          }
        }
      }
      
      const parsed = safeParse(canvasDataStr)
      
      if (!parsed) {
        message.error('模板数据格式错误')
        return
      }

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          message.warning('模板数据为空')
          return
        }
        
        // 验证数组中的每个元素是否有正确的结构
        const validPages = parsed.filter((page: any) => {
          return page && typeof page === 'object' && page.json
        })
        
        if (validPages.length === 0) {
          message.error('模板数据格式无效：数组中的元素缺少 json 字段')
          return
        }
        
        const currentIdx = currentPageIndexRef.current
        
        // 如果模板只有一个画布，应用到当前选中的画布
        if (validPages.length === 1) {
          
          // 先同步当前画布状态
          syncCanvasToPage(false, true)
          
          // 等待状态更新
          await new Promise(resolve => setTimeout(resolve, 0))
          
          // 获取当前画布数据
          const currentPages = [...pagesRef.current]
          
          // 更新当前画布的数据
          if (currentPages[currentIdx]) {
            const templatePage = validPages[0]
            currentPages[currentIdx] = {
              ...currentPages[currentIdx],
              json: templatePage.json,
              thumbnail: templatePage.thumbnail || currentPages[currentIdx].thumbnail,
              history: templatePage.history || [templatePage.json],
              historyIndex: templatePage.historyIndex || 0,
            }
            
            // 更新状态
            setPages(currentPages)
            pagesRef.current = currentPages
            
            // 渲染当前画布
            renderPageToCanvas(currentPages[currentIdx])
            message.success(`模板已应用到画布 ${currentIdx + 1}`)
          } else {
            message.error(`画布 ${currentIdx + 1} 不存在`)
          }
        } else {
          // 如果模板有多个画布，替换所有画布（原有逻辑）
          
          setPages(validPages)
          pagesRef.current = validPages
          currentPageIndexRef.current = 0
          setCurrentPageIndex(0)
          
          // 渲染第一个画布
          if (validPages[0]) {
            renderPageToCanvas(validPages[0])
            message.success(`模板应用成功，已加载 ${validPages.length} 个画布`)
          } else {
            message.error('模板数据无效：第一个画布数据为空')
          }
        }
      } else if (typeof parsed === 'object' && parsed !== null) {
        // 兼容单个画布对象的情况
        const singlePage = {
          id: parsed.id || uuid(),
          json: parsed.json || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed)),
          thumbnail: parsed.thumbnail,
          history: parsed.history || [parsed.json || JSON.stringify(parsed)],
          historyIndex: parsed.historyIndex || 0,
        }
        setPages([singlePage])
        pagesRef.current = [singlePage]
        setCurrentPageIndex(0)
        renderPageToCanvas(singlePage)
        message.success('模板应用成功')
      } else {
        message.error('模板数据格式错误')
      }
    } catch (error: any) {
      console.error('应用模板失败:', error)
      message.error(`应用模板失败: ${error.message || '未知错误'}`)
    }
  }

  /* =========================
     添加图片到画布
   ========================= */
  
  const addImage = async (imageUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.error('Canvas未初始化')
      return
    }
    
    // 验证图片URL格式
    if (!imageUrl || typeof imageUrl !== 'string') {
      message.error('无效的图片URL')
      console.error('无效的图片URL:', imageUrl)
      return
    }

    try {
      const options: fabric.IImageOptions = {
        crossOrigin: 'anonymous',
      }

      // 预检查URL是否可达（简单的图片加载验证）
      const imgElement = new Image()
      imgElement.crossOrigin = 'anonymous'
      
      // 设置超时处理
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('图片加载超时')), 10000) // 10秒超时
      })
      
      // 加载图片验证
      const loadPromise = new Promise<boolean>((resolve, reject) => {
        imgElement.onload = () => resolve(true)
        imgElement.onerror = () => {
          console.error('图片URL验证失败:', imageUrl)
          reject(new Error('无法加载图片，请检查URL或网络连接'))
        }
        imgElement.src = imageUrl
      })
      
      // 尝试验证图片URL
      try {
        await Promise.race([loadPromise, timeoutPromise])
      } catch (validationError) {
        // 如果直接加载失败，尝试创建一个备用方案
        
        // 对于开发环境，我们可以提供一个备用图片用于演示
        // 这个图片URL应该指向一个可靠的公共图片服务
        const fallbackImageUrl = 'https://via.placeholder.com/400x300?text=Image+Not+Available'
        
        message.warning('无法加载原始图片，使用备用图片')
        // 直接使用fabric加载备用图片
        fabric.Image.fromURL(fallbackImageUrl, async (fallbackImg) => {
          await setupAndAddImageToCanvas(fallbackImg, canvas)
          message.warning('已使用备用图片替代，请检查原始图片URL')
        }, options)
        return
      }

      // 使用fabric.js创建图片对象
      fabric.Image.fromURL(imageUrl, async (img) => {
        await setupAndAddImageToCanvas(img, canvas)
        message.success('图片添加成功')
      }, options)
    } catch (error) {
      console.error('添加图片时发生错误:', error)
      message.error('图片添加失败，请检查图片URL或网络连接')
    }
  }
  
  // 辅助函数：将图片转换为 data URL（如果是 blob URL）
  const convertImageToDataURL = async (img: fabric.Image): Promise<string | null> => {
    try {
      const imgElement = img.getElement?.() as HTMLImageElement | undefined
      if (!imgElement || !imgElement.src) return null
      
      const src = imgElement.src
      
      // 如果已经是 data URL，直接返回
      if (src.startsWith('data:')) {
        return src
      }
      
      // 如果是 blob URL，转换为 data URL
      if (src.startsWith('blob:')) {
        try {
          const response = await fetch(src)
          const blob = await response.blob()
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          console.error('转换 blob URL 失败:', e)
          return null
        }
      }
      
      // 普通 URL，尝试转换为 data URL
      try {
        const response = await fetch(src)
        const blob = await response.blob()
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        // 如果转换失败，返回原始 URL
        return src
      }
    } catch (e) {
      console.error('转换图片失败:', e)
      return null
    }
  }

  // 辅助函数：设置图片属性并添加到画布
  const setupAndAddImageToCanvas = async (img: fabric.Image, canvas: fabric.Canvas) => {
    // ⭐ 核心修复：先将图片转换为 data URL（如果是 blob URL）
    const dataURL = await convertImageToDataURL(img)
    if (dataURL && dataURL !== img.getElement?.()?.src) {
      // 如果转换成功且与原始 URL 不同，重新创建图片对象
      try {
        const newImg = await new Promise<fabric.Image>((resolve, reject) => {
          fabric.Image.fromURL(dataURL, (newImage) => {
            if (newImage) {
              resolve(newImage)
            } else {
              reject(new Error('图片加载失败'))
            }
          }, { crossOrigin: 'anonymous' })
        })
        img = newImg
      } catch (e) {
        console.error('重新加载图片失败，使用原图片:', e)
      }
    }
    
    // 设置图片属性
    img.set({
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockUniScaling: false,
      opacity: 1,
      id: `image_${Date.now()}`,
      crossOrigin: 'anonymous'
    })
    
    // 计算图片缩放比例，使其适应画布
    let scale = 1
    const maxWidth = CANVAS_WIDTH * 0.8
    const maxHeight = CANVAS_HEIGHT * 0.8
    
    // 安全检查尺寸属性是否存在
    const imgWidth = img.width || 400
    const imgHeight = img.height || 300
    
    if (imgWidth > maxWidth || imgHeight > maxHeight) {
      const scaleX = maxWidth / imgWidth
      const scaleY = maxHeight / imgHeight
      scale = Math.min(scaleX, scaleY)
    }
    
    // 设置位置和缩放
    const displayWidth = imgWidth * scale
    const displayHeight = imgHeight * scale
    
    img.set({
      left: (canvas.width! - displayWidth) / 2,
      top: (canvas.height! - displayHeight) / 2,
      scaleX: scale,
      scaleY: scale
    })
    
    img.setCoords()
    
    // 添加到画布
    canvas.add(img)
    canvas.bringToFront(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
    
    // 延迟再次渲染，确保显示正常
    setTimeout(() => {
      canvas.requestRenderAll()
    }, 100)
    
    // 更新历史记录
    syncCanvasToPage(true)
  }

  /* =========================
     Render
   ========================= */

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部栏 */}
      <div className="h-14 border-b flex items-center px-4">
        <Space>
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')} />
          <FileMenu
            onSave={() => saveWork()}
            onNewFile={() => {
              const p = createEmptyPage()
              setPages([p])
              renderPageToCanvas(p)
            }}
            onDuplicate={() => {
              message.info('创建副本功能待实现')
            }}
            onSaveTo={() => {
              message.info('保存至功能待实现')
            }}
            onSaveAsTemplate={() => setSaveTemplateModalVisible(true)}
            onToggleRuler={() => {
              message.info('标尺功能待实现')
            }}
            rulerVisible={false}
            hasUnsavedChanges={hasUnsavedChanges}
          />
          <HistoryControls
            canUndo={currentPage?.historyIndex > 0}
            canRedo={
              currentPage &&
              currentPage.historyIndex <
                currentPage.history.length - 1
            }
            onUndo={undo}
            onRedo={redo}
          />
          <Button icon={<ExportOutlined />} onClick={() => setExportVisible(true)}>
            导出
          </Button>
        </Space>
      </div>

      {/* 编辑区 */}
      <div className="flex-1 flex pb-28">
        <LeftSidebar 
          canvas={canvasRef.current} 
          onAddText={addText}
          onAddImage={addImage}
          onApplyTemplate={handleApplyTemplate}
          onSelectArticle={handleSelectArticle}
          onEnterPencilMode={(drawMode, autoSmooth, smoothLevel) => {
            handleEnterPencilMode(drawMode, autoSmooth, smoothLevel)
          }}
          onExitPencilMode={handleExitPencilMode}
          onApplyToCanvas={(canvasIndex, canvasData, canvasCodeMap, smartTruncate) => {
            // 返回 Promise，以便串行处理
            return new Promise<void>((resolve) => {
              // 切换到指定画布并应用数据
              const originalIndex = currentPageIndexRef.current
              const targetPage = pagesRef.current[canvasIndex]
              
              if (!targetPage) {
                console.error(`画布 ${canvasIndex + 1} 不存在`)
                resolve()
                return
              }
            
            // 重要：如果目标画布不是当前画布，先保存当前画布的状态
            if (canvasIndex !== originalIndex) {
              syncCanvasToPage(false, true) // 保存当前画布，不推入历史，更新缩略图
            }
            
            // 应用数据的函数
            const applyDataToCanvas = () => {
              const targetCanvas = canvasRef.current
              if (!targetCanvas) {
                console.error(`画布 ${canvasIndex + 1} 的 canvas 对象不存在`)
                resolve()
                return
              }
              
              // 验证当前画布索引是否正确，如果不匹配则等待切换完成
              if (currentPageIndexRef.current !== canvasIndex) {
                // 如果索引不匹配，可能是切换还未完成，等待一下再重试
                setTimeout(() => {
                  if (currentPageIndexRef.current === canvasIndex) {
                    applyDataToCanvas()
                  } else {
                    console.error(`画布索引仍然不匹配：期望 ${canvasIndex}，实际 ${currentPageIndexRef.current}，跳过应用`)
                    resolve()
                  }
                }, 100)
                return
              }
              
              
              // 应用 CODE_标数据到当前画布
              // 如果没有画布分组信息，使用顺序匹配（CODE_标 1 对应第一个元素，CODE_标 2 对应第二个元素）
              let appliedCount = 0
              // 过滤文本对象：排除1个字、2个字和表情符号（与模板识别保持一致）
              const textObjects = targetCanvas.getObjects().filter((o: any) => {
                if (o.type !== 'textbox' && o.type !== 'text') return false
                
                // 排除1个字和2个字的文本元素
                const text = o.text || ''
                const trimmedText = text.trim()
                if (trimmedText.length <= 2) {
                  return false
                }
                
                // 排除表情符号（通过检查是否包含表情符号字符）
                const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
                if (emojiRegex.test(text)) {
                  return false
                }
                
                return true
              }).sort((a: any, b: any) => {
                // 按位置排序：先上后下，先左后右
                if (a.top !== b.top) return a.top - b.top
                return a.left - b.left
              })
              
              
              Object.keys(canvasData).forEach(codeKey => {
                if (codeKey.startsWith('CODE_')) {
                  const codeValue = canvasData[codeKey]
                  const element = canvasCodeMap.get(codeKey)
                  
                  if (element) {
                    // 使用顺序匹配（CODE_标 1 对应第一个元素，CODE_标 2 对应第二个元素）
                    const codeNumber = parseInt(codeKey.replace('CODE_标 ', ''))
                    let obj: any = null
                    
                    if (!isNaN(codeNumber) && codeNumber > 0 && codeNumber <= textObjects.length) {
                      obj = textObjects[codeNumber - 1]
                    }
                    
                    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
                      const maxLength = element.estimatedMaxChars || 200
                      obj.set('text', smartTruncate(String(codeValue), maxLength))
                      appliedCount++
                    }
                  }
                }
              })
              
              targetCanvas.renderAll()
              syncCanvasToPage(false, true)
              
              
              // 完成处理，resolve Promise
              resolve()
              
              // 切换回原来的画布（延迟执行，不阻塞 Promise resolve）
              if (canvasIndex !== originalIndex) {
                setTimeout(() => {
                  syncCanvasToPage(false, false)
                  switchPage(originalIndex)
                }, 200)
              }
            }
            
            // 如果目标画布不是当前画布，需要切换
            if (canvasIndex !== originalIndex) {
              // 先保存当前画布
              syncCanvasToPage(false, false)
              // 切换到目标画布
              switchPage(canvasIndex)
              
              // 等待 loadFromJSON 完成后再应用数据
              // loadFromJSON 是异步的，需要等待它完成
              // 使用轮询检查索引是否匹配，确保切换完成
              let retryCount = 0
              const maxRetries = 10
              const checkAndApply = () => {
                if (currentPageIndexRef.current === canvasIndex) {
                  applyDataToCanvas()
                } else if (retryCount < maxRetries) {
                  retryCount++
                  setTimeout(checkAndApply, 100)
                } else {
                  console.error(`画布 ${canvasIndex + 1} 切换超时，尝试直接应用数据`)
                  applyDataToCanvas()
                }
              }
              setTimeout(checkAndApply, 200) // 初始延迟
            } else {
              // 如果已经是目标画布，直接应用数据
              applyDataToCanvas()
            }
            })
          }}
        />
        <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto">
          <div 
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease'
            }}
          >
            <canvas 
              ref={canvasElRef} 
              tabIndex={0}
              style={{ outline: 'none' }}
            />
          </div>
        </div>
        <div className="w-[390px] border-l bg-white overflow-y-auto overflow-x-hidden flex-shrink-0">
          <div className="p-4 w-full max-w-full box-border">
            <RightSidebar 
              canvas={canvasRef.current} 
              selectedObject={selectedObject}
              zoom={zoom}
              onZoomChange={setZoom}
              onEnterCropMode={handleEnterCropMode}
              onEnterMagicWandMode={handleEnterMagicWandMode}
              onEnterEraseMode={handleEnterEraseMode}
              onFormatBrushActive={(type, styles) => {
                formatBrushRef.current = { type, styles }
              }}
              isPencilModeActive={isPencilModeActive}
              pencilColor={pencilColor}
              pencilWidth={pencilWidth}
              pencilStrokeLineCap={pencilStrokeLineCap}
              pencilStrokeDashArray={pencilStrokeDashArray}
              pencilOpacity={pencilOpacity}
              onPencilColorChange={setPencilColor}
              onPencilWidthChange={setPencilWidth}
              onPencilStrokeLineCapChange={setPencilStrokeLineCap}
              onPencilStrokeDashArrayChange={setPencilStrokeDashArray}
              onPencilOpacityChange={setPencilOpacity}
            />
          </div>
        </div>
      </div>

      {/* 画布条 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t">
        <div className="flex justify-center">
          <Button
            size="small"
            type="text"
            icon={canvasBarVisible ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setCanvasBarVisible(v => !v)}
          />
        </div>
        {canvasBarVisible && (
          <div className="h-[120px] flex items-center px-4 overflow-x-auto">
            {pages.map((p, i) => (
              <div
                key={p.id}
                className={`mr-3 cursor-pointer ${
                  i === currentPageIndex ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => switchPage(i)}
              >
                <div className="w-16 h-20 border relative">
                  {p.thumbnail && (
                    <img
                      src={p.thumbnail}
                      className="w-full h-full object-contain"
                    />
                  )}
                  <Button
                    size="small"
                    danger
                    type="primary"
                    icon={<DeleteOutlined />}
                    className="absolute -top-2 -right-2 z-10"
                    onClick={e => {
                      e.stopPropagation()
                      deletePage(i)
                    }}
                  />
                </div>
                <div className="text-xs text-center mt-1">
                  画布 {i + 1}
                </div>
              </div>
            ))}
            <div
              className="w-16 h-20 border-dashed border flex items-center justify-center cursor-pointer"
              onClick={addPage}
            >
              <PlusOutlined />
            </div>
          </div>
        )}
      </div>

      {/* 导出对话框 */}
      <ExportDialog
        visible={exportVisible}
        onCancel={() => setExportVisible(false)}
        onExport={handleExport}
        pageCount={pages.length}
      />

      {/* 文章分页对话框 */}
      <ArticlePaginationModal
        visible={articlePaginationVisible}
        article={selectedArticle}
        onCancel={() => {
          setArticlePaginationVisible(false)
          setSelectedArticle(null)
          setArticleCanvasSize(null)
        }}
        onConfirm={(pages) => {
          if (selectedArticle) {
            applyArticleToCanvas(pages, selectedArticle)
          }
        }}
        canvasWidth={articleCanvasSize?.width || CANVAS_WIDTH}
        canvasHeight={articleCanvasSize?.height || CANVAS_HEIGHT}
      />

      {/* 保存命名 */}
      <Modal
        open={saveModalVisible}
        onOk={() => {
          if (!workName.trim()) return
          saveWork(workName.trim())
          setSaveModalVisible(false)
          setWorkName('')
        }}
        onCancel={() => setSaveModalVisible(false)}
      >
        <Input
          placeholder="作品名称"
          value={workName}
          onChange={e => setWorkName(e.target.value)}
        />
      </Modal>

      {/* 保存为模板 */}
      <Modal
        title="保存为模板"
        open={saveTemplateModalVisible}
        onOk={saveAsTemplate}
        onCancel={() => {
          setSaveTemplateModalVisible(false)
          setTemplateName('')
        }}
        okText="保存"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2">模板名称</label>
            <Input
              placeholder="请输入模板名称（必填，最大50字符）"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              maxLength={50}
              onPressEnter={saveAsTemplate}
            />
          </div>
          <div className="text-sm text-gray-500">
            提示：模板将使用当前作品的第一页作为预览图
          </div>
        </div>
      </Modal>

      {/* 图片裁剪弹框 */}
      <ImageCropModal
        visible={cropModalVisible}
        imageObject={cropTargetImage}
        canvas={canvasRef.current}
        onCancel={() => {
          setCropModalVisible(false)
          setCropTargetImage(null)
        }}
        onConfirm={handleCropConfirm}
      />

      {/* 魔法棒抠图弹框 */}
      <MagicWandModal
        visible={magicWandModalVisible}
        imageObject={magicWandTargetImage}
        canvas={canvasRef.current}
        onCancel={() => {
          setMagicWandModalVisible(false)
          setMagicWandTargetImage(null)
        }}
        onConfirm={handleMagicWandConfirm}
      />

      {/* 消除区域弹框 */}
      <EraseModal
        visible={eraseModalVisible}
        imageObject={eraseTargetImage}
        canvas={canvasRef.current}
        onCancel={() => {
          setEraseModalVisible(false)
          setEraseTargetImage(null)
        }}
        onConfirm={handleEraseConfirm}
      />
    </div>
  )
}

