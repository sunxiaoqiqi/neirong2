import React from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Upload, Checkbox, Radio } from 'antd'
import type { FormItemProps } from 'antd'

const { TextArea } = Input
const { Option } = Select
const { RangePicker } = DatePicker

interface ValidatorProps {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  message?: string
  value?: any
  validator?: (rule: any, value: any) => Promise<void> | void
}

export const createValidators = (validators: ValidatorProps[]) => {
  return validators.map(({ type, message, value, validator }) => {
    switch (type) {
      case 'required':
        return { required: true, message: message || '此项为必填项' }
      case 'minLength':
        return {
          min: value,
          message: message || `最少输入${value}个字符`,
        }
      case 'maxLength':
        return {
          max: value,
          message: message || `最多输入${value}个字符`,
        }
      case 'pattern':
        return {
          pattern: value,
          message: message || '输入格式不正确',
        }
      case 'custom':
        return { validator }
      default:
        return {}
    }
  })
}

interface ValidatedFormItemProps extends Omit<FormItemProps, 'rules'> {
  name: string[] | string
  label: string
  placeholder?: string
  rules?: ValidatorProps[]
  options?: { label: string; value: any }[]
  required?: boolean
  fieldType?: 'input' | 'textarea' | 'number' | 'select' | 'date' | 'daterange' | 'upload' | 'checkbox' | 'radio'
  width?: string | number
}

// 通用带校验的表单项组件
export const ValidatedFormItem: React.FC<ValidatedFormItemProps> = ({
  name,
  label,
  placeholder,
  rules = [],
  options,
  required = false,
  width,
  children,
  ...props
}) => {
  // 如果required为true，则添加必填规则
  const finalRules = React.useMemo(() => {
    const rulesArray = [...rules]
    if (required && !rules.some(r => r.type === 'required')) {
      rulesArray.unshift({ type: 'required' })
    }
    return createValidators(rulesArray)
  }, [rules, required])

  // 根据组件类型渲染不同的输入控件
  const renderControl = children || (
    <>
      {(() => {
        const inputProps = {
          placeholder,
          style: { width },
        }

        switch (props.fieldType) {
          case 'textarea':
            return <TextArea rows={4} {...inputProps} />
          case 'number':
            return <InputNumber {...inputProps} />
          case 'select':
            return (
              <Select {...inputProps}>
                {options?.map((option) => {
                  // 确保option.value不为null或undefined，避免警告
                  const safeValue = option.value ?? '';
                  return (
                    <Option key={safeValue} value={safeValue}>
                      {option.label}
                    </Option>
                  );
                })}</Select>
            )
          case 'date':
            return <DatePicker style={{ width }} placeholder={placeholder} />
          case 'daterange':
            const safePlaceholder = placeholder || ''
            return <RangePicker style={{ width }} placeholder={[safePlaceholder, safePlaceholder]} />
          case 'upload':
            return (
              <Upload.Dragger {...(props as any)}>
                <p className="ant-upload-drag-icon">
                  <i className="anticon anticon-inbox"></i>
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              </Upload.Dragger>
            )
          case 'checkbox':
            return (
              <Checkbox.Group>
                {options?.map((option) => {
                  // 确保option.value不为null或undefined，避免警告
                  const safeValue = option.value ?? '';
                  return (
                    <Checkbox key={safeValue} value={safeValue}>
                      {option.label}
                    </Checkbox>
                  );
                })}</Checkbox.Group>
            )
          case 'radio':
            return (
              <Radio.Group style={{ width: '100%' }}>
                {options?.map((option) => {
                  // 确保option.value不为null或undefined，避免警告
                  const safeValue = option.value ?? '';
                  return (
                    <Radio key={safeValue} value={safeValue}>
                      {option.label}
                    </Radio>
                  );
                })}</Radio.Group>
            )
          default:
            return <Input {...inputProps} />
        }
      })()}
    </>
  )

  return (
    <Form.Item
      label={label}
      name={name}
      rules={finalRules}
      {...props}
    >
      {renderControl}
    </Form.Item>
  )
}

// 表单校验辅助类
export const formValidators = {
  // 邮箱校验
  email: {
    type: 'pattern' as const,
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '请输入有效的邮箱地址',
  },
  // 手机号校验
  phone: {
    type: 'pattern' as const,
    value: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号码',
  },
  // URL校验
  url: {
    type: 'pattern' as const,
    value: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    message: '请输入有效的URL地址',
  },
  // 密码强度校验（至少8位，包含字母和数字）
  password: {
    type: 'pattern' as const,
    value: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    message: '密码至少8位，必须包含字母和数字',
  },
}

export default ValidatedFormItem
