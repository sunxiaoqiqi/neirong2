import { Button } from 'antd'
import { UndoOutlined, RedoOutlined } from '@ant-design/icons'

interface HistoryControlsProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HistoryControlsProps) {
  return (
    <>
      <Button
        icon={<UndoOutlined />}
        disabled={!canUndo}
        onClick={onUndo}
        title="后退"
      >
        后退
      </Button>
      <Button
        icon={<RedoOutlined />}
        disabled={!canRedo}
        onClick={onRedo}
        title="前进"
      >
        前进
      </Button>
    </>
  )
}


