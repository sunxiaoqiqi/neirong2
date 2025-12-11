import React from 'react'
import { Spin, Modal } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  fullScreen?: boolean
  zIndex?: number
  size?: 'small' | 'default' | 'large'
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = '加载中...',
  fullScreen = false,
  zIndex = 1000,
  size = 'default',
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />

  if (fullScreen) {
    return (
      <Modal
        title={null}
        open={visible}
        footer={null}
        closable={false}
        zIndex={zIndex}
        centered
        bodyStyle={{
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
        }}
        maskStyle={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="flex flex-col items-center">
          {
            size === 'small' ? (
              <Spin indicator={antIcon} size="small" />
            ) : size === 'large' ? (
              <Spin indicator={
                <LoadingOutlined style={{ fontSize: 36 }} spin />
              } />
            ) : (
              <Spin indicator={antIcon} />
            )
          }
          {message && (
            <div className="mt-3 text-gray-700 font-medium">
              {message}
            </div>
          )}
        </div>
      </Modal>
    )
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
      style={{ zIndex }}
    >
      <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        {size === 'small' ? (
          <Spin indicator={antIcon} size="small" />
        ) : size === 'large' ? (
          <Spin indicator={
            <LoadingOutlined style={{ fontSize: 36 }} spin />
          } />
        ) : (
          <Spin indicator={antIcon} />
        )}
        {message && (
          <div className="mt-3 text-gray-700 font-medium">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

// 创建一个便捷的Hook来管理加载状态
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = React.useState(initialState)
  const [message, setMessage] = React.useState('加载中...')

  const showLoading = (msg = '加载中...') => {
    setMessage(msg)
    setLoading(true)
  }

  const hideLoading = () => {
    setLoading(false)
  }

  // 自动管理异步操作的加载状态
  const withLoading = async (
    asyncFunc: Promise<any> | (() => Promise<any>),
    msg = '加载中...'
  ) => {
    showLoading(msg)
    try {
      const result = typeof asyncFunc === 'function' ? await asyncFunc() : await asyncFunc
      return result
    } finally {
      hideLoading()
    }
  }

  return {
    loading,
    message,
    showLoading,
    hideLoading,
    withLoading,
    LoadingComponent: (
      props: Omit<LoadingOverlayProps, 'visible' | 'message'>
    ) => (
      <LoadingOverlay visible={loading} message={message} {...props} />
    ),
  }
}

export default LoadingOverlay
