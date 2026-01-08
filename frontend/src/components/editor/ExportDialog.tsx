import { useState, useEffect } from 'react'
import { Modal, Radio, Checkbox, Button, Progress } from 'antd'
import type { RadioChangeEvent } from 'antd'

interface ExportDialogProps {
  visible: boolean
  onCancel: () => void
  onExport: (format: 'png' | 'pdf' | 'gif', pages: number[]) => void
  pageCount: number
}

export default function ExportDialog({
  visible,
  onCancel,
  onExport,
  pageCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'pdf' | 'gif'>('png')
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (visible) {
      // 默认全选所有页面
      setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1))
      // ⭐ 核心修复：重置导出状态，确保每次打开对话框时按钮可用
      setExporting(false)
      setProgress(0)
    }
  }, [visible, pageCount])

  const handleFormatChange = (e: RadioChangeEvent) => {
    setFormat(e.target.value)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1))
    } else {
      setSelectedPages([])
    }
  }

  const handlePageToggle = (page: number, checked: boolean) => {
    if (checked) {
      setSelectedPages([...selectedPages, page])
    } else {
      setSelectedPages(selectedPages.filter((p) => p !== page))
    }
  }

  const handleExport = () => {
    if (selectedPages.length === 0) {
      return
    }
    
    // 防止重复调用
    if (exporting) {
      return
    }
    
    setExporting(true)
    setProgress(0)

    // 保存导出参数，避免在异步操作中丢失
    const exportFormat = format
    const exportPages = [...selectedPages]
    
    // 标记是否已经调用过导出，防止重复调用
    let hasExported = false

    // 模拟导出进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          
          // 确保只调用一次导出
          if (!hasExported) {
            hasExported = true
            // ⭐ 核心修复：先调用导出，然后重置状态，不关闭对话框，让用户可以继续导出
            onExport(exportFormat, exportPages)
            
            // 延迟重置状态，确保导出操作完成
            setTimeout(() => {
              setExporting(false)
              setProgress(0)
            }, 500)
          }
          
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <Modal
      title="导出作品"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={exporting}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          onClick={handleExport}
          disabled={selectedPages.length === 0 || exporting}
        >
          开始导出
        </Button>,
      ]}
      width={600}
    >
      <div className="space-y-6">
        {/* 导出格式 */}
        <div>
          <div className="mb-2 font-medium">导出格式：</div>
          <Radio.Group value={format} onChange={handleFormatChange}>
            <Radio value="png">PNG</Radio>
            <Radio value="pdf">PDF</Radio>
            <Radio value="gif">GIF</Radio>
          </Radio.Group>
        </div>

        {/* 页面选择 */}
        <div>
          <div className="mb-2 font-medium">画板页面选择：</div>
          <div className="border border-border rounded-md p-4 bg-background-gray max-h-64 overflow-y-auto">
            <Checkbox
              checked={selectedPages.length === pageCount}
              indeterminate={
                selectedPages.length > 0 && selectedPages.length < pageCount
              }
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="mb-2"
            >
              全选
            </Checkbox>
            <div className="space-y-2">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                (page) => (
                  <div key={page} className="flex items-center">
                    <Checkbox
                      checked={selectedPages.includes(page)}
                      onChange={(e) =>
                        handlePageToggle(page, e.target.checked)
                      }
                    >
                      画板 {page}
                    </Checkbox>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 导出进度 */}
        {exporting && (
          <div>
            <div className="mb-2">导出进度：</div>
            <Progress percent={progress} />
          </div>
        )}
      </div>
    </Modal>
  )
}


