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
import FileMenu from '@/components/editor/FileMenu'
import HistoryControls from '@/components/editor/HistoryControls'
import ExportDialog from '@/components/editor/ExportDialog'
import LeftSidebar from '@/components/editor/LeftSidebar'
import RightSidebar from '@/components/editor/RightSidebar'

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

  /* ---------- guard ---------- */
  const isApplyingRef = useRef(false)
  const thumbTimerRef = useRef<number | null>(null)

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

    canvasRef.current = canvas
    bindCanvasEvents(canvas)
    renderPageToCanvas(pagesRef.current[0])

    if (id) loadWork(id)

    return () => {
      canvas.dispose()
      if (thumbTimerRef.current) clearTimeout(thumbTimerRef.current)
    }
  }, [])

  /* =========================
     Fabric 事件绑定
  ========================= */

  const bindCanvasEvents = (canvas: fabric.Canvas) => {
    canvas.on('selection:created', e => setSelectedObject(e.selected?.[0] || null))
    canvas.on('selection:updated', e => setSelectedObject(e.selected?.[0] || null))
    canvas.on('selection:cleared', () => setSelectedObject(null))

    const onChange = () => {
      if (isApplyingRef.current) return
      syncCanvasToPage(true, true)
      setHasUnsavedChanges(true)
    }

    canvas.on('object:added', onChange)
    canvas.on('object:modified', onChange)
    canvas.on('object:removed', onChange)
    canvas.on('text:changed', onChange)
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

    const json = JSON.stringify(canvas.toJSON())
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

    canvas.clear()
    canvas.loadFromJSON(parsed, () => {
      canvas.renderAll()
      if (!page.thumbnail) scheduleThumbnail()
      isApplyingRef.current = false
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
    
    console.log(`切换到画布 ${idx + 1}:`, {
      id: targetPage.id,
      hasJson: !!targetPage.json,
      jsonLength: targetPage.json?.length || 0
    })
    
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

  const addText = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const t = new fabric.Textbox('文本', {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      originX: 'center',
      originY: 'center',
      fontSize: 24,
    })
    canvas.add(t)
    canvas.setActiveObject(t)
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
        canvas.renderAll()
        resolve()
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
      console.log('加载作品数据:', w)
      
      if (!w || !w.canvasData) {
        console.warn('作品数据为空，使用默认画布')
        return
      }
      
      // 处理可能的双重转义问题
      let canvasDataStr = w.canvasData
      if (typeof canvasDataStr === 'string') {
        // 如果字符串以引号开头和结尾，可能是双重转义的 JSON
        if (canvasDataStr.startsWith('"') && canvasDataStr.endsWith('"')) {
          try {
            canvasDataStr = JSON.parse(canvasDataStr)
            console.log('解除了双重转义')
          } catch {
            // 如果解析失败，使用原始字符串
          }
        }
      }
      
      const parsed = safeParse(canvasDataStr)
      console.log('解析后的画布数据:', parsed)
      console.log('是否为数组:', Array.isArray(parsed))
      
      if (!parsed) {
        console.error('画布数据解析失败')
        message.error('加载作品失败：数据格式错误')
        return
      }

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          console.warn('画布数据为空数组，使用默认画布')
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
        
        console.log(`成功加载 ${validPages.length} 个画布`)
        setPages(validPages)
        pagesRef.current = validPages
        setCurrentPageIndex(0)
        renderPageToCanvas(validPages[0])
      } else if (typeof parsed === 'object' && parsed !== null) {
        // 兼容单个画布对象的情况
        console.log('检测到单个画布对象，转换为数组格式')
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
      console.log('准备保存的画布数据:', pagesToSave)
      
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
      console.log('保存的数据长度:', payload.length, '画布数量:', validPages.length)
      setCanvasData(payload)

      if (id) {
        await workService.updateWork(Number(id), {
          canvasData: payload,
          ...(name && { name }),
        })
        console.log('作品已更新，ID:', id)
      } else {
        if (!name) return setSaveModalVisible(true)
        const result = await workService.createWork({ name, canvasData: payload })
        console.log('新作品已创建:', result)
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
        console.warn('缩略图数据太长，将被截断或移除')
        // 可以选择截断或移除
        thumbnailUrl = undefined // 或者截断: thumbnailUrl.substring(0, 100000)
      }
      
      // 保存为模板
      const canvasDataStr = JSON.stringify(validPages)
      console.log('准备保存模板:', { 
        name: templateName.trim(), 
        canvasDataLength: canvasDataStr.length,
        thumbnailUrlLength: thumbnailUrl?.length || 0
      })
      
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
      console.log('收到模板数据:', templateData)
      
      // 处理双重转义的 JSON 字符串
      let canvasDataStr = templateData
      if (typeof canvasDataStr === 'string') {
        // 如果字符串以引号开头和结尾，可能是双重转义的 JSON
        if (canvasDataStr.startsWith('"') && canvasDataStr.endsWith('"')) {
          try {
            canvasDataStr = JSON.parse(canvasDataStr)
            console.log('解除了双重转义')
          } catch {
            // 如果解析失败，使用原始字符串
          }
        }
      }
      
      const parsed = safeParse(canvasDataStr)
      console.log('解析后的模板数据:', parsed)
      
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
        
        console.log(`成功加载模板，包含 ${validPages.length} 个画布`)
        console.log('模板画布数据:', validPages.map((p: any, i: number) => ({
          index: i,
          id: p.id,
          hasJson: !!p.json,
          jsonLength: p.json?.length || 0
        })))
        
        const currentIdx = currentPageIndexRef.current
        console.log(`当前画布索引: ${currentIdx}`)
        
        // 如果模板只有一个画布，应用到当前选中的画布
        if (validPages.length === 1) {
          console.log('模板只有一个画布，应用到当前画布')
          
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
          console.log('模板有多个画布，替换所有画布')
          
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
        console.log('检测到单个画布对象，转换为数组格式')
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
          onApplyTemplate={handleApplyTemplate}
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
              console.log(`切换前保存画布 ${originalIndex + 1} 的状态`)
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
                console.warn(`画布索引不匹配：期望 ${canvasIndex}，实际 ${currentPageIndexRef.current}，等待切换完成...`)
                // 如果索引不匹配，可能是切换还未完成，等待一下再重试
                setTimeout(() => {
                  if (currentPageIndexRef.current === canvasIndex) {
                    console.log(`画布索引已匹配，继续应用数据`)
                    applyDataToCanvas()
                  } else {
                    console.error(`画布索引仍然不匹配：期望 ${canvasIndex}，实际 ${currentPageIndexRef.current}，跳过应用`)
                    resolve()
                  }
                }, 100)
                return
              }
              
              // 调试：检查画布上的所有对象
              const allObjects = targetCanvas.getObjects()
              console.log(`画布 ${canvasIndex + 1} 上的对象数量: ${allObjects.length}`)
              allObjects.forEach((obj: any, idx: number) => {
                console.log(`  对象 ${idx}: id=${obj.id}, type=${obj.type}, text=${obj.text || 'N/A'}`)
              })
              
              // 调试：检查 canvasCodeMap 中的元素
              console.log(`canvasCodeMap 大小: ${canvasCodeMap.size}`)
              canvasCodeMap.forEach((element, codeKey) => {
                console.log(`  ${codeKey} -> element.id=${element.id}`)
              })
              
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
                  console.log(`画布 ${canvasIndex + 1}：跳过短文本元素 (${trimmedText.length}字): "${text}" (ID: ${o.id})`)
                  return false
                }
                
                // 排除表情符号（通过检查是否包含表情符号字符）
                const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
                if (emojiRegex.test(text)) {
                  console.log(`画布 ${canvasIndex + 1}：跳过表情符号元素 (ID: ${o.id})`)
                  return false
                }
                
                return true
              }).sort((a: any, b: any) => {
                // 按位置排序：先上后下，先左后右
                if (a.top !== b.top) return a.top - b.top
                return a.left - b.left
              })
              
              console.log(`画布 ${canvasIndex + 1} 上排序后的有效文本元素数量: ${textObjects.length}`)
              
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
                      console.log(`  通过顺序匹配：${codeKey} -> 第 ${codeNumber} 个文本元素 (ID: ${obj.id}, 当前文本: ${obj.text || 'N/A'})`)
                    } else {
                      console.warn(`  CODE_标编号 ${codeNumber} 超出范围 (画布上文本元素数: ${textObjects.length})`)
                    }
                    
                    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
                      const maxLength = element.estimatedMaxChars || 200
                      obj.set('text', smartTruncate(String(codeValue), maxLength))
                      appliedCount++
                      console.log(`  成功应用 ${codeKey} = "${codeValue}" 到元素 ${obj.id}`)
                    } else {
                      console.warn(`  未找到匹配的元素用于 ${codeKey} (元素ID: ${element.id}, 画布上文本元素数: ${textObjects.length})`)
                    }
                  } else {
                    console.warn(`  canvasCodeMap 中没有找到 ${codeKey}`)
                  }
                }
              })
              
              targetCanvas.renderAll()
              syncCanvasToPage(false, true)
              
              console.log(`画布 ${canvasIndex + 1} 已应用 ${appliedCount} 个元素`)
              
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
                  console.log(`画布 ${canvasIndex + 1} 切换完成，开始应用数据`)
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
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div style={{ transform: `scale(${zoom})` }}>
            <canvas ref={canvasElRef} />
          </div>
        </div>
        <RightSidebar canvas={canvasRef.current} selectedObject={selectedObject} />
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
                <div className="w-16 h-20 border">
                  {p.thumbnail && (
                    <img
                      src={p.thumbnail}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="text-xs text-center mt-1">
                  画布 {i + 1}
                </div>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={e => {
                    e.stopPropagation()
                    deletePage(i)
                  }}
                />
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
    </div>
  )
}
