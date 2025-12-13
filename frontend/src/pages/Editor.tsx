import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Space, Modal, Input, message } from 'antd'
import { HomeOutlined, ExportOutlined, PlusOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import { fabric } from 'fabric'
import api from '@/services/api'

// 扩展Canvas类型，添加裁剪模式相关属性
declare module 'fabric' {
  interface Canvas {
    _isCroppingMode?: boolean;
    _cropTarget?: fabric.Object | null;
    _cropRectangle?: fabric.Rect | null;
  }
}
import { useEditorStore } from '@/stores/editorStore'
import { workService } from '@/services/workService'
import { templateService } from '@/services/templateService'
import FileMenu from '@/components/editor/FileMenu'
import HistoryControls from '@/components/editor/HistoryControls'
import ExportDialog from '@/components/editor/ExportDialog'
import LeftSidebar from '@/components/editor/LeftSidebar'
import RightSidebar from '@/components/editor/RightSidebar'

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)
  const { setCanvasData } = useEditorStore()
  
  // 多画布管理
  const [canvases, setCanvases] = useState<fabric.Canvas[]>([])
  const [currentCanvasIndex, setCurrentCanvasIndex] = useState(0)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [isCanvasBarVisible, setIsCanvasBarVisible] = useState(true)
  
  // 缩放状态
  const [zoom, setZoom] = useState(1)
  
  // 历史记录
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [rulerVisible, setRulerVisible] = useState(false)
  const [exportDialogVisible, setExportDialogVisible] = useState(false)
  const [saveNameModalVisible, setSaveNameModalVisible] = useState(false)
  const [workName, setWorkName] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 保存历史记录
  const saveHistory = useCallback(() => {
    if (!canvas) return
    const json = JSON.stringify(canvas.toJSON())
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(json)
    // 最多保存10步操作历史
    if (newHistory.length > 10) {
      newHistory.shift()
    } else {
      setHistoryIndex(newHistory.length - 1)
    }
    setHistory(newHistory)
  }, [canvas, history, historyIndex])

  // 创建新画布
  const createNewCanvas = (initialData?: string) => {
    const tempCanvasEl = document.createElement('canvas')
    tempCanvasEl.width = 1080
    tempCanvasEl.height = 1440
    tempCanvasEl.style.display = 'none'
    document.body.appendChild(tempCanvasEl)
    
    // 创建一个全新的空白画布，不继承任何现有内容
    const fabricCanvas = new fabric.Canvas(tempCanvasEl, {
      width: 1080,
      height: 1440,
      backgroundColor: '#ffffff',
      // 确保使用独立的画布实例
      preserveObjectStacking: true,
      selection: true
    })
    
    // 设置画布模式和其他属性
    const canvas = fabricCanvas as any
    canvas._mode = 'select'
    canvas._cropTarget = null
    canvas._cropRectangle = null
    canvas._magicWandTarget = null
    canvas._magicWandSelectedArea = null
    canvas._eraseTarget = null
    canvas._eraseBrush = null
    canvas._isErasing = false
    
    // 只在明确提供初始数据时加载
    if (initialData) {
      fabricCanvas.loadFromJSON(JSON.parse(initialData), () => {
        fabricCanvas.renderAll()
        // 保存初始数据
        fabricCanvas.__jsonData = initialData
      })
    } else {
      // 为新画布保存一个空的初始状态
      fabricCanvas.__jsonData = JSON.stringify({
        objects: [],
        background: '#ffffff',
        width: 1080,
        height: 1440
      })
    }
    
    // 添加事件监听
    setupCanvasEventListeners(fabricCanvas)
    
    return fabricCanvas
  }

  // 设置画布事件监听
  const setupCanvasEventListeners = (fabricCanvas: fabric.Canvas) => {
    // 监听对象选中
    fabricCanvas.on('selection:created', (e: any) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    fabricCanvas.on('selection:updated', (e: any) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    // 监听画布变化，保存历史记录
    fabricCanvas.on('object:added', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    fabricCanvas.on('object:modified', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    fabricCanvas.on('object:removed', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 监听对象移动事件，包括图层顺序变化
    fabricCanvas.on('object:moving', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 监听对象缩放事件
    fabricCanvas.on('object:scaling', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 监听对象旋转事件
    fabricCanvas.on('object:rotating', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })
  }

  useEffect(() => {
    if (!canvasRef.current) return

    // 初始化Fabric.js画布
    const fabricCanvas = new (fabric.Canvas as any)(canvasRef.current, {
      width: 1080,
      height: 1440,
      backgroundColor: '#ffffff',
    }) as fabric.Canvas
    
    // 确保evented属性为true，修复元素无法拖动的问题
    (fabricCanvas as any).evented = true

    // 设置画布引用
    setCanvas(fabricCanvas as any)
    const initialCanvases = [fabricCanvas]
    setCanvases(initialCanvases)
    setCurrentCanvasIndex(0)
    
    // 添加键盘事件监听
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下Delete或Backspace键
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvas) {
        // 检查是否在输入框中，避免删除文本内容
        if (e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement) {
          return;
        }
        
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject) {
          // 阻止默认行为
          e.preventDefault();
          
          // 从画布中移除选中的对象
          fabricCanvas.remove(activeObject);
          fabricCanvas.renderAll();
          
          // 触发对象移除事件以更新历史记录
          fabricCanvas.fire('object:removed');
        }
      }
      
      // 添加Ctrl+Z撤销操作快捷键支持
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // 检查是否在输入框中，避免影响文本编辑
        if (e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLTextAreaElement) {
          return;
        }
        
        // 阻止默认行为
        e.preventDefault();
        
        // 调用撤销函数（使用新的按步数撤销函数，默认撤销1步）
        handleUndoBySteps(1);
      }
    };
    
    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeyDown);

    // 监听对象选中
    fabricCanvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    fabricCanvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null)
    })

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    // 监听画布变化，保存历史记录
    fabricCanvas.on('object:added', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    fabricCanvas.on('object:modified', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    fabricCanvas.on('object:removed', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 监听对象移动事件，包括图层顺序变化
    fabricCanvas.on('object:moving', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 监听对象缩放事件
    fabricCanvas.on('object:scaling', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 监听对象旋转事件
    fabricCanvas.on('object:rotating', () => {
      setHasUnsavedChanges(true)
      saveHistory()
    })

    // 使用类型断言来处理自定义属性
    const canvas = fabricCanvas as any;
    
    // 工具模式状态
    canvas._mode = 'select'; // select, crop, magicWand, erase
    canvas._cropTarget = null;
    canvas._cropRectangle = null;
    
    // 魔法棒工具状态
    canvas._magicWandTarget = null;
    canvas._magicWandSelectedArea = null;
    
    // 消除区域工具状态
    canvas._eraseTarget = null;
    canvas._eraseBrush = null;
    canvas._isErasing = false;
    
    // 裁剪模式鼠标事件
    let startX = 0;
    let startY = 0;
      
      // 添加事件监听
      setupCanvasEventListeners(fabricCanvas)
    
    // 双击开始和结束裁剪区域选择
    fabricCanvas.on('mouse:dblclick', (e: any) => {
      if (canvas._mode === 'crop' && canvas._cropTarget) {
        const pointer = fabricCanvas.getPointer(e.e);
        
        if (!canvas._cropRectangle) {
          // 第一次双击：开始选择，创建初始裁剪矩形
          startX = pointer.x;
          startY = pointer.y;
          
          const rect = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'rgba(0, 0, 0, 0.3)',
            stroke: '#007bff',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockMovementX: false,
            lockMovementY: false
          });
          
          canvas._cropRectangle = rect;
          fabricCanvas.add(rect);
          fabricCanvas.setActiveObject(rect);
          
          message.info('拖动调整裁剪区域，双击结束选择');
        } else {
          // 第二次双击：结束选择，固定裁剪矩形
          message.info('裁剪区域已确定，点击应用裁剪完成操作');
          // 禁用裁剪矩形的拖动和调整
          canvas._cropRectangle.set({
            selectable: false,
            hasControls: false,
            hasBorders: false
          });
          fabricCanvas.renderAll();
        }
      }
    });
    
    // 拖动调整裁剪区域
    fabricCanvas.on('object:moving', (e: any) => {
      if (canvas._mode === 'crop' && canvas._cropTarget && canvas._cropRectangle && e.target === canvas._cropRectangle) {
        // 允许移动裁剪矩形
        fabricCanvas.renderAll();
      }
    });

    fabricCanvas.on('object:scaling', (e: any) => {
      if (canvas._mode === 'crop' && canvas._cropTarget && canvas._cropRectangle && e.target === canvas._cropRectangle) {
        // 允许调整裁剪矩形大小
        fabricCanvas.renderAll();
      }
    });
    
    // 魔法棒工具点击事件
    fabricCanvas.on('mouse:down', (e: any) => {
      if (canvas._mode === 'magicWand' && canvas._magicWandTarget) {
        const pointer = fabricCanvas.getPointer(e.e);
        
        message.info('正在使用魔法棒选择相似颜色区域...');
        
        // TODO: 实现魔法棒选色和区域选择逻辑
        // 这里需要实现颜色检测和区域选择算法
        // 1. 获取点击位置的颜色
        // 2. 检测相似颜色区域
        // 3. 创建选区
        
        // 模拟创建一个选区
        const selectionRect = new fabric.Rect({
          left: pointer.x - 50,
          top: pointer.y - 50,
          width: 100,
          height: 100,
          fill: 'rgba(0, 0, 255, 0.3)',
          stroke: '#007bff',
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          selectable: true,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false
        });
        
        // 保存选区
        if (canvas._magicWandSelectedArea) {
          fabricCanvas.remove(canvas._magicWandSelectedArea);
        }
        canvas._magicWandSelectedArea = selectionRect;
        fabricCanvas.add(selectionRect);
        fabricCanvas.setActiveObject(selectionRect);
        
        message.success('魔法棒选区已创建，拖动调整选区大小，点击应用抠图完成操作');
        
        // 添加抠图操作控件
        fabricCanvas.renderAll();
      }
    });
    
    // 消除区域工具事件
    fabricCanvas.on('mouse:down', () => {
      if (canvas._mode === 'erase' && canvas._eraseTarget) {
        canvas._isErasing = true;
        message.info('开始使用消除工具');
        // TODO: 实现消除区域的画笔逻辑
      }
    });
    
    fabricCanvas.on('mouse:move', () => {
      if (canvas._mode === 'erase' && canvas._eraseTarget && canvas._isErasing) {
        // TODO: 实现消除区域的画笔拖动逻辑
      }
    });
    
    fabricCanvas.on('mouse:up', () => {
      if (canvas._mode === 'erase' && canvas._eraseTarget) {
        canvas._isErasing = false;
        message.info('结束使用消除工具');
        // TODO: 完成消除区域操作
      }
    });

    // 保存初始缩放值到canvas对象
    (fabricCanvas as any)._zoom = +zoom // 使用一元加号运算符确保数值类型
    
    // 确保evented属性为true，防止任何地方错误修改导致元素无法拖动
    Object.assign(fabricCanvas, { evented: true });
    
    // 初始化canvas上下文
    fabricCanvas.renderAll()
    
    setCanvas(fabricCanvas)
    const initialJson = JSON.stringify(fabricCanvas.toJSON())
    setHistory([initialJson])
    setHistoryIndex(0)

    // 加载作品数据
    if (id) {
      // 直接使用fabricCanvas对象，而不是等待setCanvas更新状态
      const workId = parseInt(id)
      workService.getWork(workId)
        .then((response) => {
          // 注意：由于响应拦截器的处理，response已经是Work对象本身，没有data字段
          const work = response as any as { canvasData: string };
          if (work.canvasData) {
            try {
              // 注意：canvasData是双重字符串化的JSON，需要先解析一次
              const parsedCanvasData = typeof work.canvasData === 'string' ? JSON.parse(work.canvasData) : work.canvasData;
              
              // 确保canvas上下文已经初始化
              if (fabricCanvas.getContext()) {
                fabricCanvas.loadFromJSON(parsedCanvasData, () => {
                  fabricCanvas.renderAll()
                })
              } else {
                // 如果上下文还没初始化，延迟一下再尝试
                setTimeout(() => {
                  if (fabricCanvas.getContext()) {
                    fabricCanvas.loadFromJSON(parsedCanvasData, () => {
                      fabricCanvas.renderAll()
                    })
                  }
                }, 100)
              }
            } catch (error) {
              console.error('加载作品数据失败:', error)
            }
          }
        })
        .catch(error => {
          console.error('加载作品失败:', error)
        })
    }

    return () => {
      // 移除键盘事件监听
      document.removeEventListener('keydown', handleKeyDown);
      // 清理画布资源
      fabricCanvas.dispose()
    }
  }, [id])



  // 生成缩略图并上传
  const generateAndUploadThumbnail = async (oldThumbnailUrl?: string) => {
    if (!canvas) return null;

    try {
      // 获取画布数据URL作为缩略图
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 0.7,
        multiplier: 0.5, // 缩放因子，生成缩略图
      });

      // 将dataURL转换为Blob
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('thumbnail', blob, `thumbnail_${Date.now()}.png`);
      
      // 如果有旧的缩略图，传递给服务器以便删除
      if (oldThumbnailUrl) {
        formData.append('oldThumbnailUrl', oldThumbnailUrl);
      }

      // 上传缩略图并获取URL
      const uploadResponse = await api.post('/upload/thumbnail', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return (uploadResponse as any).thumbnailUrl;
    } catch (error) {
      console.error('上传缩略图失败:', error);
      return null;
    }
  };
  
  // 多画布管理函数
  const addNewCanvas = () => {
    const newCanvas = createNewCanvas()
    const newCanvases = [...canvases, newCanvas]
    setCanvases(newCanvases)
    setCurrentCanvasIndex(newCanvases.length - 1)
    setCanvas(newCanvas)
    setHasUnsavedChanges(true)
    
    // 确保新创建的空白画布立即渲染到主元素上
    // 使用setTimeout确保状态更新后再执行渲染
    setTimeout(() => {
      renderCanvasToMainElement(newCanvas)
    }, 0)
  }
  
  const deleteCanvas = (index: number) => {
    if (canvases.length <= 1) {
      message.warning('至少保留一个画布')
      return
    }
    
    Modal.confirm({
      title: '删除画布',
      content: '确定要删除此画布吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: () => {
        const canvasToDelete = canvases[index]
        if (canvasToDelete !== (canvasRef.current as any)?.fabric) {
          canvasToDelete.dispose()
          const canvasEl = canvasToDelete.getElement()
          if (canvasEl && canvasEl.parentNode) {
            canvasEl.parentNode.removeChild(canvasEl)
          }
        }
        
        const newCanvases = canvases.filter((_, i) => i !== index)
        setCanvases(newCanvases)
        
        if (index === currentCanvasIndex) {
          const newIndex = Math.min(index, newCanvases.length - 1)
          setCurrentCanvasIndex(newIndex)
          setCanvas(newCanvases[newIndex])
          // 将选中的画布渲染到主画布元素
          renderCanvasToMainElement(newCanvases[newIndex])
        } else if (index < currentCanvasIndex) {
          setCurrentCanvasIndex(currentCanvasIndex - 1)
        }
        
        setHasUnsavedChanges(true)
      }
    })
  }
  
  const switchCanvas = (index: number) => {
    if (index >= 0 && index < canvases.length) {
      // 切换前保存当前画布状态
      if (canvas && currentCanvasIndex >= 0 && currentCanvasIndex < canvases.length) {
        const currentCanvasCopy = canvases[currentCanvasIndex]
        const jsonData = canvas.toJSON()
        
        // 保存当前画布的JSON数据到对应的引用中
        // 创建一个临时容器来存储数据
        if (!currentCanvasCopy.__jsonData) {
          Object.defineProperty(currentCanvasCopy, '__jsonData', {
            value: JSON.stringify(jsonData),
            writable: true,
            enumerable: false
          })
        } else {
          currentCanvasCopy.__jsonData = JSON.stringify(jsonData)
        }
      }
      
      const targetCanvas = canvases[index]
      setCurrentCanvasIndex(index)
      setCanvas(targetCanvas)
      renderCanvasToMainElement(targetCanvas)
    }
  }
  
  const renderCanvasToMainElement = (targetCanvas: fabric.Canvas) => {
    if (!canvasRef.current) return
    
    // 先清除当前画布上的所有事件监听
    if (canvas) {
      canvas.off()
    }
    
    // 创建一个新的临时画布实例用于主渲染区域
    const mainCanvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1440,
      backgroundColor: '#ffffff',
    })
    
    // 获取要渲染的数据 - 优先使用保存的JSON数据
    let jsonDataToRender
    if (targetCanvas.__jsonData) {
      // 使用之前保存的JSON数据
      try {
        jsonDataToRender = JSON.parse(targetCanvas.__jsonData)
      } catch (e) {
        console.error('解析画布JSON数据失败:', e)
        // 解析失败时使用当前画布数据
        jsonDataToRender = targetCanvas.toJSON()
      }
    } else {
      // 如果没有保存的数据，使用当前画布数据
      jsonDataToRender = targetCanvas.toJSON()
    }
    
    // 加载目标画布的数据到临时渲染画布
    mainCanvas.loadFromJSON(jsonDataToRender, () => {
      mainCanvas.renderAll()
      setCanvas(mainCanvas) // 只更新显示用的canvas状态，不替换原始画布引用
      setupCanvasEventListeners(mainCanvas)
      
      // 重要：不再更新原始的canvases数组，保持每个画布的独立性
      // 这样确保每个画布的数据都是独立的，不会互相影响
    })
  }
  
  // 获取画布缩略图
  const getCanvasThumbnail = (canvas: fabric.Canvas, size = 100) => {
    return canvas.toDataURL({
      format: 'png',
      quality: 0.5,
      multiplier: size / Math.max(canvas.width || 1080, canvas.height || 1440)
    })
  }
  
  // 拖拽调整画布顺序
  const handleCanvasDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('canvasIndex', index.toString())
  }, [])
  
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])
  
  const handleCanvasDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('canvasIndex'))
    
    if (dragIndex !== dropIndex && dragIndex >= 0 && dragIndex < canvases.length) {
      const newCanvases = [...canvases]
      const [removed] = newCanvases.splice(dragIndex, 1)
      newCanvases.splice(dropIndex, 0, removed)
      
      setCanvases(newCanvases)
      
      // 更新当前画布索引
      if (dragIndex === currentCanvasIndex) {
        setCurrentCanvasIndex(dropIndex)
      } else if (dragIndex < currentCanvasIndex && dropIndex >= currentCanvasIndex) {
        setCurrentCanvasIndex(currentCanvasIndex - 1)
      } else if (dragIndex > currentCanvasIndex && dropIndex <= currentCanvasIndex) {
        setCurrentCanvasIndex(currentCanvasIndex + 1)
      }
      
      setHasUnsavedChanges(true)
    }
  }, [canvases, currentCanvasIndex])

  const handleSave = async (name?: string) => {
    if (!canvas) return

    const data = JSON.stringify(canvas.toJSON())
    setCanvasData(data)

    try {
      // 生成并上传缩略图
      const thumbnailUrl = await generateAndUploadThumbnail();

      if (id) {
        await workService.updateWork(parseInt(id), ({
          canvasData: data,
          thumbnailUrl,
          ...(name && { name }),
        } as any))
        message.success('保存成功！')
        setHasUnsavedChanges(false)
      } else {
        // 如果没有名称，弹出命名对话框
        if (!name) {
          setSaveNameModalVisible(true)
          return
        }
        await workService.createWork(({
          name,
          canvasData: data,
          thumbnailUrl,
        } as any))
        message.success('保存成功！')
        setHasUnsavedChanges(false)
      }
    } catch (error: any) {
      console.error('保存失败:', error)
      message.error(error.message || '保存失败，请重试')
    }
  }

  const handleSaveWithName = () => {
    if (!workName.trim()) {
      message.warning('请输入作品名称')
      return
    }
    handleSave(workName)
    setSaveNameModalVisible(false)
    setWorkName('')
  }

  const handleHome = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '提示',
        content: '当前作品有未保存的修改，是否保存？',
        okText: '保存',
        cancelText: '不保存',
        onOk: () => {
          handleSave()
          navigate('/')
        },
        onCancel: () => {
          navigate('/')
        },
      })
    } else {
      navigate('/')
    }
  }

  const handleExport = (format: 'png' | 'pdf' | 'gif', _pages: number[]) => {
    if (!canvas) return
    // 目前只支持单页导出，后续可以扩展多页
    const dataURL = canvas.toDataURL({
      format: format === 'png' ? 'png' : 'jpeg',
      quality: 1,
    })
    const link = document.createElement('a')
    link.download = `作品_${Date.now()}.${format}`
    link.href = dataURL
    link.click()
    message.success('导出成功')
  }

  // 注意：原来的handleUndo函数已被handleUndoBySteps(1)替代，以支持按步数撤销功能
  
  // 按步数撤销函数（可以撤销多步操作，如撤销到2次操作前）
  const handleUndoBySteps = (steps: number = 1) => {
    if (canvas) {
      const newIndex = Math.max(0, historyIndex - steps)
      if (newIndex !== historyIndex) {
        setHistoryIndex(newIndex)
        canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
          canvas.renderAll()
        })
      }
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && canvas) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
        canvas.renderAll()
      })
    }
  }

  // 生成唯一图层名称
  const generateUniqueLayerName = (baseName: string) => {
    if (!canvas) return baseName
    
    const objects = canvas.getObjects()
    const nameCount: Record<string, number> = {}
    
    // 统计现有名称
    objects.forEach(obj => {
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

  const handleAddText = (type: string) => {
    if (!canvas) return
    const defaults: Record<string, { text: string; fontSize: number; name: string }> = {
      title: { text: '标题', fontSize: 32, name: '标题' },
      subtitle: { text: '副标题', fontSize: 24, name: '副标题' },
      body: { text: '正文', fontSize: 16, name: '正文' },
      transform: { text: '变形文字', fontSize: 20, name: '变形文字' },
      '3d': { text: '3D文字', fontSize: 20, name: '3D文字' },
    }
    const config = defaults[type] || defaults.body
    
    // 生成唯一名称
    const uniqueName = generateUniqueLayerName(config.name)

    const text = new fabric.Textbox(config.text, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: config.fontSize,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
      name: uniqueName, // 设置唯一名称
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
    setHasUnsavedChanges(true)
  }

  const handleAddImage = (imageUrl: string) => {
    if (!canvas) return
    
    // 创建一个新的Image元素，先加载图片
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      // 生成唯一图片名称
      const uniqueName = generateUniqueLayerName('图片')
      
      // 使用已加载的Image元素创建fabric图片对象
      const fabricImage = new fabric.Image(imgElement, {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: 'center',
        originY: 'center',
        scaleX: 0.5,
        scaleY: 0.5,
        opacity: 1,
        name: uniqueName, // 设置唯一名称
      });
      
      // 确保图片添加到画布
      canvas.add(fabricImage);
      // 确保图片在最上层
      canvas.bringToFront(fabricImage);
      // 选中图片
      canvas.setActiveObject(fabricImage);
      // 渲染画布
      canvas.renderAll();
      // 更新历史记录
      setHasUnsavedChanges(true);
    };
    
    imgElement.onerror = (error) => {
      console.error('Image loading failed:', error);
      message.error('图片加载失败');
    };
    
    // 开始加载图片
    imgElement.src = imageUrl;
  }

  const handleApplyTemplate = (templateData: string) => {
    try {
      // 使用自定义的方式解析JSON字符串，能够保留重复键的信息
      let parsedData = {}
      let canvasDataArray = []
      
      if (typeof templateData === 'string') {
        console.log('原始模板数据:', templateData)
        
        // 优化的字符串解析来处理重复键
        // 方法1: 基于正则表达式提取所有canvas和CODE_标字段
        const canvasMatches = templateData.match(/"(canvas\d+)":\s*"([^"]*)"/g) || []
        const codeMatches = templateData.match(/"(CODE_标 \d+)":\s*"([^"]*)"/g) || []
        
        // 创建一个Map来存储每个canvas对应的CODE字段
        const canvasToCodesMap = new Map()
        
        // 处理画布标题
        canvasMatches.forEach(match => {
          const [key, value] = match.split(/:\s*/)
          const cleanKey = key.replace(/"/g, '')
          const cleanValue = value.replace(/"/g, '').replace(/,$/, '').trim()
          
          if (!canvasToCodesMap.has(cleanKey)) {
            canvasToCodesMap.set(cleanKey, { [cleanKey]: cleanValue })
          }
        })
        
        // 优化的CODE_标字段分配算法 - 基于原始文件中的行位置
        // 找到所有画布的位置索引
        const canvasPositions = {}
        templateData.split('\n').forEach((line, lineIndex) => {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('"canvas') && trimmedLine.includes(':')) {
            const key = trimmedLine.split(':')[0].replace(/"/g, '')
            canvasPositions[key] = lineIndex
          }
        })
        
        // 按行顺序将CODE_标字段分配给最近的前一个画布
        // 先按行索引排序画布
        const sortedCanvases = Object.entries(canvasPositions)
          .sort((a, b) => a[1] - b[1])
          .map(entry => entry[0])
        
        // 对每个CODE_标字段进行处理
        codeMatches.forEach(match => {
          // 找到这个CODE_标字段在原始数据中的行位置
          const matchIndex = templateData.indexOf(match)
          let lineNumber = 0
          
          // 计算行号
          for (let i = 0; i < matchIndex; i++) {
            if (templateData[i] === '\n') {
              lineNumber++
            }
          }
          
          // 找到这个CODE_标字段属于哪个画布
          // 查找最大的画布行号但小于当前CODE_标字段的行号
          let assignedCanvas = null
          for (let i = sortedCanvases.length - 1; i >= 0; i--) {
            const canvasKey = sortedCanvases[i]
            if (canvasPositions[canvasKey] <= lineNumber) {
              assignedCanvas = canvasKey
              break
            }
          }
          
          // 如果找到了对应的画布，就分配CODE_标字段
          if (assignedCanvas && canvasToCodesMap.has(assignedCanvas)) {
            const [key, value] = match.split(/:\s*/)
            const cleanKey = key.replace(/"/g, '')
            const cleanValue = value.replace(/"/g, '').replace(/,$/, '').trim()
            
            const canvasData = canvasToCodesMap.get(assignedCanvas)
            canvasData[cleanKey] = cleanValue
            console.log(`将 ${cleanKey} = "${cleanValue}" 分配给画布 ${assignedCanvas}`)
          }
        })
        
        // 转换为数组格式
        canvasDataArray = Array.from(canvasToCodesMap.values())
        console.log('基于行位置解析的画布数据映射:', canvasToCodesMap)
        
        // 方法2: 原始的逐行解析作为后备
        let currentCanvas = null
        let canvasContent = {}
        const lines = templateData.split('\n')
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('"canvas') && trimmedLine.includes(':')) {
            // 如果之前有未保存的画布数据，先保存
            if (currentCanvas && Object.keys(canvasContent).length > 0) {
              // 确保不重复添加
              if (!canvasDataArray.some(item => item[currentCanvas] === canvasContent[currentCanvas])) {
                canvasDataArray.push({...canvasContent})
              }
              canvasContent = {}
            }
            
            // 提取画布标题
            const key = trimmedLine.split(':')[0].replace(/"/g, '')
            const value = trimmedLine.split(':')[1].replace(/"/g, '').replace(/,$/, '').trim()
            currentCanvas = key
            canvasContent[currentCanvas] = value
          } else if (trimmedLine.startsWith('"CODE_') && trimmedLine.includes(':')) {
            // 提取CODE_标字段
            const key = trimmedLine.split(':')[0].replace(/"/g, '')
            const value = trimmedLine.split(':')[1].replace(/"/g, '').replace(/,$/, '').trim()
            if (currentCanvas) {
              canvasContent[key] = value
            }
          }
        }
        
        // 保存最后一个画布的数据
        if (currentCanvas && Object.keys(canvasContent).length > 0) {
          // 确保不重复添加
          if (!canvasDataArray.some(item => item[currentCanvas] === canvasContent[currentCanvas])) {
            canvasDataArray.push({...canvasContent})
          }
        }
        
        // 同时也做标准JSON解析作为后备
        try {
          parsedData = JSON.parse(templateData)
        } catch (e) {
          console.warn('标准JSON解析失败，使用空对象作为后备:', e)
          parsedData = {}
        }
        
        console.log('最终解析的画布数据数组:', canvasDataArray)
      } else {
        parsedData = templateData
      }
      
      // 检查是否包含多画布数据
      const canvasKeys = Object.keys(parsedData).filter(key => key.startsWith('canvas'))
      
      if (canvasKeys.length > 0) {
        console.log('检测到多画布模板数据:', canvasKeys)
        console.log('解析出的画布数据数组:', canvasDataArray)
        
        // 按画布索引排序，确保按顺序处理
        canvasKeys.sort((a, b) => {
          const numA = parseInt(a.replace('canvas', ''))
          const numB = parseInt(b.replace('canvas', ''))
          return numA - numB
        })
        
        // 自动填充每个画布的数据
        let appliedCanvasCount = 0
        
        // 直接为每个画布分配对应的数据
        canvases.forEach((targetCanvas, canvasIndex) => {
          const canvasNum = canvasIndex + 1
          const canvasKey = `canvas${canvasNum}`
          
          // 获取当前画布的数据
          let canvasData = null
          
          // 优先从自定义解析的数组中获取数据
          if (canvasDataArray.length > canvasIndex) {
            canvasData = canvasDataArray[canvasIndex]
          } else if (parsedData[canvasKey]) {
            // 如果没有自定义解析数据，使用标准解析数据
            canvasData = {[canvasKey]: parsedData[canvasKey]}
            
            // 添加CODE_标字段
            for (let i = 1; i <= 10; i++) { // 假设最多10个CODE_标字段
              const codeKey = `CODE_标 ${i}`
              if (parsedData[codeKey] !== undefined) {
                canvasData[codeKey] = parsedData[codeKey]
              }
            }
          }
          
          if (canvasData) {
            console.log(`处理画布 ${canvasKey} 数据应用`, canvasData)
            
            // 为画布保存数据引用
            if (!targetCanvas.__jsonData) {
              Object.defineProperty(targetCanvas, '__jsonData', {
                value: JSON.stringify(canvasData),
                writable: true,
                enumerable: false
              })
            } else {
              targetCanvas.__jsonData = JSON.stringify(canvasData)
            }
            
            // 获取画布中的文本元素
            const textObjects = targetCanvas.getObjects().filter((obj: any) => 
              obj.type === 'textbox' || obj.type === 'text'
            )
            
            console.log(`画布 ${canvasKey} 中有 ${textObjects.length} 个文本元素`)
            
            // 应用画布数据
            let appliedFields = 0
            
            // 处理画布标题（如果有）
            if (canvasData[canvasKey] && textObjects.length > 0) {
              try {
                textObjects[0].set('text', String(canvasData[canvasKey]).trim())
                console.log(`设置画布 ${canvasKey} 标题成功`)
              } catch (e) {
                console.error(`设置标题失败:`, e)
              }
            }
            
            // 处理CODE_标字段 - 改进版本
            // 首先找出所有CODE_标字段
            const codeKeys = Object.keys(canvasData).filter(key => key.startsWith('CODE_'))
            console.log(`画布 ${canvasKey} 包含 ${codeKeys.length} 个CODE_标字段`, codeKeys)
            
            // 按顺序应用CODE_标字段到文本元素
            codeKeys.forEach((codeKey, codeIndex) => {
              // 文本元素索引 = 标题(0) + 内容字段索引
              const targetIndex = codeIndex + 1
              
              if (targetIndex < textObjects.length) {
                try {
                  const fieldValue = String(canvasData[codeKey] || '').trim()
                  textObjects[targetIndex].set('text', fieldValue)
                  console.log(`成功应用 ${codeKey} = "${fieldValue}" 到画布 ${canvasKey} 元素索引 ${targetIndex}`)
                  appliedFields++
                } catch (e) {
                  console.error(`设置元素文本失败:`, e)
                }
              } else {
                console.warn(`没有足够的文本元素应用 ${codeKey}，当前画布只有 ${textObjects.length} 个文本元素`)
              }
            })
            
            // 确保画布渲染
            targetCanvas.renderAll()
            setHasUnsavedChanges(true)
            appliedCanvasCount++
          } else {
            console.log(`画布 ${canvasKey} 没有找到对应的数据`)
          }
        })
        
        // 增强的强制刷新机制
        // 第一轮刷新
        setTimeout(() => {
          canvases.forEach((canvas, index) => {
            console.log(`第一轮强制刷新画布 ${index + 1}`)
            canvas.renderAll()
          })
          
          // 第二轮刷新确保所有内容正确显示
          setTimeout(() => {
            canvases.forEach((canvas, index) => {
              console.log(`第二轮强制刷新画布 ${index + 1}`)
              canvas.renderAll()
            })
          }, 200) // 稍微延迟，确保第一次渲染完成
        }, 100)
        
        // 显示成功消息
        if (appliedCanvasCount > 0) {
          // 计算从自定义解析中识别的CODE_标字段总数
          let totalCodeFields = 0
          canvasDataArray.forEach(canvasData => {
            totalCodeFields += Object.keys(canvasData).filter(k => k.includes('CODE_')).length
          })
          message.success(`已成功自动填充 ${appliedCanvasCount} 个画布的数据，共识别了 ${totalCodeFields} 个CODE_标字段`)
        } else {
          // 详细的诊断信息
          let totalCodeFields = 0
          canvasDataArray.forEach(canvasData => {
            totalCodeFields += Object.keys(canvasData).filter(k => k.includes('CODE_')).length
          })
          message.warning(`已识别 ${canvasKeys.length} 个画布和 ${totalCodeFields} 个CODE_标字段，但未能成功应用到画布元素上`)
          console.warn('未成功应用任何元素的诊断信息:', {
            canvasCount: canvases.length,
            canvasKeys: canvasKeys,
            totalCodeFields: totalCodeFields,
            canvasDataArray: canvasDataArray
          })
        }
      } else {
        // 单画布数据处理逻辑
        if (canvas) {
          canvas.loadFromJSON(parsedData, () => {
            canvas.renderAll()
            setHasUnsavedChanges(true)
          })
        }
      }
    } catch (error) {
      console.error('应用模板失败:', error)
      message.error('应用模版失败')
    }
  }

  // 退出当前工具模式的通用函数
  const exitCurrentMode = () => {
    if (!canvas) return
    
    const canvasWithTools = canvas as any;
    
    // 恢复所有对象的选择
    canvas.getObjects().forEach(obj => {
      obj.selectable = true;
    });
    
    // 关闭绘图模式
    canvas.isDrawingMode = false;
    
    // 重置所有模式状态
    canvasWithTools._mode = 'select';
    
    // 清理裁剪相关
    if (canvasWithTools._cropRectangle) {
      canvas.remove(canvasWithTools._cropRectangle);
      canvasWithTools._cropRectangle = null;
    }
    canvasWithTools._cropTarget = null;
    
    // 清理魔法棒相关
    canvasWithTools._magicWandTarget = null;
    if (canvasWithTools._magicWandSelectedArea) {
      canvas.remove(canvasWithTools._magicWandSelectedArea);
      canvasWithTools._magicWandSelectedArea = null;
    }
    
    // 清理消除工具相关
    canvasWithTools._eraseTarget = null;
    canvasWithTools._eraseBrush = null;
    canvasWithTools._isErasing = false;
    
    canvas.renderAll();
  }

  // 裁剪功能相关函数
  const enterCropMode = (target: fabric.Object) => {
    if (!canvas) return
    
    const canvasWithTools = canvas as any;
    
    // 退出当前模式
    exitCurrentMode();
    
    // 进入裁剪模式
    canvasWithTools._mode = 'crop';
    canvasWithTools._cropTarget = target;
    
    // 禁用其他对象的选择
    canvas.getObjects().forEach(obj => {
      if (obj !== target) {
        obj.selectable = false;
      }
    });
    
    message.info('进入裁剪模式，双击开始选择裁剪区域');
  }

  const applyCrop = () => {
    if (!canvas) return
    
    const canvasWithTools = canvas as any;
    
    if (canvasWithTools._mode !== 'crop' || !canvasWithTools._cropTarget || !canvasWithTools._cropRectangle) return
    
    const target = canvasWithTools._cropTarget;
    const rect = canvasWithTools._cropRectangle;
    
    // 计算裁剪参数，考虑目标对象的变换
    // 获取目标对象在画布上的边界框
    const targetBoundingRect = target.getBoundingRect();
    
    // 计算裁剪矩形相对于目标对象的位置和尺寸
    // 注意：Fabric.js的裁剪是基于原始图像尺寸的，所以需要考虑缩放
    const scaleX = target.scaleX || 1;
    const scaleY = target.scaleY || 1;
    
    // 计算相对于目标对象左上角的裁剪坐标（考虑缩放）
    const cropX = (rect.left! - targetBoundingRect.left) / scaleX;
    const cropY = (rect.top! - targetBoundingRect.top) / scaleY;
    const cropWidth = rect.width! / scaleX;
    const cropHeight = rect.height! / scaleY;
    
    // 应用裁剪
    target.set({
      cropX,
      cropY,
      cropWidth,
      cropHeight
    });
    
    // 退出裁剪模式
    exitCurrentMode();
    
    canvas.renderAll();
    message.success('裁剪成功');
    setHasUnsavedChanges(true);
    saveHistory();
  }

  // 魔法棒抠图功能
  const enterMagicWandMode = (target: fabric.Object) => {
    if (!canvas) return
    
    const canvasWithTools = canvas as any;
    
    // 退出当前模式
    exitCurrentMode();
    
    // 进入魔法棒模式
    canvasWithTools._mode = 'magicWand';
    canvasWithTools._magicWandTarget = target;
    
    // 禁用其他对象的选择
    canvas.getObjects().forEach(obj => {
      if (obj !== target) {
        obj.selectable = false;
      }
    });
    
    message.info('进入魔法棒抠图模式，点击图片选择要抠图的区域');
  }

  // 消除区域功能
  const enterEraseMode = (target: fabric.Object) => {
    if (!canvas) return
    
    const canvasWithTools = canvas as any;
    
    // 退出当前模式
    exitCurrentMode();
    
    // 进入消除区域模式
    canvasWithTools._mode = 'erase';
    canvasWithTools._eraseTarget = target;
    
    // 禁用其他对象的选择
    canvas.getObjects().forEach(obj => {
      if (obj !== target) {
        obj.selectable = false;
      }
    });
    
    // 初始化消除画笔
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    
    // 设置画笔属性
    canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
    canvas.freeDrawingBrush.width = 10;
    
    message.info('进入消除区域模式，拖动鼠标消除不需要的区域');
  }

  // 应用魔法棒抠图
  const applyMagicWand = () => {
    if (!canvas) return
    
    const canvasWithTools = canvas as any;
    
    if (canvasWithTools._mode !== 'magicWand' || !canvasWithTools._magicWandTarget || !canvasWithTools._magicWandSelectedArea) return
    
    const target = canvasWithTools._magicWandTarget;
    const selectedArea = canvasWithTools._magicWandSelectedArea;
    
    if (!(target instanceof fabric.Image)) {
      message.error('魔法棒抠图仅适用于图片');
      exitCurrentMode();
      return;
    }
    
    // 获取图片元素
    // 使用Fabric.js的public API获取图像源
    const src = target.getSrc();
    if (!src) {
      message.error('无法获取图片数据');
      exitCurrentMode();
      return;
    }
    
    // 创建临时图像元素
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    // 使用Promise处理图像加载
    new Promise<void>((resolve, reject) => {
      imgElement.onload = () => resolve();
      imgElement.onerror = reject;
      imgElement.src = src;
    }).then(() => {
      message.info('正在处理魔法棒抠图...');
      
      // 创建临时Canvas用于图像处理
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        message.error('无法创建临时画布');
        exitCurrentMode();
        return;
      }
      
      // 设置临时Canvas尺寸
      tempCanvas.width = imgElement.naturalWidth;
      tempCanvas.height = imgElement.naturalHeight;
      
      // 绘制原始图像
      tempCtx.drawImage(imgElement, 0, 0);
      
      // 创建蒙版Canvas
      const maskCanvas = document.createElement('canvas');
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) {
        message.error('无法创建蒙版画布');
        exitCurrentMode();
        return;
      }
      
      maskCanvas.width = tempCanvas.width;
      maskCanvas.height = tempCanvas.height;
      
      // 绘制白色背景作为蒙版基础
      maskCtx.fillStyle = '#ffffff';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      // 简化实现：使用矩形选区作为蒙版（后续可实现更复杂的颜色识别算法）
      // 获取选区在目标图像上的位置（考虑缩放）
      const scaleX = target.scaleX || 1;
      const scaleY = target.scaleY || 1;
      
      // 计算选区相对于原始图像的位置和尺寸
      const targetBoundingRect = target.getBoundingRect();
      const maskX = (selectedArea.left! - targetBoundingRect.left) / scaleX;
      const maskY = (selectedArea.top! - targetBoundingRect.top) / scaleY;
      const maskWidth = selectedArea.width! / scaleX;
      const maskHeight = selectedArea.height! / scaleY;
      
      // 在蒙版上绘制黑色选区（表示要保留的区域）
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(maskX, maskY, maskWidth, maskHeight);
      
      // 应用蒙版到原始图像
      // 创建最终图像Canvas
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        message.error('无法创建最终图像画布');
        exitCurrentMode();
        return;
      }
      
      finalCanvas.width = tempCanvas.width;
      finalCanvas.height = tempCanvas.height;
      
      // 绘制原始图像
      finalCtx.drawImage(imgElement, 0, 0);
      
      // 设置合成模式为destination-in，只保留蒙版覆盖区域
      finalCtx.globalCompositeOperation = 'destination-in';
      finalCtx.drawImage(maskCanvas, 0, 0);
      
      // 重置合成模式
      finalCtx.globalCompositeOperation = 'source-over';
      
      // 将处理后的图像转换为Fabric.js图像
      fabric.Image.fromURL(finalCanvas.toDataURL(), (newImg) => {
        // 保持原图像的位置和变换属性
        newImg.set({
          left: target.left,
          top: target.top,
          scaleX: target.scaleX,
          scaleY: target.scaleY,
          angle: target.angle,
          opacity: target.opacity
        });
        
        // 替换原图像
        canvas.remove(target);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        
        // 退出魔法棒模式
        exitCurrentMode();
        
        canvas.renderAll();
        message.success('抠图成功');
        setHasUnsavedChanges(true);
        saveHistory();
      });
    }).catch(() => {
      message.error('图片加载失败');
      exitCurrentMode();
    });
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="h-18 bg-white border-b border-border flex items-center justify-between px-6">
          <Space>
            <Button icon={<HomeOutlined />} onClick={handleHome}>
              主页
            </Button>
            <FileMenu
              onNewFile={() => {
                if (canvas) {
                  canvas.clear()
                  canvas.setBackgroundColor('#ffffff', () => canvas.renderAll())
                  setHasUnsavedChanges(false)
                }
              }}
              onDuplicate={async () => {
                if (id && canvas) {
                  try {
                    await workService.duplicateWork(parseInt(id))
                    message.success('副本创建成功')
                  } catch (error) {
                    message.error('创建副本失败')
                  }
                }
              }}
              onSave={() => handleSave()}
              onSaveTo={(_folderId) => handleSave()}
              onSaveAsTemplate={async () => {
                if (!canvas) return
                
                try {
                  // 显示模态框，让用户输入模板名称
                  Modal.confirm({
                    title: '保存为模板',
                    content: (
                      <Input
                        id="template-name-input"
                        placeholder="请输入模板名称"
                        autoFocus
                      />
                    ),
                    onOk: async () => {
                      const nameInput = document.getElementById('template-name-input') as HTMLInputElement
                      const templateName = nameInput?.value?.trim()
                      
                      if (!templateName) {
                        message.warning('请输入模板名称')
                        return
                      }
                      
                      try {
                        // 生成并上传缩略图
                        const thumbnailUrl = await generateAndUploadThumbnail();
                        
                        // 获取画布数据并保存为模板
                        const canvasData = JSON.stringify(canvas.toJSON())
                        await templateService.createTemplate({ 
                          name: templateName, 
                          canvasData,
                          thumbnailUrl 
                        })
                        message.success('模板保存成功')
                      } catch (error: any) {
                        message.error(error.message || '保存模板失败')
                        return
                      }
                    },
                    onCancel: () => {},
                  })
                } catch (error: any) {
                  message.error(error.message || '保存模板失败')
                }
              }}
              onToggleRuler={() => setRulerVisible(!rulerVisible)}
              rulerVisible={rulerVisible}
              hasUnsavedChanges={hasUnsavedChanges}
            />
            <HistoryControls
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={() => handleUndoBySteps(1)} // 使用新的按步数撤销函数，默认撤销1步
              onRedo={handleRedo}
            />
            <Button icon={<ExportOutlined />} onClick={() => setExportDialogVisible(true)}>
              导出
            </Button>
          </Space>
        </div>

      {/* 主编辑区 */}
      <div className="flex-1 flex pb-20" /* 添加底部padding，避免被画布横栏遮挡 */>
        {/* 左侧工具栏 */}
        <LeftSidebar
          canvas={canvas}
          onAddText={handleAddText}
          onAddImage={handleAddImage}
          onApplyTemplate={handleApplyTemplate}
        />

        {/* 中间画布区 */}
        <div className="flex-1 bg-background-gray flex items-center justify-center p-8 overflow-auto">
          <div 
            ref={(el) => {
              // 保存画布容器引用
              if (el && canvas) {
                (canvas as any)._canvasContainer = el;
              }
            }}
            className="bg-white shadow-lg relative transition-transform duration-200"
            style={{
              // 应用缩放变换到整个白色区域
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            {rulerVisible && (
              <div className="absolute top-0 left-0 w-full h-6 bg-background-gray border-b border-border">
                {/* 标尺 */}
              </div>
            )}
            <canvas ref={canvasRef} />
            
            {/* 工具模式控件 */}
            {/* 使用类型断言来处理自定义属性 */}
            {((canvas as any)?._mode === 'crop' && (canvas as any)?._cropTarget) && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white p-2 rounded shadow-md">
                <Button
                  size="small"
                  type="primary"
                  onClick={applyCrop}
                >
                  应用裁剪
                </Button>
                <Button
                  size="small"
                  onClick={exitCurrentMode}
                >
                  取消
                </Button>
              </div>
            )}
            
            {/* 魔法棒抠图控件 */}
            {((canvas as any)?._mode === 'magicWand' && (canvas as any)?._magicWandTarget) && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-white p-2 rounded shadow-md">
                <Button
                  size="small"
                  type="primary"
                  onClick={applyMagicWand}
                >
                  应用抠图
                </Button>
                <Button
                  size="small"
                  onClick={exitCurrentMode}
                >
                  取消
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧属性栏 */}
        <div className="w-80 bg-white border-l border-border p-4 overflow-y-auto">
          <RightSidebar 
            canvas={canvas} 
            selectedObject={selectedObject} 
            onEnterCropMode={enterCropMode}
            onEnterMagicWandMode={enterMagicWandMode}
            onEnterEraseMode={enterEraseMode}
          />
        </div>
      </div>
      
      {/* 画布横栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-300 shadow-lg">
        {/* 切换按钮 */}
        <div className="flex justify-center border-b border-border">
          <Button
            size="small"
            type="text"
            icon={isCanvasBarVisible ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setIsCanvasBarVisible(!isCanvasBarVisible)}
            className="py-1"
          >
            {isCanvasBarVisible ? '收起画布列表' : '展开画布列表'}
          </Button>
        </div>
        
        {/* 画布列表内容 */}
        {isCanvasBarVisible && (
          <div className="h-[120px] flex items-center px-4 overflow-x-auto">
            <div ref={canvasContainerRef} className="flex items-center space-x-4">
              {canvases.map((canv, index) => (
                <div
                  key={index}
                  className={`relative cursor-pointer transition-all duration-200 ${index === currentCanvasIndex ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'}`}
                  draggable
                  onDragStart={(e) => handleCanvasDragStart(e, index)}
                  onDragOver={handleCanvasDragOver}
                  onDrop={(e) => handleCanvasDrop(e, index)}
                  onClick={() => switchCanvas(index)}
                >
                  <div className="w-16 h-20 border border-border bg-white overflow-hidden">
                    <img 
                      src={getCanvasThumbnail(canv)} 
                      alt={`画布 ${index + 1}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteCanvas(index)
                      }}
                      className="h-6 w-6 p-0 flex items-center justify-center"
                    />
                  </div>
                  <div className="text-xs text-center mt-1">画布 {index + 1}</div>
                </div>
              ))}
              
              {/* 新增画布按钮 */}
              <div 
                className="w-16 h-20 border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={addNewCanvas}
              >
                <PlusOutlined className="text-gray-500" />
                <span className="text-xs mt-1 text-gray-500">新增</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 导出对话框 */}
      <ExportDialog
        visible={exportDialogVisible}
        onCancel={() => setExportDialogVisible(false)}
        onExport={handleExport}
        pageCount={1}
      />

      {/* 保存命名对话框 */}
      <Modal
        title="保存作品"
        open={saveNameModalVisible}
        onOk={handleSaveWithName}
        onCancel={() => {
          setSaveNameModalVisible(false)
          setWorkName('')
        }}
      >
        <div>
          <div className="mb-2">作品名称：</div>
          <Input
            value={workName}
            onChange={(e) => setWorkName(e.target.value)}
            placeholder="请输入作品名称（必填，最大50字符）"
            maxLength={50}
            onPressEnter={handleSaveWithName}
          />
        </div>
      </Modal>
      
      {/* 视觉缩放控制 - 固定在右下角 */}
      <div className="fixed bottom-6 right-6 bg-white p-2 rounded shadow-lg flex flex-col space-y-1 z-10">
        <Button
          size="small"
          onClick={() => {
            if (!canvas) return;
            const currentZoom = zoom;
            const newZoom = Math.min(currentZoom + 0.1, 3); // 最大放大3倍
            
            // 更新缩放状态
            setZoom(newZoom);
            
            // 保存缩放值到canvas对象
            (canvas as any)._zoom = newZoom;
          }}
        >
          +
        </Button>
        <Button
          size="small"
          onClick={() => {
            if (!canvas) return;
            const currentZoom = zoom;
            const newZoom = Math.max(currentZoom - 0.1, 0.3); // 最小缩小到0.3倍
            
            // 更新缩放状态
            setZoom(newZoom);
            
            // 保存缩放值到canvas对象
            (canvas as any)._zoom = newZoom;
          }}
        >
          -
        </Button>
        <Button
          size="small"
          onClick={() => {
            if (!canvas) return;
            const newZoom = 1;
            
            // 更新缩放状态
            setZoom(newZoom);
            
            // 保存缩放值到canvas对象
            (canvas as any)._zoom = newZoom;
          }}
        >
          100%
        </Button>
      </div>
    </div>
  )
}

