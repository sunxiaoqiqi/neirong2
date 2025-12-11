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
    // 最多保存20步
    if (newHistory.length > 20) {
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
    
    const fabricCanvas = new fabric.Canvas(tempCanvasEl, {
      width: 1080,
      height: 1440,
      backgroundColor: '#ffffff',
    })
    
    // 加载初始数据
    if (initialData) {
      fabricCanvas.loadFromJSON(JSON.parse(initialData), () => {
        fabricCanvas.renderAll()
      })
    }
    
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
    
    // 添加事件监听
    setupCanvasEventListeners(fabricCanvas)
    
    return fabricCanvas
  }

  // 设置画布事件监听
  const setupCanvasEventListeners = (fabricCanvas: fabric.Canvas) => {
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
  }

  useEffect(() => {
    if (!canvasRef.current) return

    // 初始化Fabric.js画布
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1440,
      backgroundColor: '#ffffff',
    })

    // 设置画布引用
    setCanvas(fabricCanvas)
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
        
        // 调用撤销函数
        handleUndo();
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
    fabricCanvas.on('mouse:dblclick', (e) => {
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
    fabricCanvas.on('object:moving', (e) => {
      if (canvas._mode === 'crop' && canvas._cropTarget && canvas._cropRectangle && e.target === canvas._cropRectangle) {
        // 允许移动裁剪矩形
        fabricCanvas.renderAll();
      }
    });
    
    fabricCanvas.on('object:scaling', (e) => {
      if (canvas._mode === 'crop' && canvas._cropTarget && canvas._cropRectangle && e.target === canvas._cropRectangle) {
        // 允许调整裁剪矩形大小
        fabricCanvas.renderAll();
      }
    });
    
    // 魔法棒工具点击事件
    fabricCanvas.on('mouse:down', (e) => {
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
    (fabricCanvas as any)._zoom = zoom
    
    // 初始化canvas上下文
    fabricCanvas.renderAll()
    
    setCanvas(fabricCanvas)
    const initialJson = JSON.stringify(fabricCanvas.toJSON())
    setHistory([initialJson])
    setHistoryIndex(0)

    // 加载作品数据
    if (id) {
      // 直接使用fabricCanvas对象，而不是等待setCanvas更新状态
      const workId = Number(id)
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

      return uploadResponse.thumbnailUrl;
    } catch (error) {
      console.error('上传缩略图失败:', error);
      return null;
    }
  };
  
  // 多画布管理函数
  const addNewCanvas = () => {
    console.log('Creating new canvas...')
    
    // 首先保存当前画布状态，确保之前的更改被正确保存
    const saveSuccess = saveCurrentCanvasState()
    if (!saveSuccess) {
      console.warn('Failed to save current canvas state before adding new canvas')
    }
    
    // 创建一个全新的空画布
    const newCanvas = createNewCanvas()
    
    // 确保新画布是空的
    console.log('New canvas created with', newCanvas.getObjects().length, 'objects')
    
    // 创建canvases数组的新副本，添加新画布
    const newCanvases = [...canvases, newCanvas]
    setCanvases(newCanvases)
    
    // 切换到新画布
    const newIndex = newCanvases.length - 1
    setCurrentCanvasIndex(newIndex)
    setCanvas(newCanvas)
    
    // 强制延迟渲染，确保状态更新完成
    setTimeout(() => {
      // 更新画布显示
      renderCanvasToMainElement(newCanvas)
      
      // 记录创建完成
      console.log('New canvas added at index', newIndex)
      
      setHasUnsavedChanges(true)
    }, 0)
  }
  
  // 保存当前画布状态到canvases数组
  const saveCurrentCanvasState = () => {
    if (canvas && currentCanvasIndex >= 0 && currentCanvasIndex < canvases.length) {
      // 创建更新后的canvases数组
      const updatedCanvases = [...canvases]
      
      // 确保画布内容被正确保存到状态中
      // 我们不需要重新创建画布对象，只需要确保引用关系正确
      // fabric.js对象在内存中的状态已经包含了所有元素信息
      
      // 更新canvases数组中对应索引的画布状态
      updatedCanvases[currentCanvasIndex] = canvas
      
      // 更新状态，确保React组件重新渲染
      setCanvases(updatedCanvases)
      
      // 记录调试信息
      console.log('Canvas state saved:', { canvasIndex: currentCanvasIndex, objectsCount: canvas.getObjects().length })
      return true
    }
    console.warn('Failed to save canvas state:', { canvas, currentCanvasIndex, canvasesLength: canvases.length })
    return false
  }

  const deleteCanvas = (index: number) => {
    if (canvases.length <= 1) {
      message.warning('至少保留一个画布')
      return
    }
    
    // 删除前先保存当前画布状态
    saveCurrentCanvasState()
    
    Modal.confirm({
      title: '删除画布',
      content: '确定要删除此画布吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: () => {
        const canvasToDelete = canvases[index]
        if (canvasToDelete !== canvasRef.current?.fabric) {
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
    // 参数验证
    if (index === currentCanvasIndex || index < 0 || index >= canvases.length) {
      console.warn('Invalid canvas index for switch:', index)
      return
    }
    
    // 记录切换前的状态
    console.log(`Switching from canvas ${currentCanvasIndex} to ${index}`)
    
    // 切换前保存当前画布状态，确保所有更改被保存
    const saveSuccess = saveCurrentCanvasState()
    if (!saveSuccess) {
      console.warn('Failed to save current canvas state before switch')
    }
    
    // 设置新的当前画布索引
    setCurrentCanvasIndex(index)
    
    // 设置新的当前画布
    const targetCanvas = canvases[index]
    setCanvas(targetCanvas)
    
    // 确保目标画布有正确的引用
    console.log(`Target canvas has ${targetCanvas.getObjects().length} objects`)
    
    // 强制延迟渲染，确保状态更新完成
    setTimeout(() => {
      // 将选中的画布渲染到主画布元素，确保正确显示内容
      renderCanvasToMainElement(targetCanvas)
      
      // 标记为有未保存的更改
      setHasUnsavedChanges(true)
      console.log('Canvas switch completed')
    }, 0)
  }
  
  // 添加元素到当前选中的画布
  const addElementToCurrentCanvas = (element: fabric.Object) => {
    if (currentCanvasIndex >= 0 && currentCanvasIndex < canvases.length) {
      // 获取当前活动画布对象
      const currentCanvas = canvases[currentCanvasIndex];
      
      // 确保添加的是元素的一个全新副本，避免引用共享
      element.clone((clonedElement) => {
        if (clonedElement) {
          // 清除ID，确保每个画布上的元素有唯一标识
          clonedElement.id = undefined;
          
          // 添加克隆后的元素到画布
          currentCanvas.add(clonedElement);
          
          // 确保画布渲染
          currentCanvas.renderAll();
          
          // 如果当前显示的就是这个画布，也需要更新显示
          if (canvas === currentCanvas) {
            canvas.renderAll();
          }
          
          // 创建更新后的canvases数组，确保状态正确保存
          const updatedCanvases = [...canvases];
          updatedCanvases[currentCanvasIndex] = currentCanvas;
          setCanvases(updatedCanvases);
          
          // 标记有未保存的更改
          setHasUnsavedChanges(true);
          saveHistory();
        }
      });
      
      return currentCanvas;
    }
    return null;
  }
  
  const renderCanvasToMainElement = (targetCanvas: fabric.Canvas) => {
    if (!canvasRef.current || !canvas) {
      console.warn('Cannot render canvas: missing canvasRef or canvas object')
      return
    }
    
    // 记录开始渲染
    console.log('Rendering canvas with', targetCanvas.getObjects().length, 'objects')
    
    // 清空当前主画布的所有对象
    canvas.clear()
    
    // 复制画布背景色
    canvas.backgroundColor = targetCanvas.backgroundColor
    
    // 遍历目标画布上的所有对象，逐个复制到当前显示画布
    const objects = targetCanvas.getObjects();
    console.log('Objects to render:', objects.length)
    
    let clonedCount = 0;
    objects.forEach((obj, index) => {
      // 使用fabric.js的原生克隆方法确保属性完整复制
      fabric.util.object.clone(obj, (clonedObj) => {
        if (clonedObj) {
          // 清除可能导致冲突的ID
          clonedObj.id = undefined;
          
          // 确保对象位置和属性不变
          clonedObj.left = obj.left;
          clonedObj.top = obj.top;
          clonedObj.scaleX = obj.scaleX;
          clonedObj.scaleY = obj.scaleY;
          clonedObj.angle = obj.angle;
          
          // 添加克隆对象到主画布
          canvas.add(clonedObj);
          clonedCount++;
          
          // 当所有对象都克隆完成后，执行最终渲染
          if (clonedCount === objects.length) {
            // 重新设置画布尺寸
            canvas.setDimensions({
              width: targetCanvas.width,
              height: targetCanvas.height
            });
            
            // 重新设置事件监听器
            canvas.off()
            setupCanvasEventListeners(canvas)
            
            console.log('All objects cloned and added, performing final render')
            // 强制渲染画布，确保所有元素可见
            canvas.renderAll()
          }
        }
      });
    });
    
    // 特殊情况：如果没有对象需要渲染，也执行渲染
    if (objects.length === 0) {
      canvas.renderAll()
    }
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
        await workService.updateWork(Number(id), {
          canvasData: data,
          thumbnailUrl,
          ...(name && { name }),
        })
        message.success('保存成功！')
        setHasUnsavedChanges(false)
      } else {
        // 如果没有名称，弹出命名对话框
        if (!name) {
          setSaveNameModalVisible(true)
          return
        }
        await workService.createWork({
          name,
          canvasData: data,
          thumbnailUrl,
        })
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

  const handleUndo = () => {
    if (historyIndex > 0 && canvas) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      canvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
        canvas.renderAll()
      })
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
    // 添加元素前先保存当前画布状态
    saveCurrentCanvasState()
    
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
      left: 1080 / 2,
      top: 1440 / 2,
      fontSize: config.fontSize,
      fontFamily: 'Arial',
      fill: '#000000',
      originX: 'center',
      originY: 'center',
      name: uniqueName, // 设置唯一名称
    })

    const targetCanvas = addElementToCurrentCanvas(text)
    if (targetCanvas) {
      targetCanvas.setActiveObject(text)
      setHasUnsavedChanges(true)
      saveHistory()
    }
  }

  const handleAddImage = (imageUrl: string) => {
    // 添加元素前先保存当前画布状态
    saveCurrentCanvasState()
    
    // 创建一个新的Image元素，先加载图片
    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    
    imgElement.onload = () => {
      // 生成唯一图片名称
      const uniqueName = generateUniqueLayerName('图片')
      
      // 使用已加载的Image元素创建fabric图片对象
      const fabricImage = new fabric.Image(imgElement, {
        left: 1080 / 2,
        top: 1440 / 2,
        originX: 'center',
        originY: 'center',
        scaleX: 0.5,
        scaleY: 0.5,
        opacity: 1,
        name: uniqueName, // 设置唯一名称
      });
      
      // 使用addElementToCurrentCanvas方法添加图片
      const targetCanvas = addElementToCurrentCanvas(fabricImage);
      if (targetCanvas) {
        // 确保图片在最上层
        targetCanvas.bringToFront(fabricImage);
        // 选中图片
        targetCanvas.setActiveObject(fabricImage);
        // 更新历史记录
        setHasUnsavedChanges(true);
        saveHistory();
      }
    };
    
    imgElement.onerror = (error) => {
      console.error('Image loading failed:', error);
      message.error('图片加载失败');
    };
    
    // 开始加载图片
    imgElement.src = imageUrl;
  }

  const handleApplyTemplate = (templateData: string) => {
    if (!canvas) return
    try {
      const data = typeof templateData === 'string' ? JSON.parse(templateData) : templateData
      canvas.loadFromJSON(data, () => {
        canvas.renderAll()
        setHasUnsavedChanges(true)
      })
    } catch (error) {
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

  const handleSetBackground = (color: string) => {
    if (!canvas) return
    canvas.setBackgroundColor(color, () => {
      canvas.renderAll()
      setHasUnsavedChanges(true)
    })
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
                    await workService.duplicateWork(Number(id))
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
              onUndo={handleUndo}
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
          canvas={canvases[currentCanvasIndex] || canvas}
          onAddText={handleAddText}
          onAddImage={handleAddImage}
          onApplyTemplate={handleApplyTemplate}
          onSetBackground={handleSetBackground}
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
          <div className="h-20 flex items-center px-4 overflow-x-auto">
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

