import { useState } from 'react'
import { Dropdown, Modal, Button, message, TreeSelect } from 'antd'
import {
  FileOutlined,
  CopyOutlined,
  SaveOutlined,
  FolderOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

interface FileMenuProps {
  onNewFile: () => void
  onDuplicate: () => void
  onSave: () => void
  onSaveTo: (folderId?: number) => void
  onSaveAsTemplate: () => void
  onToggleRuler: () => void
  rulerVisible: boolean
  hasUnsavedChanges: boolean
}

export default function FileMenu({
  onNewFile,
  onDuplicate,
  onSave,
  onSaveTo,
  onSaveAsTemplate,
  onToggleRuler,
  rulerVisible,
  hasUnsavedChanges,
}: FileMenuProps) {
  const [saveToModalVisible, setSaveToModalVisible] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null)

  const handleNewFile = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: '提示',
        content: '当前作品有未保存的修改，是否保存？',
        onOk: () => {
          onSave()
          onNewFile()
        },
        onCancel: () => {
          onNewFile()
        },
      })
    } else {
      onNewFile()
    }
  }

  const handleSaveTo = () => {
    setSaveToModalVisible(true)
  }

  const handleSaveToConfirm = () => {
    onSaveTo(selectedFolder || undefined)
    setSaveToModalVisible(false)
    message.success('保存成功')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'new',
      label: '新建文件',
      icon: <FileOutlined />,
      onClick: handleNewFile,
    },
    {
      key: 'duplicate',
      label: '创建副本',
      icon: <CopyOutlined />,
      onClick: onDuplicate,
    },
    {
      type: 'divider',
    },
    {
      key: 'save',
      label: '保存',
      icon: <SaveOutlined />,
      onClick: onSave,
    },
    {
      key: 'saveTo',
      label: '保存至',
      icon: <FolderOutlined />,
      onClick: handleSaveTo,
    },
    {
      key: 'saveAsTemplate',
      label: '保存为模板',
      icon: <FolderOutlined />,
      onClick: onSaveAsTemplate,
    },
    {
      type: 'divider',
    },
    {
      key: 'ruler',
      label: rulerVisible ? '隐藏标尺与参考线' : '显示标尺与参考线',
      icon: <SettingOutlined />,
      onClick: onToggleRuler,
    },
  ]

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button>文件</Button>
      </Dropdown>

      <Modal
        title="保存至文件夹"
        open={saveToModalVisible}
        onOk={handleSaveToConfirm}
        onCancel={() => setSaveToModalVisible(false)}
      >
        <div className="mb-4">
          <TreeSelect
            style={{ width: '100%' }}
            placeholder="选择文件夹"
            treeDefaultExpandAll
            value={selectedFolder}
            onChange={(value) => setSelectedFolder(value as number)}
            treeData={[]}
          />
        </div>
        <Button type="dashed" block>
          新建文件夹
        </Button>
      </Modal>
    </>
  )
}


