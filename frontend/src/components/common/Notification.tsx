import React from 'react'
import { message, Modal, notification } from 'antd'
import { ExclamationCircleOutlined, CheckCircleOutlined, InfoCircleOutlined, CloseOutlined } from '@ant-design/icons'

// 统一的消息通知工具类
export const NotificationUtil = {
  // 成功消息
  success(content: string, duration = 2.5, onClose?: () => void) {
    return message.success({
      content,
      duration,
      onClose,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    })
  },

  // 错误消息
  error(content: string, duration = 2.5, onClose?: () => void) {
    return message.error({
      content,
      duration,
      onClose,
      icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
    })
  },

  // 警告消息
  warning(content: string, duration = 2.5, onClose?: () => void) {
    return message.warning({
      content,
      duration,
      onClose,
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    })
  },

  // 信息消息
  info(content: string, duration = 2.5, onClose?: () => void) {
    return message.info({
      content,
      duration,
      onClose,
      icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
    })
  },

  // 加载中消息
  loading(content: string, duration = 0, onClose?: () => void) {
    return message.loading({
      content,
      duration,
      onClose,
    })
  },

  // 关闭所有消息
  destroy() {
    message.destroy()
  },

  // 弹出式通知（右上角）
  notification: {
    success({
      message = '成功',
      description,
      duration = 4.5,
      onClose,
    }: {
      message?: string
      description: string
      duration?: number
      onClose?: () => void
    }) {
      return notification.success({
        message,
        description,
        duration,
        onClose,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      })
    },

    error({
      message = '错误',
      description,
      duration = 4.5,
      onClose,
    }: {
      message?: string
      description: string
      duration?: number
      onClose?: () => void
    }) {
      return notification.error({
        message,
        description,
        duration,
        onClose,
        icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
      })
    },

    warning({
      message = '警告',
      description,
      duration = 4.5,
      onClose,
    }: {
      message?: string
      description: string
      duration?: number
      onClose?: () => void
    }) {
      return notification.warning({
        message,
        description,
        duration,
        onClose,
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      })
    },

    info({
      message = '信息',
      description,
      duration = 4.5,
      onClose,
    }: {
      message?: string
      description: string
      duration?: number
      onClose?: () => void
    }) {
      return notification.info({
        message,
        description,
        duration,
        onClose,
        icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      })
    },
  },

  // 确认对话框
  confirm({
    title,
    content,
    onOk,
    onCancel,
    okText = '确定',
    cancelText = '取消',
    okType = 'primary',
    ...rest
  }: {
    title: string
    content: string | React.ReactNode
    onOk?: () => void
    onCancel?: () => void
    okText?: string
    cancelText?: string
    okType?: 'primary' | 'default' | 'danger'
  }) {
    return Modal.confirm({
      title,
      content,
      onOk,
      onCancel,
      okText,
      cancelText,
      okType,
      icon: <ExclamationCircleOutlined />,
      ...rest,
    })
  },

  // 成功对话框
  successModal({
    title = '操作成功',
    content,
    onOk,
    okText = '确定',
    ...rest
  }: {
    title?: string
    content: string | React.ReactNode
    onOk?: () => void
    okText?: string
  }) {
    return Modal.success({
      title,
      content,
      onOk,
      okText,
      ...rest,
    })
  },

  // 错误对话框
  errorModal({
    title = '操作失败',
    content,
    onOk,
    okText = '确定',
    ...rest
  }: {
    title?: string
    content: string | React.ReactNode
    onOk?: () => void
    okText?: string
  }) {
    return Modal.error({
      title,
      content,
      onOk,
      okText,
      ...rest,
    })
  },

  // 警告对话框
  warningModal({
    title = '警告',
    content,
    onOk,
    onCancel,
    okText = '确定',
    cancelText = '取消',
    ...rest
  }: {
    title?: string
    content: string | React.ReactNode
    onOk?: () => void
    onCancel?: () => void
    okText?: string
    cancelText?: string
  }) {
    return Modal.warning({
      title,
      content,
      onOk,
      onCancel,
      okText,
      cancelText,
      ...rest,
    })
  },

  // 信息对话框
  infoModal({
    title = '提示',
    content,
    onOk,
    okText = '确定',
    ...rest
  }: {
    title?: string
    content: string | React.ReactNode
    onOk?: () => void
    okText?: string
  }) {
    return Modal.info({
      title,
      content,
      onOk,
      okText,
      ...rest,
    })
  },
}

// 自定义Hook封装
interface UseNotificationReturn {
  success: typeof NotificationUtil.success
  error: typeof NotificationUtil.error
  warning: typeof NotificationUtil.warning
  info: typeof NotificationUtil.info
  loading: typeof NotificationUtil.loading
  confirm: typeof NotificationUtil.confirm
  notification: typeof NotificationUtil.notification
  successModal: typeof NotificationUtil.successModal
  errorModal: typeof NotificationUtil.errorModal
  warningModal: typeof NotificationUtil.warningModal
  infoModal: typeof NotificationUtil.infoModal
}

export const useNotification = (): UseNotificationReturn => {
  return {
    success: NotificationUtil.success,
    error: NotificationUtil.error,
    warning: NotificationUtil.warning,
    info: NotificationUtil.info,
    loading: NotificationUtil.loading,
    confirm: NotificationUtil.confirm,
    notification: NotificationUtil.notification,
    successModal: NotificationUtil.successModal,
    errorModal: NotificationUtil.errorModal,
    warningModal: NotificationUtil.warningModal,
    infoModal: NotificationUtil.infoModal,
  }
}

export default NotificationUtil
