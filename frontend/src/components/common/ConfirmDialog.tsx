import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { Modal, Button, ModalProps } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface ConfirmDialogProps extends Omit<ModalProps, 'visible' | 'type' | 'footer'> {
  title: string
  onConfirm: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  confirmType?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  icon?: React.ReactNode
}

// 定义组件暴露给外部的方法类型
interface ConfirmDialogRef {
  showModal: () => void
  hideModal: () => void
}

// 直接使用forwardRef创建组件
const ConfirmDialog = forwardRef<ConfirmDialogRef, ConfirmDialogProps>(({
  title,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  confirmType = 'primary',
  icon,
  ...props
}, ref) => {
  const [visible, setVisible] = useState(false)

  const showModal = () => {
    setVisible(true)
  }

  const handleCancel = () => {
    setVisible(false)
    if (onCancel) {
      onCancel()
    }
  }

  const handleConfirm = () => {
    onConfirm()
    setVisible(false)
  }

  // 将组件函数暴露出来，以便父组件可以控制显示
  useImperativeHandle(ref, () => ({
    showModal,
    hideModal: handleCancel,
  }))

  const footer = (
    <>
      <Button onClick={handleCancel}>{cancelText}</Button>
      <Button type={confirmType} onClick={handleConfirm}>
        {confirmText}
      </Button>
    </>
  )

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      footer={footer}
      {...props}
    >
      {icon || <ExclamationCircleOutlined className="text-warning" />}
      <div className="mt-2">{props.children}</div>
    </Modal>
  )
})

// 设置组件的displayName
ConfirmDialog.displayName = 'ConfirmDialog'

export default ConfirmDialog
