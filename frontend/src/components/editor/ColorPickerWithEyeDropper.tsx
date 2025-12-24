import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ColorPicker, Button, Space, message, Tooltip, Modal } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, BgColorsOutlined } from '@ant-design/icons';
import { fabric } from 'fabric';

interface ColorPickerWithEyeDropperProps {
  value: string;
  onChange: (color: any) => void;
  canvas?: fabric.Canvas | null;
  showText?: boolean;
  disabled?: boolean;
}

const ColorPickerWithEyeDropper: React.FC<ColorPickerWithEyeDropperProps> = ({
  value,
  onChange,
  canvas,
  showText = false,
  disabled = false,
}) => {
  const [isEyeDropperActive, setIsEyeDropperActive] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // 强制更新计数器
  const [lastColor, setLastColor] = useState('');
  const [previewColor, setPreviewColor] = useState(''); // 实时预览的颜色
  const [isColorPreviewed, setIsColorPreviewed] = useState(false); // 是否已经预览了颜色
  const [selectedColor, setSelectedColor] = useState<string | null>(null); // 选定的颜色（等待确认）
  const selectedColorRef = useRef<string | null>(null); // 使用ref存储以便在事件处理中访问
  const modalUpdateIntervalRef = useRef<number | null>(null); // Modal 更新定时器
  const previewRef = useRef<HTMLDivElement>(null); // 预览元素引用
  const isEyeDropperActiveRef = useRef(false); // 使用 ref 存储状态，确保在事件处理中能访问最新值
  const [showModal, setShowModal] = useState(false); // 使用单独的 state 来控制 Modal 显示
  const modalRootRef = useRef<HTMLDivElement | null>(null); // Modal 根元素引用
  const modalRootContainerRef = useRef<ReturnType<typeof createRoot> | null>(null); // React 18 root 容器
  
  // 监听 isEyeDropperActive 状态变化，同步 ref
  useEffect(() => {
    // 只在状态变化时同步 ref，不要覆盖手动设置的值
    if (isEyeDropperActive !== isEyeDropperActiveRef.current) {
      isEyeDropperActiveRef.current = isEyeDropperActive;
      console.log('useEffect 触发，isEyeDropperActive 状态变化:', isEyeDropperActive, 'ref 已同步');
    }
    
    // 如果状态变为 true，强制触发一次渲染
    if (isEyeDropperActive) {
      console.log('吸色器已激活，强制更新');
      setForceUpdate(prev => prev + 1);
    }
  }, [isEyeDropperActive]);
  
  // 监听 ref 和 state 变化，确保 Modal 显示
  useEffect(() => {
    const shouldShow = isEyeDropperActive || isEyeDropperActiveRef.current;
    console.log('useEffect 检查 Modal 显示，isEyeDropperActive:', isEyeDropperActive, 'ref:', isEyeDropperActiveRef.current, 'shouldShow:', shouldShow, 'showModal:', showModal);
    if (shouldShow && !showModal) {
      console.log('需要显示 Modal，设置 showModal 为 true');
      setShowModal(true);
    } else if (!shouldShow && showModal) {
      console.log('需要隐藏 Modal，设置 showModal 为 false');
      setShowModal(false);
    }
  }, [forceUpdate, isEyeDropperActive, showModal]); // 依赖多个值来触发检查
  
  // 移除组件渲染日志，避免无限循环
  // useEffect(() => {
  //   console.log('ColorPickerWithEyeDropper 组件渲染，isEyeDropperActive:', isEyeDropperActive, 'ref:', isEyeDropperActiveRef.current, 'forceUpdate:', forceUpdate);
  // });
  
  // 处理吸色功能
  const handleEyeDropperClick = () => {
    console.log('handleEyeDropperClick 被调用，disabled:', disabled, 'canvas:', !!canvas);
    
    if (disabled || !canvas) {
      message.warning(canvas ? '当前功能已禁用' : '画布未初始化，无法使用吸色功能');
      return;
    }
    
    console.log('激活吸色器模式，当前状态:', isEyeDropperActive, 'ref:', isEyeDropperActiveRef.current);
    
    // 先更新 ref，再更新 state
    console.log('准备调用 setIsEyeDropperActive(true)');
    isEyeDropperActiveRef.current = true; // 先更新 ref，不等待重新渲染
    console.log('ref 已更新为:', isEyeDropperActiveRef.current);
    
    // 更新 state
    setIsEyeDropperActive(true);
    console.log('调用 setIsEyeDropperActive(true) 完成');
    
    // 直接设置 showModal 为 true，不等待组件重新渲染
    setShowModal(true);
    console.log('setShowModal(true) 已调用');
    
    // 直接使用 createRoot 渲染 Modal，不依赖组件重新渲染
    if (!modalRootRef.current) {
      const container = document.createElement('div');
      container.id = 'eye-dropper-modal-container';
      document.body.appendChild(container);
      modalRootRef.current = container;
      modalRootContainerRef.current = createRoot(container);
      console.log('创建 Modal 容器和 root');
    }
    
    // 渲染 Modal 的函数
    const renderModal = () => {
      if (!modalRootContainerRef.current) return;
      
      const currentSelectedColor = selectedColorRef.current || selectedColor;
      const currentPreviewColor = previewColor;
      const currentIsColorPreviewed = isColorPreviewed;
      
      console.log('渲染 Modal，selectedColor:', currentSelectedColor, 'previewColor:', currentPreviewColor);
      
      modalRootContainerRef.current.render(
        <Modal
          open={true}
          closable={false}
          footer={null}
          mask={true}
          maskClosable={false}
          width={400}
          centered
          zIndex={10000}
          getContainer={false}
          styles={{
            mask: {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              backdropFilter: 'none',
              pointerEvents: 'none',
            },
            body: {
              padding: '20px',
              textAlign: 'center',
              pointerEvents: 'auto',
            },
          }}
          style={{
            pointerEvents: 'none',
          }}
        >
          <div>
            <EyeOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '12px' }} />
            <h3 style={{ margin: '12px 0', fontSize: '16px', fontWeight: 600 }}>实时吸色模式</h3>
            <p style={{ color: '#666', marginBottom: '12px', fontSize: '14px' }}>
              将滴管移动到目标颜色上实时预览，<strong>单击选定颜色</strong>
            </p>
            {currentSelectedColor ? (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '6px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: currentSelectedColor,
                  margin: '8px auto',
                  border: '2px solid #1890ff',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }} />
                <p style={{ fontSize: '14px', color: '#1890ff', margin: '8px 0', fontWeight: 'bold' }}>
                  已选定: {currentSelectedColor}
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>
                  按 <kbd style={{ padding: '3px 8px', backgroundColor: '#1890ff', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>A</kbd> 键确认应用
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                按 <kbd style={{ padding: '3px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>ESC</kbd> 取消
              </p>
            )}
            {currentIsColorPreviewed && currentPreviewColor && !currentSelectedColor && (
              <div style={{ marginTop: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: currentPreviewColor,
                  margin: '8px auto',
                  border: '2px solid #d9d9d9',
                  borderRadius: '6px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                }} />
                <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0' }}>
                  预览颜色: {currentPreviewColor}
                </p>
              </div>
            )}
          </div>
        </Modal>
      );
    };
    
    // 立即渲染一次
    renderModal();
    console.log('Modal 已渲染到容器');
    
    // 设置定时器定期更新 Modal（每 100ms 更新一次）
    if (modalUpdateIntervalRef.current) {
      clearInterval(modalUpdateIntervalRef.current);
    }
    modalUpdateIntervalRef.current = window.setInterval(() => {
      if (isEyeDropperActiveRef.current && modalRootContainerRef.current) {
        renderModal();
      } else {
        if (modalUpdateIntervalRef.current) {
          clearInterval(modalUpdateIntervalRef.current);
          modalUpdateIntervalRef.current = null;
        }
      }
    }, 100);
    
    // 直接添加事件监听器，不等待 useEffect
    console.log('准备添加吸色模式事件监听器');
    if (canvas) {
      // 创建包装函数，确保能访问最新的 ref
      const clickHandler = (e: MouseEvent) => {
        console.log('点击事件触发，ref:', isEyeDropperActiveRef.current);
        if (isEyeDropperActiveRef.current) {
          handleColorPick(e);
        }
      };
      
      const moveHandler = (e: MouseEvent) => {
        if (isEyeDropperActiveRef.current) {
          handleMouseMove(e);
        }
      };
      
      const confirmHandler = (e: KeyboardEvent) => {
        // ESC 键由专门的监听器处理，这里不处理
        if (e.key === 'Escape') {
          return;
        }
        if (isEyeDropperActiveRef.current) {
          handleConfirmColor(e);
        }
      };
      
      // ESC 键处理函数
      const escHandler = (e: KeyboardEvent) => {
        console.log('ESC键处理函数触发，key:', e.key, 'ref:', isEyeDropperActiveRef.current);
        if (e.key === 'Escape' && isEyeDropperActiveRef.current) {
          console.log('ESC键被按下，退出吸色模式');
          e.preventDefault();
          e.stopPropagation();
          message.info('已取消吸色操作');
          exitEyeDropperMode();
        }
      };
      
      // 保存处理函数引用以便后续移除
      (window as any).__eyeDropperClickHandler = clickHandler;
      (window as any).__eyeDropperMoveHandler = moveHandler;
      (window as any).__eyeDropperConfirmHandler = confirmHandler;
      (window as any).__eyeDropperEscHandler = escHandler;
      
      document.addEventListener('click', clickHandler, true);
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('keydown', confirmHandler, true);
      document.addEventListener('keydown', escHandler, true); // 使用捕获阶段，确保优先处理
      console.log('吸色模式事件监听器已添加');
    }
    
    // 强制触发重新渲染
    setForceUpdate(prev => {
      const newValue = prev + 1;
      console.log('setForceUpdate 调用，prev:', prev, '新值:', newValue);
      return newValue;
    });
    
    setLastColor(value); // 保存当前颜色，以便用户可以比较
    setPreviewColor(''); // 重置预览颜色
    setIsColorPreviewed(false); // 重置预览状态
    
    // 更改鼠标指针样式为滴管形状
    document.body.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3E%3Cpath d=\"M9 2H7a2 2 0 0 0-2 2v2\"/%3E%3Cpath d=\"M15 2h2a2 2 0 0 1 2 2v2\"/%3E%3Cpath d=\"M9 10H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2\"/%3E%3Cpath d=\"M15 10h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2\"/%3E%3C/svg%3E") 0 24,auto';
    
    // 禁用画布和所有对象的编辑功能
    if (canvas) {
      const fabricCanvas = canvas as any;
      
      // 保存canvas的原始状态
      fabricCanvas.__prevEvented = fabricCanvas.evented;
      fabricCanvas.__prevSelectable = fabricCanvas.selection;
      
      // 禁用画布事件和选择
      fabricCanvas.evented = false;
      fabricCanvas.selection = false;
      
      // 保存所有对象的原始状态并禁用它们
      const objects = canvas.getObjects();
      fabricCanvas.__disabledObjects = objects.map((obj: fabric.Object) => {
        const prevState = {
          selectable: obj.selectable,
          evented: obj.evented,
          hoverCursor: obj.hoverCursor,
          moveCursor: obj.moveCursor,
        };
        
        // 禁用对象的交互
        obj.set({
          selectable: false,
          evented: false,
          hoverCursor: 'default',
          moveCursor: 'default',
        });
        
        return { obj, prevState };
      });
      
      // 取消当前选中的对象
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };
  
  // 获取颜色的统一方法
  const getColorAtPosition = (x: number, y: number): string | null => {
    if (!canvas) return null;
    
    try {
      // 获取canvas元素
      const canvasEl = canvas.getElement();
      if (!canvasEl) return null;
      
      // 方法1: 使用fabric.js的getPixelColor方法(如果支持)
      try {
        // 使用类型断言解决TypeScript类型错误
        const fabricCanvas = canvas as any;
        let hexColor = fabricCanvas.getPixelColor(x, y);
        if (hexColor) {
          // 确保颜色是标准十六进制格式
          if (!hexColor.startsWith('#')) {
            hexColor = '#' + hexColor;
          }
          return hexColor;
        }
      } catch (fabricError) {
        // 方法2: 如果fabric.js方法失败，使用Canvas API
        const ctx = canvasEl.getContext('2d');
        if (!ctx) throw new Error('无法获取canvas上下文');
        
        // 获取像素数据
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        
        // 将RGB转换为十六进制颜色
        return rgbToHex(pixel[0], pixel[1], pixel[2]);
      }
      
      // 方法3: 如果前两种方法都失败，尝试备选策略
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.fill) {
        return typeof activeObject.fill === 'string' ? activeObject.fill : '#000000';
      }
      
      // 获取画布背景色
      const fabricCanvas = canvas as any;
      const backgroundColor = fabricCanvas.backgroundColor;
      if (typeof backgroundColor === 'string') {
        return backgroundColor;
      } else if (backgroundColor && typeof backgroundColor === 'object' && 'hex' in backgroundColor) {
        // 添加类型断言确保返回string类型
        return String(backgroundColor.hex);
      }
      
      return '#ffffff'; // 默认白色
    } catch (error) {
      console.error('获取颜色出错:', error);
      return null;
    }
  };
  
  // 处理鼠标移动时的实时颜色预览
  const handleMouseMove = (e: MouseEvent) => {
    if (!isEyeDropperActiveRef.current || !canvas) return;
    
    try {
      // 获取canvas元素
      const canvasEl = canvas.getElement();
      if (!canvasEl) return;
      
      // 获取canvas在页面中的位置
      const rect = canvasEl.getBoundingClientRect();
      
      // 计算相对于canvas的坐标
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 检查是否在canvas范围内
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const hexColor = getColorAtPosition(x, y);
        if (hexColor) {
          setPreviewColor(hexColor);
          setIsColorPreviewed(true);
          
          // 更新鼠标悬停位置的预览提示
          if (previewRef.current) {
            previewRef.current.style.left = `${e.clientX + 10}px`;
            previewRef.current.style.top = `${e.clientY - 30}px`;
          }
        }
      }
    } catch (error) {
      console.error('实时预览出错:', error);
    }
  };
  
  // 处理颜色拾取（单击选定颜色，等待按A键确认）
  const handleColorPick = (e: MouseEvent) => {
    console.log('handleColorPick 被调用，ref:', isEyeDropperActiveRef.current, 'canvas:', !!canvas);
    if (!isEyeDropperActiveRef.current || !canvas) {
      console.log('条件不满足，退出');
      return;
    }
    
    // 阻止事件冒泡，防止触发其他操作
    e.stopPropagation();
    e.preventDefault();
    console.log('开始处理颜色拾取');
    
    try {
      // 获取canvas元素
      const canvasEl = canvas.getElement();
      if (!canvasEl) {
        throw new Error('无法获取canvas元素');
      }
      
      // 获取canvas在页面中的位置
      const rect = canvasEl.getBoundingClientRect();
      
      // 计算相对于canvas的坐标
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 检查点击是否在canvas范围内
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const hexColor = getColorAtPosition(x, y);
        
        if (hexColor) {
          // 选定颜色，等待按A键确认
          setSelectedColor(hexColor);
          selectedColorRef.current = hexColor; // 同时更新ref
          setPreviewColor(hexColor);
          setIsColorPreviewed(true);
          message.info(`已选定颜色: ${hexColor}，按 A 键确认应用`, 2);
        } else {
          throw new Error('无法获取有效的颜色值');
        }
      } else {
        // 点击画布外区域，退出吸色模式
        exitEyeDropperMode();
      }
    } catch (error) {
      console.error('吸色功能出错:', error);
      message.error('获取颜色失败，请重试');
    }
  };
  
  // 处理按A键确认颜色选择
  const handleConfirmColor = (e: KeyboardEvent) => {
    if (!isEyeDropperActiveRef.current) return;
    
    // 检查是否按下了A键（不区分大小写）
    if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const currentColor = selectedColorRef.current;
      
      if (!currentColor) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // 应用选定的颜色
      onChange({
        toHexString: () => currentColor,
        toHslString: () => currentColor,
        toRgbString: () => currentColor,
        toRgb: () => {
          // 提取RGB值的简单实现
          const r = parseInt(currentColor.slice(1, 3), 16);
          const g = parseInt(currentColor.slice(3, 5), 16);
          const b = parseInt(currentColor.slice(5, 7), 16);
          return { r, g, b, a: 1 };
        }
      });
      
      // 显示成功提示
      message.success(`已应用颜色: ${currentColor}`, 1.5);
      
      // 退出吸色模式
      exitEyeDropperMode();
    }
  };
  
  // 处理透明色选择
  const handleTransparentClick = () => {
    // 透明色使用 rgba(0, 0, 0, 0) 或 'transparent'
    onChange({
      toHexString: () => 'transparent',
      toHslString: () => 'transparent',
      toRgbString: () => 'rgba(0, 0, 0, 0)',
      toRgb: () => ({ r: 0, g: 0, b: 0, a: 0 })
    });
    message.success('已选择透明色', 1);
  };
  
  // RGB转十六进制颜色
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };
  
  // 退出吸色模式
  const exitEyeDropperMode = () => {
    console.log('退出吸色模式');
    setIsEyeDropperActive(false);
    isEyeDropperActiveRef.current = false;
    setShowModal(false);
    
    // 移除事件监听器（使用保存的引用）
    if ((window as any).__eyeDropperClickHandler) {
      document.removeEventListener('click', (window as any).__eyeDropperClickHandler, true);
      delete (window as any).__eyeDropperClickHandler;
    }
    if ((window as any).__eyeDropperMoveHandler) {
      document.removeEventListener('mousemove', (window as any).__eyeDropperMoveHandler);
      delete (window as any).__eyeDropperMoveHandler;
    }
    if ((window as any).__eyeDropperConfirmHandler) {
      document.removeEventListener('keydown', (window as any).__eyeDropperConfirmHandler, true);
      delete (window as any).__eyeDropperConfirmHandler;
    }
    if ((window as any).__eyeDropperEscHandler) {
      document.removeEventListener('keydown', (window as any).__eyeDropperEscHandler, true);
      delete (window as any).__eyeDropperEscHandler;
    }
    console.log('已移除吸色模式事件监听器');
    
    // 清除更新定时器
    if (modalUpdateIntervalRef.current) {
      clearInterval(modalUpdateIntervalRef.current);
      modalUpdateIntervalRef.current = null;
    }
    
    // 移除 ESC 键监听器
    if ((window as any).__eyeDropperEscHandler) {
      document.removeEventListener('keydown', (window as any).__eyeDropperEscHandler, true);
      delete (window as any).__eyeDropperEscHandler;
    }
    
    // 卸载 Modal
    if (modalRootContainerRef.current && modalRootRef.current) {
      modalRootContainerRef.current.render(null);
      console.log('Modal 已卸载');
    }
    setIsColorPreviewed(false);
    setPreviewColor('');
    setSelectedColor(null); // 清空选定的颜色
    selectedColorRef.current = null; // 清空ref
    document.body.style.cursor = 'default';
    document.body.style.pointerEvents = 'auto'; // 恢复正常交互
    
    // 恢复canvas和所有对象的状态
    if (canvas) {
      const fabricCanvas = canvas as any;
      
      // 恢复canvas的原始状态
      if (typeof fabricCanvas.__prevEvented === 'boolean') {
        fabricCanvas.evented = fabricCanvas.__prevEvented;
        delete fabricCanvas.__prevEvented;
      }
      
      if (typeof fabricCanvas.__prevSelectable === 'boolean') {
        fabricCanvas.selection = fabricCanvas.__prevSelectable;
        delete fabricCanvas.__prevSelectable;
      }
      
      // 恢复所有对象的原始状态
      if (Array.isArray(fabricCanvas.__disabledObjects)) {
        fabricCanvas.__disabledObjects.forEach((item: any) => {
          if (item && item.obj && item.prevState) {
            item.obj.set({
              selectable: item.prevState.selectable,
              evented: item.prevState.evented,
              hoverCursor: item.prevState.hoverCursor,
              moveCursor: item.prevState.moveCursor,
            });
          }
        });
        delete fabricCanvas.__disabledObjects;
      }
      
      canvas.renderAll();
    }
    
    // 移除事件监听器
    document.removeEventListener('keydown', handleForceExit);
    document.removeEventListener('keydown', handleConfirmColor);
    document.removeEventListener('click', handleColorPick, true);
    document.removeEventListener('click', handleGlobalClick, true);
    document.removeEventListener('mousemove', handleMouseMove);
  };
  
  // 强制退出吸色模式的处理函数
  const handleForceExit = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isEyeDropperActiveRef.current) {
      // ESC键时直接退出吸色模式
      console.log('ESC键被按下，退出吸色模式');
      message.info('已取消吸色操作');
      exitEyeDropperMode();
    }
  };
  
  // 全局点击事件处理（主要用于非画布区域点击）
  const handleGlobalClick = (e: MouseEvent) => {
    // 这里可以添加额外的逻辑，但主要逻辑在handleColorPick中
  };
  
  // 处理ESC键退出吸色模式 - 使用全局监听器
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('ESC监听器触发，key:', e.key, 'ref:', isEyeDropperActiveRef.current);
      if (e.key === 'Escape' && isEyeDropperActiveRef.current) {
        console.log('ESC键被按下，退出吸色模式');
        e.preventDefault();
        e.stopPropagation();
        message.info('已取消吸色操作');
        exitEyeDropperMode();
      }
    };
    
    // 添加ESC键事件监听，使用捕获阶段确保能捕获
    document.addEventListener('keydown', handleKeyDown, true);
    
    // 保存处理函数引用以便后续移除
    (window as any).__eyeDropperEscHandler = handleKeyDown;
    
    // 清理函数
    return () => {
      if ((window as any).__eyeDropperEscHandler) {
        document.removeEventListener('keydown', (window as any).__eyeDropperEscHandler, true);
        delete (window as any).__eyeDropperEscHandler;
      }
    };
  }, []); // 只在组件挂载和卸载时执行
  
  // 处理吸色模式相关事件
  useEffect(() => {
    // 使用 ref 检查状态，因为状态更新可能还没生效
    const isActive = isEyeDropperActive || isEyeDropperActiveRef.current;
    
    if (isActive && canvas) {
      console.log('添加吸色模式事件监听器，isEyeDropperActive:', isEyeDropperActive, 'ref:', isEyeDropperActiveRef.current);
      // 吸色模式激活时的处理
      document.addEventListener('click', handleColorPick, true); // 使用捕获阶段
      document.addEventListener('click', handleGlobalClick, true);
      document.addEventListener('mousemove', handleMouseMove); // 添加鼠标移动事件监听
      document.addEventListener('keydown', handleConfirmColor); // 添加A键确认监听
      document.body.style.pointerEvents = 'auto'; // 允许点击事件
      
      return () => {
        // 清理吸色模式相关事件监听器
        console.log('清理吸色模式事件监听器');
        document.removeEventListener('click', handleColorPick, true);
        document.removeEventListener('click', handleGlobalClick, true);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleConfirmColor);
      };
    }
  }, [isEyeDropperActive, forceUpdate, canvas]); // 依赖多个值来触发
  
  // 确保在组件卸载时恢复正常状态
  useEffect(() => {
    return () => {
      if (isEyeDropperActive) {
        // 强制重置状态并移除所有监听器
        document.removeEventListener('keydown', handleForceExit);
        document.removeEventListener('click', handleColorPick, true);
        document.removeEventListener('click', handleGlobalClick, true);
        document.removeEventListener('mousemove', handleMouseMove);
        
        // 恢复鼠标样式
        document.body.style.cursor = 'default';
      }
    };
  }, []); // 只在组件卸载时执行一次
  
  // 全屏遮罩提示组件 - 使用 Modal 确保正确显示
  const EyeDropperOverlay = () => {
    console.log('EyeDropperOverlay 函数被调用，isEyeDropperActive:', isEyeDropperActive);
    
    // 直接渲染 Modal，不在这里检查状态（外层已经检查了）
    return (
      <Modal
        open={true}
        closable={false}
        footer={null}
        mask={true}
        maskClosable={false}
        width={400}
        centered
        zIndex={10000}
        getContainer={document.body}
        maskStyle={{
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'none',
          pointerEvents: 'none', // 不阻止画布上的点击事件
        }}
        style={{
          pointerEvents: 'none', // Modal 容器不阻止事件
        }}
        wrapStyle={{
          pointerEvents: 'none', // wrap 不阻止事件
        }}
        bodyStyle={{
          padding: '20px',
          textAlign: 'center',
          pointerEvents: 'auto', // 只有内容区域可以交互
        }}
      >
        <div>
          <EyeOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '12px' }} />
          <h3 style={{ margin: '12px 0', fontSize: '16px', fontWeight: 600 }}>实时吸色模式</h3>
          <p style={{ color: '#666', marginBottom: '12px', fontSize: '14px' }}>
            将滴管移动到目标颜色上实时预览，<strong>单击选定颜色</strong>
          </p>
          {selectedColor ? (
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '6px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                backgroundColor: selectedColor,
                margin: '8px auto',
                border: '2px solid #1890ff',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }} />
              <p style={{ fontSize: '14px', color: '#1890ff', margin: '8px 0', fontWeight: 'bold' }}>
                已选定: {selectedColor}
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>
                按 <kbd style={{ padding: '3px 8px', backgroundColor: '#1890ff', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>A</kbd> 键确认应用
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
              按 <kbd style={{ padding: '3px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>ESC</kbd> 取消
            </p>
          )}
          {isColorPreviewed && previewColor && !selectedColor && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: previewColor,
                margin: '8px auto',
                border: '2px solid #d9d9d9',
                borderRadius: '6px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
              }} />
              <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0' }}>
                预览颜色: {previewColor}
              </p>
            </div>
          )}
        </div>
      </Modal>
    );
  };
  
  // 实时颜色预览组件（跟随鼠标）
  const ColorPreviewTooltip = () => {
    if (!isEyeDropperActive) return null;
    
    const tooltipContent = (
      <div
        ref={previewRef}
        style={{
          position: 'fixed',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 2147483647, // 使用最大 z-index 值
          display: isColorPreviewed ? 'flex' : 'none',
          alignItems: 'center',
          pointerEvents: 'none', // 不阻止事件
        }}
      >
      <div style={{
        width: '16px',
        height: '16px',
        backgroundColor: previewColor,
        border: '1px solid white',
        borderRadius: '2px',
        marginRight: '6px'
      }} />
      {previewColor}
    </div>
    );
    
    // 使用 Portal 渲染到 body，确保在最上层
    if (typeof document !== 'undefined' && document.body) {
      return createPortal(tooltipContent, document.body);
    }
    return tooltipContent;
  };
  
  // 检查当前颜色是否为透明
  const isTransparent = value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || 
    (typeof value === 'object' && value && 'toRgb' in value && (value as any).toRgb && (value as any).toRgb().a === 0);
  
  return (
    <>
      <Space size={0} className="color-picker-with-eyedropper">
        <ColorPicker 
          value={isColorPreviewed ? previewColor : value} // 实时预览颜色效果
          onChange={onChange}
          showText={showText}
          disabled={disabled || isEyeDropperActive}
          style={{ 
            width: showText ? '200px' : '40px',
            borderColor: isEyeDropperActive ? '#1890ff' : undefined
          }}
        />
        <Tooltip title="透明色">
          <Button
            icon={<BgColorsOutlined />}
            size="small"
            onClick={handleTransparentClick}
            disabled={disabled || isEyeDropperActive}
            className={`px-2 ${isTransparent ? 'bg-blue-100 text-blue-600 border-blue-300' : ''}`}
            style={{
              position: 'relative',
              background: isTransparent ? 'repeating-linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 50%, #f0f0f0 50%, #f0f0f0 75%, transparent 75%, transparent)' : undefined,
              backgroundSize: isTransparent ? '8px 8px' : undefined
            }}
          >
            {isTransparent && (
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '14px',
                height: '2px',
                backgroundColor: '#ff4d4f',
                transform: 'translate(-50%, -50%) rotate(45deg)',
                borderRadius: '1px'
              }} />
            )}
          </Button>
        </Tooltip>
        <Tooltip title={isEyeDropperActive ? (selectedColor ? '已选定颜色，按A键确认应用' : '点击画布上的颜色选定，按A键确认应用') : '吸色工具'}>
          <Button
            icon={isEyeDropperActive ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            size="small"
            onClick={(e) => {
              console.log('按钮被点击，disabled:', disabled, 'canvas:', !!canvas);
              e.preventDefault();
              e.stopPropagation();
              handleEyeDropperClick();
            }}
            disabled={disabled || !canvas}
            className={`px-2 ${isEyeDropperActive ? 'bg-blue-100 text-blue-600 border-blue-300' : ''}`}
          />
        </Tooltip>
      </Space>
      
      {/* 当吸色模式激活时显示遮罩提示 - 使用 showModal state 控制显示 */}
      {showModal && createPortal(
            <Modal
              open={true}
              closable={false}
              footer={null}
              mask={true}
              maskClosable={false}
              width={400}
              centered
              zIndex={10000}
              getContainer={false}
              maskStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                backdropFilter: 'none',
                pointerEvents: 'none', // 不阻止画布上的点击事件
              }}
              style={{
                pointerEvents: 'none', // Modal 容器不阻止事件
              }}
              wrapStyle={{
                pointerEvents: 'none', // wrap 不阻止事件
              }}
              bodyStyle={{
                padding: '20px',
                textAlign: 'center',
                pointerEvents: 'auto', // 只有内容区域可以交互
              }}
            >
              <div>
                <EyeOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '12px' }} />
                <h3 style={{ margin: '12px 0', fontSize: '16px', fontWeight: 600 }}>实时吸色模式</h3>
                <p style={{ color: '#666', marginBottom: '12px', fontSize: '14px' }}>
                  将滴管移动到目标颜色上实时预览，<strong>单击选定颜色</strong>
                </p>
                {selectedColor ? (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '6px' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: selectedColor,
                      margin: '8px auto',
                      border: '2px solid #1890ff',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }} />
                    <p style={{ fontSize: '14px', color: '#1890ff', margin: '8px 0', fontWeight: 'bold' }}>
                      已选定: {selectedColor}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '0' }}>
                      按 <kbd style={{ padding: '3px 8px', backgroundColor: '#1890ff', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>A</kbd> 键确认应用
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                    按 <kbd style={{ padding: '3px 8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>ESC</kbd> 取消
                  </p>
                )}
                {isColorPreviewed && previewColor && !selectedColor && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: previewColor,
                      margin: '8px auto',
                      border: '2px solid #d9d9d9',
                      borderRadius: '6px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                    }} />
                    <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0' }}>
                      预览颜色: {previewColor}
                    </p>
                  </div>
                )}
              </div>
        </Modal>,
        document.body
      )}
      
      {/* 实时颜色预览提示 */}
      {(isEyeDropperActive || isEyeDropperActiveRef.current) && <ColorPreviewTooltip />}
    </>
  );
};

export default ColorPickerWithEyeDropper;
