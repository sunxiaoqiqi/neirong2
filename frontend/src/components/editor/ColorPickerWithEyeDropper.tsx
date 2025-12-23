import React, { useState, useEffect, useRef } from 'react';
import { ColorPicker, Button, Space, message, Modal } from 'antd';
import { EyeOutlined, CheckCircleOutlined, EyeInvisibleOutlined, BorderOutlined } from '@ant-design/icons';
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
  const [lastColor, setLastColor] = useState('');
  const [previewColor, setPreviewColor] = useState(''); // 实时预览的颜色
  const [isColorPreviewed, setIsColorPreviewed] = useState(false); // 是否已经预览了颜色
  const overlayRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null); // 预览元素引用
  
  // 处理透明色选择
  const handleTransparentClick = () => {
    if (disabled) {
      message.warning('当前功能已禁用');
      return;
    }
    
    // 设置透明色 - 使用 rgba(0,0,0,0) 格式，这样在 fabric.js 中能正确应用
    const transparentColor = {
      toHexString: () => 'rgba(0, 0, 0, 0)',
      toHslString: () => 'rgba(0, 0, 0, 0)',
      toRgbString: () => 'rgba(0, 0, 0, 0)',
      toRgb: () => ({ r: 0, g: 0, b: 0, a: 0 })
    };
    
    onChange(transparentColor);
  };

  // 处理吸色功能
  const handleEyeDropperClick = () => {
    if (disabled || !canvas) {
      message.warning(canvas ? '当前功能已禁用' : '画布未初始化，无法使用吸色功能');
      return;
    }
    
    setIsEyeDropperActive(true);
    setLastColor(value); // 保存当前颜色，以便用户可以比较
    setPreviewColor(''); // 重置预览颜色
    setIsColorPreviewed(false); // 重置预览状态
    
    // 更改鼠标指针样式为滴管形状
    document.body.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"%3E%3Cpath d=\"M9 2H7a2 2 0 0 0-2 2v2\"/%3E%3Cpath d=\"M15 2h2a2 2 0 0 1 2 2v2\"/%3E%3Cpath d=\"M9 10H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2\"/%3E%3Cpath d=\"M15 10h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2\"/%3E%3C/svg%3E") 0 24,auto';
    
    // 临时保存canvas的evented状态并禁用事件响应
    if (canvas) {
      // 使用类型断言解决TypeScript类型错误
      const fabricCanvas = canvas as any;
      fabricCanvas.__prevEvented = fabricCanvas.evented;
      fabricCanvas.evented = false;
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
    if (!isEyeDropperActive || !canvas) return;
    
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
  
  // 处理颜色拾取（单击确认）
  const handleColorPick = (e: MouseEvent) => {
    if (!isEyeDropperActive || !canvas) return;
    
    // 阻止事件冒泡，防止触发其他操作
    e.stopPropagation();
    e.preventDefault();
    
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
          // 直接调用onChange并提供一个与antd ColorPicker兼容的颜色对象
          onChange({
            toHexString: () => hexColor,
            toHslString: () => hexColor,
            toRgbString: () => hexColor,
            toRgb: () => {
              // 提取RGB值的简单实现
              const r = parseInt(hexColor.slice(1, 3), 16);
              const g = parseInt(hexColor.slice(3, 5), 16);
              const b = parseInt(hexColor.slice(5, 7), 16);
              return { r, g, b, a: 1 };
            }
          });
          
          // 显示成功消息，并包含颜色预览
          Modal.success({
            title: '颜色选择成功',
            content: (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: hexColor,
                  margin: '10px auto',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }} />
                <p>颜色值: {hexColor}</p>
                {lastColor && lastColor !== hexColor && (
                  <p style={{ color: '#666' }}>之前颜色: {lastColor}</p>
                )}
              </div>
            ),
            onOk() {
              // 确认后才完全退出吸色模式
              exitEyeDropperMode();
            },
            okText: '确定',
            cancelText: '取消',
            closable: true,
            maskClosable: true,
            onCancel: exitEyeDropperMode
          });
        } else {
          throw new Error('无法获取有效的颜色值');
        }
      } else {
        message.warning('请在画布范围内点击获取颜色');
      }
    } catch (error) {
      console.error('吸色功能出错:', error);
      message.error('获取颜色失败，请重试');
    }
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
    setIsEyeDropperActive(false);
    setIsColorPreviewed(false);
    setPreviewColor('');
    document.body.style.cursor = 'default';
    document.body.style.pointerEvents = 'auto'; // 恢复正常交互
    
    // 恢复canvas的evented状态
    if (canvas) {
      const fabricCanvas = canvas as any;
      if (typeof fabricCanvas.__prevEvented === 'boolean') {
        fabricCanvas.evented = fabricCanvas.__prevEvented;
        delete fabricCanvas.__prevEvented;
      }
    }
    
    // 移除事件监听器
    document.removeEventListener('keydown', handleForceExit);
    document.removeEventListener('click', handleColorPick, true);
    document.removeEventListener('click', handleGlobalClick, true);
    document.removeEventListener('mousemove', handleMouseMove);
  };
  
  // 强制退出吸色模式的处理函数
  const handleForceExit = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isEyeDropperActive) {
      // ESC键时直接退出吸色模式
      message.info('已取消吸色操作');
      exitEyeDropperMode();
    }
  };
  
  // 全局点击事件处理（主要用于非画布区域点击）
  const handleGlobalClick = (e: MouseEvent) => {
    // 这里可以添加额外的逻辑，但主要逻辑在handleColorPick中
  };
  
  // 处理ESC键退出吸色模式
  useEffect(() => {
    // 添加ESC键事件监听
    document.addEventListener('keydown', handleForceExit);
    
    // 清理函数
    return () => {
      // 清理所有事件监听器
      document.removeEventListener('keydown', handleForceExit);
    };
  }, []); // 只在组件挂载和卸载时执行
  
  // 处理吸色模式相关事件
  useEffect(() => {
    // 确保先移除所有可能存在的旧事件监听器
    document.removeEventListener('click', handleColorPick, true);
    document.removeEventListener('click', handleGlobalClick, true);
    document.removeEventListener('mousemove', handleMouseMove);
    
    if (isEyeDropperActive && canvas) {
      // 吸色模式激活时的处理
      document.addEventListener('click', handleColorPick, true); // 使用捕获阶段
      document.addEventListener('click', handleGlobalClick, true);
      document.addEventListener('mousemove', handleMouseMove); // 添加鼠标移动事件监听
      document.body.style.pointerEvents = 'auto'; // 允许点击事件
    }
    
    return () => {
      // 清理吸色模式相关事件监听器
      document.removeEventListener('click', handleColorPick, true);
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isEyeDropperActive]); // 只在吸色模式状态变化时执行
  
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
  
  // 全屏遮罩提示组件
  const EyeDropperOverlay = () => (
    <div 
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.1)', // 降低透明度，让用户更专注于画布
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none', // 不阻止事件冒泡到canvas
      }}
    >
      <div 
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '15px 20px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          pointerEvents: 'auto', // 允许点击提示框本身
        }}
      >
        <EyeOutlined style={{ fontSize: '20px', color: '#1890ff', marginBottom: '8px' }} />
        <h3 style={{ margin: '8px 0', fontSize: '16px' }}>实时吸色模式</h3>
        <p style={{ color: '#666', marginBottom: '8px', fontSize: '14px' }}>
          将滴管移动到目标颜色上实时预览，单击确认选择
        </p>
        <p style={{ color: '#999', fontSize: '12px' }}>
          按 <kbd style={{ padding: '2px 6px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>ESC</kbd> 取消
        </p>
        {isColorPreviewed && previewColor && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              backgroundColor: previewColor,
              margin: '5px auto',
              border: '1px solid #d9d9d9',
              borderRadius: '4px'
            }} />
            <p style={{ fontSize: '12px', color: '#1890ff', margin: '0' }}>
              预览颜色: {previewColor}
            </p>
          </div>
        )}
      </div>
    </div>
  );
  
  // 实时颜色预览组件（跟随鼠标）
  const ColorPreviewTooltip = () => (
    <div
      ref={previewRef}
      style={{
        position: 'fixed',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 10000,
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
  
  // 检查当前颜色是否为透明色
  const isTransparent = value === 'transparent' || 
                       value === 'rgba(0, 0, 0, 0)' || 
                       value === 'rgba(0,0,0,0)' ||
                       (typeof value === 'string' && value.includes('rgba') && value.includes('0, 0, 0, 0'));

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
        <Button
          icon={<BorderOutlined />}
          size="small"
          onClick={handleTransparentClick}
          disabled={disabled}
          className={`px-2 ${isTransparent ? 'bg-blue-100 text-blue-600 border-blue-300' : ''}`}
          title="透明色"
        />
        <Button
          icon={isEyeDropperActive ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          size="small"
          onClick={handleEyeDropperClick}
          disabled={disabled || !canvas}
          className={`px-2 ${isEyeDropperActive ? 'bg-blue-100 text-blue-600 border-blue-300' : ''}`}
          title={isEyeDropperActive ? '将滴管移动到目标颜色上，单击确认选择' : '吸色工具'}
        />
      </Space>
      
      {/* 当吸色模式激活时显示遮罩提示 */}
      {isEyeDropperActive && <EyeDropperOverlay />}
      
      {/* 实时颜色预览提示 */}
      {isEyeDropperActive && <ColorPreviewTooltip />}
    </>
  );
};

export default ColorPickerWithEyeDropper;
