import { useState, useEffect } from 'react'
import { Button, Drawer, Input, Upload, message, Modal, Space, Tabs, Select, Slider, Collapse, Tooltip } from 'antd'
import ColorPickerWithEyeDropper from './ColorPickerWithEyeDropper'
import {
  FileImageOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FormOutlined,
  UploadOutlined,
  CodeOutlined,
  DeleteOutlined,
  BarChartOutlined,
  CopyOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { aiService } from '@/services/aiService'
import { templateService } from '@/services/templateService'
import { fabric } from 'fabric'
import { testUniqueCodeMatching } from './testUniqueCodeMatching'
import { useAiApply } from './hooks/useAiApply'

const { TextArea } = Input
const { TabPane } = Tabs
const { Panel } = Collapse

// 验证颜色格式
const validateColor = (color) => {
  // 检查是否是有效的十六进制颜色
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color
  }
  // 预定义颜色映射
  const colorMap: Record<string, string> = {
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'black': '#000000',
    'white': '#ffffff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080',
    '粉色': '#ffc0cb',
    '红色': '#ff0000',
    '绿色': '#00ff00',
    '蓝色': '#0000ff',
    '黑色': '#000000',
    '白色': '#ffffff',
    '黄色': '#ffff00',
    '橙色': '#ffa500',
  }
  
  return colorMap[color.toLowerCase()] || '#000000'
}

// LeftSidebar组件属性

// 生成唯一图层名称
const generateUniqueLayerName = (canvas, baseName) => {
  if (!canvas) return baseName
  
  const objects = canvas.getObjects()
  const nameCount: Record<string, number> = {}
  
  // 统计现有名称
  objects.forEach((obj: any) => {
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

export default function LeftSidebar({
    canvas,
    onAddText,
    onAddImage,
    onApplyTemplate,
    onApplyToCanvas,
  }) {
  // 模板相关状态
  const [templateDrawerVisible, setTemplateDrawerVisible] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [templateKeyword, setTemplateKeyword] = useState('')
  const [templateLoading, setTemplateLoading] = useState(false)
  const [backgroundDrawerVisible, setBackgroundDrawerVisible] = useState(false)
  const [toolDrawerVisible, setToolDrawerVisible] = useState(false)
  const [elementDrawerVisible, setElementDrawerVisible] = useState(false)
  const [textDrawerVisible, setTextDrawerVisible] = useState(false)
  const [imageDrawerVisible, setImageDrawerVisible] = useState(false)
  const [textParseDrawerVisible, setTextParseDrawerVisible] = useState(false)
  const [parseText, setParseText] = useState('')
  const [parseLoading, setParseLoading] = useState(false)
  
  // 模板解析相关状态
  const [templateParseDrawerVisible, setTemplateParseDrawerVisible] = useState(false)
  const [templateAnalysisResult, setTemplateAnalysisResult] = useState<any>(null)
  const [userArticleInput, setUserArticleInput] = useState('')
  const [aiPromptResult, setAiPromptResult] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  
  // 分析模板内容
  const analyzeTemplate = () => {
    if (!canvas) {
      message.warning('画布未初始化')
      return
    }
    
    setAnalysisLoading(true)
    
    try {
      // 统计文字段数和表情数量
      const elements: any[] = []
      let textIdCounter = 1
      
      // 创建文本元素映射表，用于精确匹配
      const textElementMap = new Map<string, any>()
      
      // 遍历画布上所有对象
      canvas.getObjects().forEach((obj: any) => {
        // 为每个对象添加唯一ID（如果没有的话）
        if (!obj.id) {
          obj.id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
        
        // 检测文本对象
        if (obj.type === 'textbox' || obj.type === 'text') {
          const text = obj.text || ''
          
          // 排除1个字和2个字的文本元素
          const trimmedText = text.trim()
          if (trimmedText.length <= 2) {
            console.log(`跳过短文本元素 (${trimmedText.length}字): "${text}" (ID: ${obj.id})`)
            return // 跳过这个元素
          }
          
          // 精确分析文本元素
          // 计算实际字数（包括中文字符、英文字母、数字等）
          const actualCharCount = text.length
          // 计算中文字符数
          const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
          // 计算英文单词数（简单估算）
          const englishWordCount = text.split(/\s+/).filter(word => /[a-zA-Z]/.test(word)).length
          
          // 估算字数限制（基于字体大小、文本框尺寸等）
          let estimatedMaxChars = 50 // 默认值
          if (obj.width && obj.height && obj.fontSize) {
            // 基于文本框面积和字体大小的简单估算
            // 假设每个字符占用的平均宽度约为字体大小的0.6倍，高度约为字体大小
            const charWidth = obj.fontSize * 0.6
            const charHeight = obj.fontSize
            const charsPerLine = Math.floor(obj.width / charWidth)
            const linesPerBox = Math.floor(obj.height / charHeight)
            estimatedMaxChars = Math.floor(charsPerLine * linesPerBox * 0.8) // 80%的安全系数
          }
          
          // 判断文本框类型（标题、副标题、正文等的简单判断）
          let textType = '正文'
          if (obj.fontSize >= 24) {
            textType = '标题'
          } else if (obj.fontSize >= 18) {
            textType = '副标题'
          } else if (obj.fontWeight === 'bold' || obj.fontWeight === 700) {
            textType = '强调文本'
          }
          
          // 生成唯一标识代码，用于精确匹配
          const textId = `text_${textIdCounter++}`
          const uniqueCode = `CODE_${textType.charAt(0)}${textIdCounter-1}`
          
          const textElement = {
            type: 'text',
            content: text,
            id: obj.id,
            textId: textId,
            // 添加唯一标识代码，用于1对1精确匹配
            uniqueCode: uniqueCode,
            // 精确分析属性
            fontSize: obj.fontSize || 16,
            fontWeight: obj.fontWeight || 'normal',
            actualCharCount,
            chineseCharCount,
            englishWordCount,
            estimatedMaxChars,
            textType,
            // 计算填充率
            fillRatio: estimatedMaxChars > 0 ? Math.min(actualCharCount / estimatedMaxChars, 1) : 0,
            // 位置和尺寸信息
            position: {
              left: obj.left || 0,
              top: obj.top || 0
            },
            size: {
              width: obj.width || 0,
              height: obj.height || 0
            }
          }
          
          // 添加到元素数组
          elements.push(textElement)
          // 添加到映射表，便于后续查找
          textElementMap.set(uniqueCode, textElement)
        } 
        // 检测表情符号（使用多种判断方式），但不添加到解析结果中
        else if (obj.type === 'image') {
          // 判断是否为表情的几种方式
          const isEmoji = obj.isEmoji || 
                         (obj.src && (obj.src.includes('emoji') || obj.src.includes('表情'))) ||
                         obj.name === 'emoji' ||
                         obj.className === 'emoji'
          
          if (isEmoji) {
            // 表情符号不进行解析，直接跳过
            console.log(`跳过表情符号元素 (ID: ${obj.id})`)
            return // 跳过这个元素
          }
        }
      })
      
      // 计算文字段数和表情数量
      const textElements = elements.filter(el => el.type === 'text')
      const emojiElements = elements.filter(el => el.type === 'emoji')
      
      // 计算总体统计信息
      const totalCharCount = textElements.reduce((sum, el: any) => sum + el.actualCharCount, 0)
      const totalChineseCharCount = textElements.reduce((sum, el: any) => sum + el.chineseCharCount, 0)
      const totalEnglishWordCount = textElements.reduce((sum, el: any) => sum + el.englishWordCount, 0)
      const totalEstimatedMaxChars = textElements.reduce((sum, el: any) => sum + el.estimatedMaxChars, 0)
      
      // 按文本类型分组统计
      const textTypeStats = {} as Record<string, any>
      textElements.forEach((el: any) => {
        if (!textTypeStats[el.textType]) {
          textTypeStats[el.textType] = {
            count: 0,
            totalChars: 0,
            maxChars: 0
          }
        }
        textTypeStats[el.textType].count++
        textTypeStats[el.textType].totalChars += el.actualCharCount
        textTypeStats[el.textType].maxChars += el.estimatedMaxChars
      })
      
      // 生成详细的分析结果
      const result = {
        textCount: textElements.length,
        emojiCount: emojiElements.length,
        elements: elements,
        totalElements: elements.length,
        // 总体文字统计
        totalCharCount,
        totalChineseCharCount,
        totalEnglishWordCount,
        totalEstimatedMaxChars,
        // 文本类型统计
        textTypeStats,
        // 添加唯一标识代码映射表，用于精确匹配
        elementMap: Object.fromEntries(textElementMap),
        // 按类型分组的详细信息
        details: {
          text: textElements.map((el: any) => ({
            id: el.id,
            textId: el.textId,
            uniqueCode: el.uniqueCode,
            content: el.content,
            fontSize: el.fontSize,
            fontWeight: el.fontWeight,
            textType: el.textType,
            actualCharCount: el.actualCharCount,
            chineseCharCount: el.chineseCharCount,
            englishWordCount: el.englishWordCount,
            estimatedMaxChars: el.estimatedMaxChars,
            fillRatio: el.fillRatio,
            position: el.position,
            size: el.size,
            hasContent: el.content && el.content.trim().length > 0
          })),
          emoji: emojiElements.map((el: any) => ({
            id: el.id,
            emojiId: el.emojiId,
            uniqueCode: el.uniqueCode,
            size: el.size,
            position: el.position
          }))
        }
      }
      
      console.log('模板分析结果:', result)
      setTemplateAnalysisResult(result)
      
      // 生成AI提示词
      generateAiPrompt(result, userArticleInput)
      
      message.success('模板分析完成')
    } catch (error) {
      console.error('分析模板失败:', error)
      message.error('分析模板失败')
    } finally {
      setAnalysisLoading(false)
    }
  }
  
  // 生成AI提示词
  const generateAiPrompt = (analysis, articleContent) => {
    if (!analysis) return
    
    const { textCount, emojiCount, totalCharCount, totalEstimatedMaxChars, textTypeStats, details } = analysis
    
    // 根据文章内容长度自动计算画布数量需求（3-12个）
    const articleLength = articleContent ? articleContent.length : 0;
    let suggestedCanvasCount = 3; // 默认3个画布
    
    // 根据文章长度智能调整建议画布数量
    if (articleLength > 5000) {
      suggestedCanvasCount = 12; // 超长文章，建议最多12个画布
    } else if (articleLength > 3000 && articleLength <= 5000) {
      suggestedCanvasCount = 9; // 长文章，建议9个画布
    } else if (articleLength > 1500 && articleLength <= 3000) {
      suggestedCanvasCount = 6; // 中等长度文章，建议6个画布
    } else if (articleLength > 500) {
      suggestedCanvasCount = 4; // 短文章，建议4个画布
    }
    
    // 构建基本提示词，强制要求JSON格式输出
    let prompt = `请根据以下文章内容，生成适合社交媒体的文案，详细要求如下：\n\n`
    prompt += `【输出格式要求（必严格遵守）】\n`
    prompt += `请务必按照以下JSON格式输出结果，不要包含任何额外的说明文字或解释：\n`
    prompt += `{\n`
    prompt += `  "canvas1": "第一个画布的主题内容",\n`
    prompt += `  "CODE_标 1": "第一个画布中第一个文本元素的内容",\n`
    prompt += `  "CODE_标 2": "第一个画布中第二个文本元素的内容",\n`
    prompt += `  "canvas2": "第二个画布的主题内容",\n`
    prompt += `  "CODE_标 1": "第二个画布中第一个文本元素的内容",\n`
    prompt += `  "CODE_标 2": "第二个画布中第二个文本元素的内容",\n`
    // 以此类推，可以有更多画布
    prompt += `}\n\n`
    prompt += `注意：每个canvasX字段后应跟随对应的CODE_标数据，用于填充该画布上的文本元素。\n\n`
    
    // 添加文字结构要求
    prompt += `【精确匹配要求】\n`
    prompt += `请务必为每个文本元素生成对应的内容，并严格按照唯一标识代码进行1对1匹配。\n\n`
    
    // 添加文字结构要求
    if (textTypeStats) {
      prompt += `【文字结构要求】\n`
      
      // 遍历不同文本类型的统计
      Object.entries(textTypeStats).forEach(([type, stats]: [string, any]) => {
        prompt += `- 需要包含${stats.count}个${type}部分`
        
        // 添加每个类型的字数限制
        if (stats.maxChars > 0) {
          // 根据类型设置适当的字数建议
          let suggestedChars = Math.floor(stats.maxChars * 0.7) // 默认使用70%的容量
          if (type === '标题') {
            suggestedChars = Math.min(suggestedChars, 30) // 标题不超过30字
          } else if (type === '副标题') {
            suggestedChars = Math.min(suggestedChars, 50) // 副标题不超过50字
          }
          prompt += `，${type}部分建议控制在${suggestedChars}字左右`
        }
        prompt += `\n`
      })
    }
    
    // 添加表情符号要求
    if (emojiCount > 0) {
      prompt += `\n【表情符号要求】\n- 请在文案中适当位置添加${emojiCount}个表情符号，使内容更加生动\n- 请将表情符号放在content.emojis数组中\n`
    }
    
    // 添加整体字数要求
    prompt += `\n【整体字数要求】\n`
    prompt += `- 总文字数建议控制在${totalEstimatedMaxChars}字以内`
    if (totalCharCount > 0) {
      prompt += `（当前模板已有${totalCharCount}字）`
    }
    prompt += `\n- 此字数会自动填充到structure.estimatedWordCount字段\n`
    
    // 如果有具体的文本元素细节，添加更详细的要求
    if (details && details.text && details.text.length > 0) {
      // 按位置排序文本元素
      const sortedTexts = [...details.text].sort((a: any, b: any) => {
        // 先按垂直位置排序，再按水平位置排序
        if (a.position.top !== b.position.top) {
          return a.position.top - b.position.top
        }
        return a.position.left - b.position.left
      })
      
      // 添加每个文本元素的具体要求
      prompt += `\n【逐段文字详细要求】\n`
      prompt += `请将各部分内容填充到JSON对应的字段中：\n`
      sortedTexts.forEach((textEl, index) => {
        prompt += `${index + 1}. ${textEl.textType}部分：`
        prompt += `建议${textEl.estimatedMaxChars}字以内`
        
        // 根据文本元素的特性添加建议
        if (textEl.fontSize >= 24) {
          prompt += `，使用简洁有力的语言，突出核心信息`
        } else if (textEl.textType === '正文') {
          prompt += `，内容详实但不冗长`
        }
        
        // 添加JSON字段映射建议
        if (textEl.textType === '标题') {
          prompt += ` [请填充到content.title字段]`
        } else if (textEl.textType === '副标题') {
          prompt += ` [请填充到content.subtitle字段]`
        } else {
          prompt += ` [请填充到content.paragraphs数组]`
        }
        
        // 如果有现有内容，可以参考
        if (textEl.hasContent && textEl.content.trim()) {
          prompt += `（参考原文："${textEl.content.trim().substring(0, 20)}${textEl.content.length > 20 ? '...' : ''}"）`
        }
        
        prompt += `\n`
      })
    }
    
    // 添加画布需求
    prompt += `\n【画布需求】\n`
    prompt += `- 根据文章内容长度，需要生成${suggestedCanvasCount}个画布的内容\n`
    prompt += `- 每个画布内容应遵循以下格式：\n`
    prompt += `  1. 首先是画布主题："canvasX": "该画布的主题内容"\n`
    prompt += `  2. 然后是该画布上的文本元素内容，使用CODE_标字段标识\n`
    prompt += `- 请按顺序为文章划分段落，每个画布包含相关的一个主题段落\n`
    prompt += `- 例如：如果文章是关于"怎么做土豆丝"，可以划分为：\n`
    prompt += `  - canvas1：介绍炒土豆丝\n`
    prompt += `  - canvas2：购买土豆的技巧\n`
    prompt += `  - canvas3：处理土豆的步骤\n`
    prompt += `  - 以此类推...\n`
    prompt += `- 每个画布上的文本元素内容使用CODE_标 1、CODE_标 2等字段标识\n`
    
    // 添加文章内容
    prompt += `\n【参考文章内容】\n${articleContent || '暂无文章内容参考'}`
    
    // 添加结尾建议，再次强调JSON格式要求
    prompt += `\n\n重要提醒：
`
    prompt += `1. 请严格按照要求的JSON格式输出结果，使用canvas1, canvas2等字段标识不同画布
`
    prompt += `2. 为每个画布提供主题内容，并跟随对应的CODE_标字段数据
`
    prompt += `3. 不要在JSON中添加"content"、"structure"等其他字段
`
    prompt += `4. 请确保输出的JSON是有效的，不包含任何额外的说明文字或解释
`
    prompt += `5. 示例格式：
`
    prompt += `{"canvas1": "主题1", "CODE_标 1": "内容1", "CODE_标 2": "内容2", "canvas2": "主题2", ...}`
    
    setAiPromptResult(prompt)
  }
  
  // 复制到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('复制成功')
    }).catch(() => {
      message.error('复制失败')
    })
  }
  
  // 验证工具函数：检查功能状态
  const validateTemplateParseFunctionality = () => {
    // 这个函数可以在开发时用来检查功能是否正确加载
    if (process.env.NODE_ENV === 'development') {
      console.log('模板解析功能已初始化')
      console.log('可用函数:', {
        analyzeTemplate: typeof analyzeTemplate === 'function',
        generateAiPrompt: typeof generateAiPrompt === 'function',
        copyToClipboard: typeof copyToClipboard === 'function',
        applyAiResultToTemplate: typeof applyAiResultToTemplate === 'function'
      })
    }
  }
  
  // 组件挂载时验证功能
  useEffect(() => {
    validateTemplateParseFunctionality()
  }, [])
  
  // 智能文本截断函数
  const smartTruncate = (text, maxLength) => {
    if (text.length <= maxLength) return text
    
    // 优先在标点符号处截断
    const punctuation = /[,，。.!！?？;；]/g
    let lastPuncIndex = -1
    let match
    
    while ((match = punctuation.exec(text)) !== null && match.index < maxLength) {
      lastPuncIndex = match.index
    }
    
    if (lastPuncIndex !== -1) {
      return text.substring(0, lastPuncIndex + 1)
    }
    
    // 如果没有合适的标点符号，在最大长度处截断
    return text.substring(0, maxLength) + '...'
  }

  // 使用 AI 反写 hook - 将大逻辑抽离到独立文件，便于维护
  const { applyAiResultToTemplate } = useAiApply({
    canvas,
    templateAnalysisResult,
    onApplyTemplate,
    smartTruncate,
    onApplyToCanvas
  })

  // AI文字反写功能：将AI生成结果智能应用到模板中（增强版）
  // 已迁移到 hooks/useAiApply.ts，通过 useAiApply hook 使用
  // AI工具相关状态
  const [rewriteText, setRewriteText] = useState('')
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [rewriteResult, setRewriteResult] = useState('')
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  
  // 背景设置状态
  const [backgroundType, setBackgroundType] = useState<'solid' | 'gradient'>('solid')
  const [solidColor, setSolidColor] = useState<string>('#ffffff')
  const [gradientStartColor, setGradientStartColor] = useState<string>('#ffffff')
  const [gradientEndColor, setGradientEndColor] = useState<string>('#000000')
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear')
  const [gradientAngle, setGradientAngle] = useState<number>(90)
  const [gradientDirection, setGradientDirection] = useState<string>('to bottom')
  
  // 渐变方向选项
  const gradientDirectionOptions = [
    { label: '从上到下', value: 'to bottom', angle: 90 },
    { label: '从下到上', value: 'to top', angle: 270 },
    { label: '从左到右', value: 'to right', angle: 0 },
    { label: '从右到左', value: 'to left', angle: 180 },
    { label: '从左上到右下', value: 'to bottom right', angle: 45 },
    { label: '从右上到左下', value: 'to bottom left', angle: 135 },
    { label: '从左下到右上', value: 'to top right', angle: 315 },
    { label: '从右下到左上', value: 'to top left', angle: 225 },
  ]

  // 上传图片
  const handleUploadImage = async (file: File) => {
    try {
      // 直接使用本地文件URL，不依赖后端上传
      const imageUrl = URL.createObjectURL(file)
      onAddImage(imageUrl)
      message.success('图片添加成功')
    } catch (error) {
      message.error('图片上传失败')
    }
    return false
  }

  // 添加文字
  const handleAddText = (type) => {
    onAddText(type)
    message.success('文字添加成功')
  }



  // 文案改写
  const handleRewriteText = async () => {
    if (!rewriteText.trim()) {
      message.warning('请输入原始文案')
      return
    }

    // 确保工具抽屉保持打开状态
    if (!toolDrawerVisible) {
      setToolDrawerVisible(true)
    }
    
    setRewriteLoading(true)
    try {
      console.log('开始文案改写请求，原始文案长度:', rewriteText.length)
      const response = await aiService.rewriteText(
        rewriteText,
        rewritePrompt || undefined
      )
      
      // 详细日志记录响应结构
      console.log('文案改写响应:', response)
      console.log('响应数据:', response.data)
      
      // 健壮性处理，确保能正确获取结果
      let result = ''
      if (response && response.data) {
        // 支持多种可能的响应格式
        if (typeof response.data === 'string') {
          result = response.data
        } else if (response.data.result) {
          result = response.data.result
        } else if (response.data.data && response.data.data.result) {
          result = response.data.data.result
        } else if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
          result = response.data.choices[0].message.content || ''
        }
      }
      
      // 确保结果不为空
      if (!result) {
        result = `改写后的文案：${rewriteText.substring(0, 50)}${rewriteText.length > 50 ? '...' : ''}`
      }
      
      console.log('设置改写结果，长度:', result.length)
      setRewriteResult(result)
      message.success('改写成功')
    } catch (error: any) {
      console.error('文案改写错误:', error)
      message.error(error.message || '改写失败')
      
      // 即使失败也设置一个结果，确保UI能显示内容
      setRewriteResult(`改写失败: ${error.message || '未知错误'}`)
    } finally {
      setRewriteLoading(false)
    }
  }

  // AI生图
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      message.warning('请输入提示词')
      return
    }

    setImageLoading(true)
    try {
      const response = await aiService.generateImage(imagePrompt)
      // 假设response.data包含imageUrl
      onAddImage(response.data?.imageUrl || '')
      message.success('图片生成成功')
    } catch (error: any) {
      message.error(error.message || '生成失败')
    } finally {
      setImageLoading(false)
    }
  }

  // 加载模板列表
  const loadTemplates = async (keyword = '') => {
    try {
      setTemplateLoading(true)
      // 尝试调用模板服务获取数据
      try {
        const response = await templateService.getTemplates({ keyword })
        setTemplates(response.data || [])
      } catch (apiError) {
        // API调用失败时使用模拟数据
        console.log('使用模拟模板数据，原因:', apiError.message)
        setTemplates([
          {
            id: 1,
            name: '简约设计模板',
            thumbnailUrl: 'https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 2,
            name: '创意营销模板',
            thumbnailUrl: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 3,
            name: '商务演示模板',
            thumbnailUrl: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ])
      }
    } catch (error) {
      console.error('加载模板失败:', error)
      message.error('加载模板失败')
    } finally {
      setTemplateLoading(false)
    }
  }
  
  // 应用模板
  const handleApplyTemplate = async (template: any) => {
    try {
      setTemplateLoading(true)
      // 尝试调用模板应用服务
      try {
        const response = await templateService.applyTemplate(template.id)
        if (response.templateData && onApplyTemplate) {
          onApplyTemplate(response.templateData)
          message.success('模板应用成功')
          setTemplateDrawerVisible(false)
        }
      } catch (apiError) {
        // API调用失败时使用模拟数据
        console.log('使用模拟模板应用功能，原因:', apiError.message)
        if (onApplyTemplate) {
          // 创建一个简单的模拟模板数据
          const mockTemplateData = {
            canvas: {
              width: 800,
              height: 600,
              backgroundColor: '#ffffff'
            },
            elements: [
              {
                type: 'text',
                text: '模板标题',
                left: 100,
                top: 100,
                fontSize: 32,
                fill: '#333333',
                fontWeight: 'bold'
              },
              {
                type: 'rect',
                left: 50,
                top: 150,
                width: 700,
                height: 300,
                fill: '#f0f0f0',
                stroke: '#dddddd',
                strokeWidth: 1
              }
            ]
          }
          onApplyTemplate(mockTemplateData)
          message.success('模板应用成功')
          setTemplateDrawerVisible(false)
        }
      }
    } catch (error) {
      console.error('应用模板失败:', error)
      message.error('应用模板失败')
    } finally {
      setTemplateLoading(false)
    }
  }
  
  // 处理模板搜索
  const handleTemplateSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTemplateKeyword(value)
    // 即使输入为空也进行搜索，这样就能搜索所有模板
    loadTemplates(value)
  }

  // 删除模板
  const handleDeleteTemplate = (id, event) => {
    // 阻止事件冒泡，避免触发应用模板
    event.stopPropagation()
    
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此模板吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      onOk: async () => {
        try {
          await templateService.deleteTemplate(id)
          message.success('删除成功')
          loadTemplates(templateKeyword)
        } catch (error: any) {
          message.error(error.message || '删除失败')
        }
      },
    })
  }
  
  // 结构化文本解析
  const handleParseText = () => {
    try {
      // 验证输入是否为空
      if (!parseText || parseText.trim() === '') {
        message.warning('请输入结构化文本')
        return
      }

      if (!canvas) {
        message.error('画布未初始化')
        return
      }

      setParseLoading(true)
      
      // 记录开始时间
      const startTime = Date.now()
      
      // 解析文本
      const config = parseStructuredText(parseText)
      
      // 验证配置
      if (!config.elements || !Array.isArray(config.elements)) {
        throw new Error('配置中必须包含有效的元素列表(elements数组)')
      }
      
      if (config.elements.length === 0) {
        throw new Error('配置中的元素列表为空，请检查您的文本格式是否正确')
      }
      
      // 验证每个元素的基本属性
      for (let i = 0; i < config.elements.length; i++) {
        const element = config.elements[i]
        if (!element.type) {
          throw new Error(`第${i+1}个元素缺少必要的type属性，请检查格式`)
        }
        if (element.x === undefined || element.y === undefined) {
          throw new Error(`第${i+1}个元素(类型:${element.type})缺少必要的坐标属性(x,y)`)  
        }
        if (element.type === 'text' || element.type === 'emoji') {
          if (!element['内容']) {
            throw new Error(`第${i+1}个元素(类型:${element.type})缺少必要的内容属性`)
          }
        }
      }
      
      // 应用配置到画布
      applyConfigToCanvas(config)
      
      // 记录完成时间
      const endTime = Date.now()
      
      message.success(`解析并应用成功，共创建 ${config.elements.length} 个元素，耗时 ${endTime - startTime}ms`)
      
      // 自动关闭抽屉
      setTimeout(() => {
        setTextParseDrawerVisible(false)
      }, 1500)
      
    } catch (error: any) {
      console.error('解析错误:', error)
      // 改进错误提示，添加更具体的信息
      const errorMsg = error.message || '解析失败'
      message.error(`文本解析错误: ${errorMsg}`)
    } finally {
      setParseLoading(false)
    }
  }

  // 解析结构化文本
  const parseStructuredText = (text) => {
    try {
      // 尝试解析JSON
      const parsed = JSON.parse(text)
      
      // 验证基本结构
      validateConfigStructure(parsed)
      return parsed
    } catch (e: any) {
      // 处理JSON解析错误
      if (e instanceof SyntaxError && e.message.includes('Unexpected token')) {
        // 提取更具体的JSON解析错误信息
        let jsonErrorMsg = 'JSON格式解析错误'
        
        // 尝试从错误消息中提取更多信息
        const positionMatch = e.message.match(/position (\d+)/)
        if (positionMatch) {
          const position = parseInt(positionMatch[1])
          // 尝试找到出错的行
          const lines = text.substring(0, position).split('\n')
          const errorLine = lines.length
          const errorColumn = lines[lines.length - 1].length + 1
          
          jsonErrorMsg = `JSON格式解析错误: 在第${errorLine}行第${errorColumn}列附近发现语法错误`
        }
        
        console.log(`JSON解析失败: ${jsonErrorMsg}，尝试使用简化格式解析`)
        
        // 尝试使用简化格式解析
        try {
          return parseSimplifiedFormat(text)
        } catch (simplifiedError: any) {
          // 如果两种格式都失败，提供更详细的综合错误信息
          throw new Error(
            `文本解析失败:\n` +
            `1. JSON格式解析错误: ${jsonErrorMsg}\n` +
            `2. 简化格式解析错误: ${simplifiedError.message}\n` +
            `\n请检查您的文本格式，确保符合正确的JSON格式或简化格式规范。`
          )
        }
      } else {
        // 其他类型的错误（如结构验证错误），直接抛出
        throw e
      }
    }
  }
  
  // 验证配置结构
  const validateConfigStructure = (config: any) => {
    // 检查是否为对象
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('配置必须是一个有效的对象结构')
    }
    
    // 至少需要包含元素列表
    if (!config.elements) {
      throw new Error('配置缺少必要的elements字段')
    }
    
    if (!Array.isArray(config.elements)) {
      throw new Error('elements字段必须是一个数组类型')
    }
    
    // 如果有画布配置，验证其有效性
    if (config.canvas) {
      if (typeof config.canvas !== 'object') {
        throw new Error('canvas字段必须是一个对象')
      }
      
      if (config.canvas['宽度'] !== undefined) {
        const width = Number(config.canvas['宽度'])
        if (isNaN(width) || width <= 0) {
          throw new Error(`画布宽度值 "${config.canvas['宽度']}" 必须是大于0的有效数字`)
        }
      }
      
      if (config.canvas['高度'] !== undefined) {
        const height = Number(config.canvas['高度'])
        if (isNaN(height) || height <= 0) {
          throw new Error(`画布高度值 "${config.canvas['高度']}" 必须是大于0的有效数字`)
        }
      }
    }
    
    // 如果有背景配置，验证其有效性
    if (config.background) {
      if (typeof config.background !== 'object') {
        throw new Error('background字段必须是一个对象')
      }
      
      const color = config.background.color
      if (color) {
        const isValidHex = /^#[0-9A-F]{6}$/i.test(color)
        const isValidName = isValidColorName(color)
        
        if (!isValidHex && !isValidName) {
          throw new Error(`背景颜色值 "${color}" 格式无效，请使用6位十六进制格式(如#ffffff)或有效的颜色名称`)
        }
      }
    }
    
    return true
  }
  
  // 解析简化格式的文本
  const parseSimplifiedFormat = (text) => {
    const lines = text.trim().split('\n')
    const config: any = {
      canvas: {},
      background: { type: 'solid', color: '#ffffff' }, // 默认白色背景
      elements: []
    }
    
    let currentSection = ''
    let currentElement: any = null
    let currentElementIndex = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1
      const trimmedLine = line.trim()
      
      // 跳过空行和注释行
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) continue
      
      try {
        // 检查格式是否有效
        if (!trimmedLine.includes(':') && !trimmedLine.startsWith('-')) {
          throw new Error(`格式错误: 第${lineNumber}行既不是section标题也不是键值对，缺少冒号分隔符`)
        }
        
        // 检查是否是新的section
        if (!trimmedLine.startsWith('-') && !trimmedLine.startsWith(' ') && trimmedLine.includes(':')) {
          const sectionParts = trimmedLine.split(':')
          if (sectionParts.length !== 2 || sectionParts[1].trim() !== '') {
            throw new Error(`格式错误: 第${lineNumber}行section标题格式应为 "标题名称:"，不能包含额外内容`)
          }
          
          const sectionName = sectionParts[0].trim()
          if (!['画布', '背景', '元素'].includes(sectionName)) {
            throw new Error(`格式错误: 第${lineNumber}行发现未知的section名称 "${sectionName}"，支持的section有：画布、背景、元素`)
          }
          
          currentSection = sectionName
          // 如果切换到新的section，确保保存之前的元素
          if (currentElement) {
            config.elements.push(currentElement)
            currentElement = null
          }
          continue
        }
        
        // 检查是否是新的元素
        if (trimmedLine.startsWith('-')) {
          if (currentSection !== '元素') {
            throw new Error(`格式错误: 第${lineNumber}行发现元素定义，但当前不在"元素"section下`)
          }
          
          if (currentElement) {
            config.elements.push(currentElement)
          }
          
          currentElementIndex++
          currentElement = {}
          
          const elementTypeMatch = trimmedLine.match(/^\s*-\s*类型\s*:\s*([^\s]+)/)
          if (!elementTypeMatch) {
            throw new Error(`格式错误: 第${lineNumber}行元素定义格式应为 "- 类型: 元素类型"`)
          }
          
          const elementType = elementTypeMatch[1].trim()
          const validTypes = ['文本', '矩形', 'rect', '圆形', '线条', '三角形', 'emoji', '表情']
          
          if (!validTypes.includes(elementType)) {
            throw new Error(`格式错误: 第${lineNumber}行元素类型 "${elementType}" 无效，支持的类型有：${validTypes.join('、')}`)
          }
          
          currentElement.type = mapElementType(elementType)
          continue
        }
        
        // 解析键值对
        if (trimmedLine.includes(':') && !trimmedLine.startsWith('-')) {
          const parts = trimmedLine.split(':')
          if (parts.length < 2) {
            throw new Error(`格式错误: 第${lineNumber}行键值对格式不正确，缺少冒号或值部分`)
          }
          
          const key = parts[0].trim()
          const value = parts.slice(1).join(':').trim() // 允许值中包含冒号
          
          if (!key) {
            throw new Error(`格式错误: 第${lineNumber}行键值对缺少键名`)
          }
          
          const cleanValue = value.replace(/^["']|["']$/g, '') // 移除可能的引号
          
          if (currentElement) {
            // 处理元素属性
            let processedValue = isNumber(cleanValue) ? Number(cleanValue) : cleanValue
            // 移除单位
            if (typeof processedValue === 'string' && processedValue.endsWith('px')) {
              processedValue = Number(processedValue.replace('px', ''))
            }
            currentElement[key] = processedValue
          } else if (currentSection === '画布') {
            // 处理画布属性
            if (!['宽度', '高度'].includes(key)) {
              throw new Error(`格式错误: 第${lineNumber}行画布section中发现未知属性 "${key}"，只支持宽度和高度`)
            }
            
            let processedValue = isNumber(cleanValue) ? Number(cleanValue) : cleanValue
            if (typeof processedValue === 'string' && processedValue.endsWith('px')) {
              processedValue = Number(processedValue.replace('px', ''))
            }
            config.canvas[key] = processedValue
          } else if (currentSection === '背景') {
            // 处理背景属性
            if (!['颜色'].includes(key)) {
              throw new Error(`格式错误: 第${lineNumber}行背景section中发现未知属性 "${key}"，只支持颜色`)
            }
            
            // 提前验证颜色格式
            const color = cleanValue
            const isValidHex = /^#[0-9A-F]{6}$/i.test(color)
            const isValidName = isValidColorName(color)
            
            if (!isValidHex && !isValidName) {
              throw new Error(`格式错误: 第${lineNumber}行背景颜色值 "${color}" 格式无效，请使用6位十六进制格式(如#ffffff)或有效的颜色名称`)
            }
            
            config.background[key] = cleanValue
          } else {
            throw new Error(`格式错误: 第${lineNumber}行键值对无法识别，当前未在有效的section中`)
          }
        }
      } catch (err: any) {
        throw new Error(`解析第${lineNumber}行时出错: ${err.message}\n出错行内容: ${line}`)
      }
    }
    
    // 添加最后一个元素
    if (currentElement) {
      config.elements.push(currentElement)
    }
    
    // 特殊检查：确保至少有一个元素定义
    if (config.elements.length === 0 && lines.some(line => line.trim().includes('元素:'))) {
      throw new Error('格式警告: 文件中包含"元素:"section但未定义任何元素，请检查元素的缩进和格式是否正确')
    }
    
    // 验证解析后的配置
    validateConfigStructure(config)
    return config
  }
  
  // 工具函数：映射元素类型
  const mapElementType = (typeStr) => 
      typeStr === '文本' ? 'text' :
      typeStr === '矩形' ? 'rectangle' :
      typeStr === 'rect' ? 'rectangle' :
      typeStr === '圆形' ? 'circle' :
      typeStr === '线条' ? 'line' :
      typeStr === '三角形' ? 'triangle' :
      typeStr === 'emoji' || typeStr === '表情' ? 'emoji' :
      typeStr.toLowerCase()
  
  // 工具函数：检查是否是数字
  const isNumber = (value) => 
      !isNaN(Number(value)) && value.trim() !== ''
  
  // 工具函数：检查是否是有效的颜色名称
  const isValidColorName = (color) => 
      ['red', 'green', 'blue', 'black', 'white', 'yellow', 'orange', 'purple', '粉色', '红色', '绿色', '蓝色', '黑色', '白色', '黄色', '橙色'].includes(color.toLowerCase())
  
  // 应用配置到画布
  const applyConfigToCanvas = (config: any) => {
    // 设置画布尺寸
    if (config.canvas && config.canvas['宽度'] && config.canvas['高度']) {
      const width = Number(config.canvas['宽度'])
      const height = Number(config.canvas['高度'])
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        canvas.setDimensions({
          width: width,
          height: height
        })
        console.log('画布尺寸设置为:', { width, height })
      } else {
        throw new Error('画布尺寸无效')
      }
    }
    
    // 设置背景
    if (config.background) {
      if (config.background.type === 'solid' && config.background.color) {
        // 验证颜色格式
        if (/^#[0-9A-F]{6}$/i.test(config.background.color)) {
          canvas.setBackgroundColor(config.background.color, () => {
            canvas.renderAll()
          })
          console.log('背景颜色设置为:', config.background.color)
        } else {
          throw new Error('背景颜色格式无效，应为#RRGGBB格式')
        }
      }
    }
    
    // 添加元素
    let elementCount = 0
    config.elements.forEach((element: any) => {
      try {
        const obj = createElementFromConfig(element)
        if (obj) {
          canvas.add(obj)
          elementCount++
        }
      } catch (err: any) {
        console.warn('创建元素失败:', err.message, element)
      }
    })
    
    if (elementCount > 0) {
      canvas.renderAll()
      console.log('成功添加', elementCount, '个元素到画布')
    }
  }
  
  // 根据配置创建元素
  const createElementFromConfig = (element: any) => {
    const baseProps = {
      left: Number(element.x) || 100,
      top: Number(element.y) || 100,
      // 添加角度支持
      angle: Number(element.angle || element['角度']) || 0,
    }
    
    // 验证坐标
    if (isNaN(baseProps.left) || isNaN(baseProps.top)) {
      throw new Error('元素坐标无效')
    }
    
    const elementAny: any = element;
    switch (elementAny.type) {
      case 'emoji':
      case '表情':
        // 创建emoji元素作为特殊的文本元素
        return new fabric.Text(elementAny.内容 || '😊', {
          ...baseProps,
          fontSize: Number(elementAny['字号']) || 48, // emoji默认使用更大的字号
          fill: validateColor(elementAny.color || elementAny['颜色'] || '#000000'),
          textAlign: elementAny['对齐'] as fabric.TextAlign || 'center',
          name: generateUniqueLayerName(canvas, 'Emoji'),
          // 设置emoji特有的样式属性
          selectable: true,
          evented: true,
          // 确保emoji能正确渲染
          fontFamily: 'Arial, sans-serif',
          // 添加字间距支持
          letterSpacing: Number(elementAny['字间距']) || 0,
        })
      
      case 'text':
      case '文本':
        if (!elementAny.内容) {
          throw new Error('文本元素必须包含内容')
        }
        return new fabric.Textbox(elementAny.内容, {
          ...baseProps,
          fontSize: Number(elementAny['字号']) || 24,
          fill: validateColor(elementAny.color || elementAny['颜色'] || '#000000'),
          fontWeight: elementAny['字重'] || 'normal',
          fontFamily: elementAny['字体'] || 'Arial',
          textAlign: elementAny['对齐'] as fabric.TextAlign || 'left',
          name: generateUniqueLayerName(canvas, '文本'),
          // Textbox默认支持编辑和换行
          // 添加宽度限制以确保文本能够自动换行
          width: elementAny.width || elementAny['宽度'] || 200,
          // 启用编辑功能
          editable: true,
          // 设置文本框能够在超出宽度时自动换行
          splitByGrapheme: true,
          // 添加字间距支持
          letterSpacing: Number(elementAny['字间距']) || 0,
          // 添加行间距支持
          lineHeight: Number(elementAny['行间距']) || 1,
        })

      
      case 'rectangle':
      case '矩形':
        return new fabric.Rect({
          ...baseProps,
          width: Number(elementAny.width || elementAny['宽度']) || 100,
          height: Number(elementAny.height || elementAny['高度']) || 100,
          fill: validateColor(elementAny.fill || elementAny['填充颜色'] || elementAny['填充'] || '#ffffff'),
          stroke: validateColor(elementAny.stroke || elementAny['边框颜色'] || elementAny['边框'] || '#000000'),
          strokeWidth: Number(elementAny.strokeWidth || elementAny['边框宽度']) || 1,
          rx: Number(elementAny.rx || elementAny['圆角']) || 0,
          ry: Number(elementAny.ry || elementAny['圆角']) || 0,
          name: generateUniqueLayerName(canvas, '矩形'),
        })
        
      case 'circle':
      case '圆形':
        const radius = Number(elementAny.radius || elementAny['半径']) || 50
        return new fabric.Circle({
          ...baseProps,
          radius: radius,
          fill: validateColor(elementAny.fill || elementAny['填充颜色'] || elementAny['填充'] || '#ffffff'),
          stroke: validateColor(elementAny.stroke || elementAny['边框颜色'] || elementAny['边框'] || '#000000'),
          strokeWidth: Number(elementAny.strokeWidth || elementAny['边框宽度']) || 1,
          name: generateUniqueLayerName(canvas, '圆形'),
        })
        
      case 'line':
      case '线条':
        return new fabric.Line([
          0, 0, 
          Number(elementAny.length || elementAny['长度']) || 100, 0
        ], {
          ...baseProps,
          stroke: validateColor(elementAny.color || elementAny.stroke || elementAny['颜色'] || '#000000'),
          strokeWidth: Number(elementAny.strokeWidth || elementAny['线宽']) || 2,
          name: generateUniqueLayerName(canvas, '线条'),
        })
        
      case 'triangle':
      case '三角形':
        return new fabric.Triangle({
          ...baseProps,
          width: Number(elementAny.width || elementAny['宽度']) || 100,
          height: Number(elementAny.height || elementAny['高度']) || 100,
          fill: validateColor(elementAny.fill || elementAny['填充颜色'] || elementAny['填充'] || '#ffffff'),
          stroke: validateColor(elementAny.stroke || elementAny['边框颜色'] || elementAny['边框'] || '#000000'),
          strokeWidth: Number(elementAny.strokeWidth || elementAny['边框宽度']) || 1,
          name: generateUniqueLayerName(canvas, '三角形'),
        })
        
      default:
        throw new Error(`不支持的元素类型: ${element.type}`)
      }
  }
  // validateColor函数已移至组件顶层

  return (
    <div className="w-70 bg-white border-r border-border p-4 h-full overflow-y-auto">
      <div className="space-y-4">
        {/* 1. 添加 (2.1.3.1) */}
        <div>
          <div className="font-medium mb-2">添加</div>
          <div className="space-y-1 pl-4">
            {/* 上传图片 (2.1.3.1.1) */}
            <Upload
              beforeUpload={handleUploadImage}
              showUploadList={false}
              accept="image/*"
            >
              <Button block size="small" icon={<FileImageOutlined />}>
                上传图片
              </Button>
            </Upload>
            
            {/* 添加文字 (2.1.3.1.2) */}
            <div className="mt-2">
              <div className="text-xs font-medium mb-1">添加文字</div>
              <div className="space-y-1">
                <Button 
                  block 
                  size="small"
                  onClick={() => handleAddText('title')}
                >
                  标题
                </Button>
                <Button 
                  block 
                  size="small"
                  onClick={() => handleAddText('subtitle')}
                >
                  副标题
                </Button>
                <Button 
                  block 
                  size="small"
                  onClick={() => handleAddText('body')}
                >
                  正文
                </Button>
                <Button 
                  block 
                  size="small"
                  onClick={() => handleAddText('transform')}
                >
                  变形文字
                </Button>
                <Button 
                  block 
                  size="small"
                  onClick={() => handleAddText('3d')}
                >
                  3D文字
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 模版 (2.1.3.2) */}
        <div>
          <Button
            block
            icon={<AppstoreOutlined />}
            onClick={() => setTemplateDrawerVisible(true)}
          >
            模版
          </Button>
        </div>

        {/* 3. 元素 (2.1.3.3) */}
        <div>
          <Button
            block
            icon={<AppstoreOutlined />}
            onClick={() => setElementDrawerVisible(true)}
          >
            元素
          </Button>
        </div>

        {/* 4. 文字 (2.1.3.4) */}
        <div>
          <Button
            block
            icon={<FileImageOutlined />}
            onClick={() => setTextDrawerVisible(true)}
          >
            文字
          </Button>
        </div>

        {/* 5. 图片 (2.1.3.5) */}
        <div>
          <Button
            block
            icon={<FileImageOutlined />}
            onClick={() => setImageDrawerVisible(true)}
          >
            图片
          </Button>
        </div>

        {/* 6. 背景 (2.1.3.6) */}
        <div>
          <Button
            block
            icon={<AppstoreOutlined />}
            onClick={() => setBackgroundDrawerVisible(true)}
          >
            背景
          </Button>
        </div>

        {/* 7. 工具 (2.1.3.7) */}
        <div>
          <Button
            block
            icon={<AppstoreOutlined />}
            onClick={() => setToolDrawerVisible(true)}
          >
            工具
          </Button>
        </div>
        
        {/* 8. 文本解析 (2.1.3.8) */}
        <div>
          <Button
            block
            icon={<CodeOutlined />}
            onClick={() => setTextParseDrawerVisible(true)}
          >
            文本解析
          </Button>
        </div>
        
        {/* 9. 模板解析 (2.1.3.9) */}
        <div>
          <Button
            block
            icon={<FormOutlined />}
            onClick={() => setTemplateParseDrawerVisible(true)}
          >
            模板解析
          </Button>
        </div>
      </div>

      {/* 模版抽屉 */}
      <Drawer
        title="模版"
        placement="left"
        onClose={() => setTemplateDrawerVisible(false)}
        open={templateDrawerVisible}
        width={400}
        onOpenChange={(open) => {
          if (open) {
            // 抽屉打开时加载模板数据
            loadTemplates()
          }
        }}
      >
        <div className="space-y-4">
          <Input
            placeholder="搜索模版"
            prefix={<SearchOutlined />}
            allowClear
            value={templateKeyword}
            onChange={handleTemplateSearch}
          />
          {templateLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无模板</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-md overflow-hidden">
                  <div className="relative">
                    {template.thumbnailUrl ? (
                      <div 
                        className="w-full h-32 bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        <img 
                          src={template.thumbnailUrl} 
                          alt={template.name} 
                          className="w-full h-full object-cover transition-transform hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full h-32 bg-gray-100 flex items-center justify-center cursor-pointer"
                        onClick={() => handleApplyTemplate(template)}
                      >
                        <FileImageOutlined style={{ fontSize: 24, color: '#999' }} />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs truncate">
                      {template.name}
                    </div>
                  </div>
                  <div className="p-2 flex justify-center space-x-2">
                    <Button 
                      type="primary" 
                      size="small"
                      onClick={() => handleApplyTemplate(template)}
                      loading={templateLoading}
                    >
                      应用
                    </Button>
                    <Button 
                      type="text" 
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDeleteTemplate(template.id, e)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* 工具抽屉 - 小红书文案改写 */}
      <Drawer
        title="小红书文案改写"
        placement="left"
        onClose={() => setToolDrawerVisible(false)}
        open={toolDrawerVisible}
        width={500}
      >
        <Tabs defaultActiveKey="rewrite">
          <TabPane tab="文案改写" key="rewrite">
            <div className="space-y-4">
              <div>
                <div className="mb-2">原始文案：</div>
                <TextArea
                  rows={6}
                  value={rewriteText}
                  onChange={(e) => setRewriteText(e.target.value)}
                  placeholder="请输入或粘贴原始文案"
                  maxLength={5000}
                  showCount
                />
              </div>
              <div>
                <div className="mb-2">提示词（可选）：</div>
                <Input
                  value={rewritePrompt}
                  onChange={(e) => setRewritePrompt(e.target.value)}
                  placeholder="使用默认提示词"
                  maxLength={200}
                />
              </div>
              <Button
                type="primary"
                block
                loading={rewriteLoading}
                onClick={handleRewriteText}
              >
                改写
              </Button>
              <div>
                <div className="mb-2">改写结果：</div>
                <TextArea 
                  rows={6} 
                  value={rewriteResult || ''} 
                  readOnly 
                  placeholder={rewriteResult ? '' : '点击上方改写按钮生成内容'}
                />
                {rewriteResult && (
                  <Button
                    block
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(rewriteResult)
                      message.success('已复制到剪贴板')
                    }}
                  >
                    复制
                  </Button>
                )}
              </div>
            </div>
          </TabPane>
          <TabPane tab="AI生图" key="generate">
            <div className="space-y-4">
              <div>
                <div className="mb-2">提示词：</div>
                <TextArea
                  rows={4}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="请输入图片描述"
                  maxLength={500}
                  showCount
                />
              </div>
              <Button
                type="primary"
                block
                loading={imageLoading}
                onClick={handleGenerateImage}
              >
                生成
              </Button>
            </div>
          </TabPane>
        </Tabs>
      </Drawer>

      {/* 背景抽屉 */}
      <Drawer
        title="背景设置"
        placement="left"
        onClose={() => setBackgroundDrawerVisible(false)}
        open={backgroundDrawerVisible}
        width={400}
      >
        <div className="space-y-4">
          {/* 背景类型切换 */}
          <div>
            <div className="mb-2">背景类型：</div>
            <Space>
              <Button
                type={backgroundType === 'solid' ? 'primary' : 'default'}
                onClick={() => setBackgroundType('solid')}
              >
                纯色
              </Button>
              <Button
                type={backgroundType === 'gradient' ? 'primary' : 'default'}
                onClick={() => setBackgroundType('gradient')}
              >
                渐变
              </Button>
            </Space>
          </div>
          
          {/* 纯色背景设置 */}
          {backgroundType === 'solid' && (
            <div>
              <div className="mb-2">纯色背景：</div>
              <ColorPickerWithEyeDropper
                value={solidColor}
                onChange={(color) => {
                  setSolidColor(color.toHexString())
                  // 应用纯色背景到画布
                  if (canvas) {
                    canvas.setBackgroundColor(color.toHexString(), () => {
                      canvas.renderAll()
                    })
                  }
                }}
                canvas={canvas}
                showText
              />
            </div>
          )}
          
          {/* 渐变背景设置 */}
          {backgroundType === 'gradient' && (
            <div className="space-y-3">
              <div>
                <div className="mb-2">渐变类型：</div>
                <Select
                  value={gradientType}
                  onChange={(value) => setGradientType(value)}
                  style={{ width: '100%' }}
                  options={[
                    { label: '线性渐变', value: 'linear' },
                    { label: '径向渐变', value: 'radial' },
                  ]}
                />
              </div>
              
              {gradientType === 'linear' && (
                <div>
                  <div className="mb-2">渐变方向：</div>
                  <Select
                    value={gradientDirection}
                    onChange={(value) => {
                      // 查找对应的角度
                      const selectedOption = gradientDirectionOptions.find(opt => opt.value === value)
                      if (selectedOption) {
                        setGradientDirection(value)
                        setGradientAngle(selectedOption.angle)
                        // 应用渐变背景到画布
                        if (canvas) {
                          const gradient = canvas.getContext().createLinearGradient(
                            0, 
                            0, 
                            canvas.width! * Math.cos(selectedOption.angle * Math.PI / 180), 
                            canvas.height! * Math.sin(selectedOption.angle * Math.PI / 180)
                          )
                          gradient.addColorStop(0, gradientStartColor)
                          gradient.addColorStop(1, gradientEndColor)
                          canvas.setBackgroundColor(gradient, () => {
                            canvas.renderAll()
                          })
                        }
                      }
                    }}
                    style={{ width: '100%' }}
                    options={gradientDirectionOptions.map(opt => ({
                      label: opt.label,
                      value: opt.value
                    }))}
                  />
                </div>
              )}
              
              <div>
                <div className="mb-2">开始颜色：</div>
                <ColorPickerWithEyeDropper
                  value={gradientStartColor}
                  onChange={(color) => {
                    setGradientStartColor(color.toHexString())
                    // 应用渐变背景到画布
                    if (canvas) {
                      const gradient = canvas.getContext().createLinearGradient(
                        0, 
                        0, 
                        canvas.width! * Math.cos(gradientAngle * Math.PI / 180), 
                        canvas.height! * Math.sin(gradientAngle * Math.PI / 180)
                      )
                      gradient.addColorStop(0, color.toHexString())
                      gradient.addColorStop(1, gradientEndColor)
                      canvas.setBackgroundColor(gradient, () => {
                        canvas.renderAll()
                      })
                    }
                  }}
                  canvas={canvas}
                  showText
                />
              </div>
              
              <div>
                <div className="mb-2">结束颜色：</div>
                <ColorPickerWithEyeDropper
                  value={gradientEndColor}
                  onChange={(color) => {
                    setGradientEndColor(color.toHexString())
                    // 应用渐变背景到画布
                    if (canvas) {
                      const gradient = canvas.getContext().createLinearGradient(
                        0, 
                        0, 
                        canvas.width! * Math.cos(gradientAngle * Math.PI / 180), 
                        canvas.height! * Math.sin(gradientAngle * Math.PI / 180)
                      )
                      gradient.addColorStop(0, gradientStartColor)
                      gradient.addColorStop(1, color.toHexString())
                      canvas.setBackgroundColor(gradient, () => {
                        canvas.renderAll()
                      })
                    }
                  }}
                  canvas={canvas}
                  showText
                />
              </div>
              
              {gradientType === 'linear' && (
                <div>
                  <div className="mb-2">渐变角度：{gradientAngle}°</div>
                  <Slider
                    min={0}
                    max={360}
                    value={gradientAngle}
                    onChange={(value) => {
                      setGradientAngle(value)
                      // 查找最接近的预设方向
                      const closestOption = gradientDirectionOptions.reduce((prev, curr) => {
                        return Math.abs(curr.angle - value) < Math.abs(prev.angle - value) ? curr : prev
                      })
                      setGradientDirection(closestOption.value)
                      // 应用渐变背景到画布
                      if (canvas) {
                        const gradient = canvas.getContext().createLinearGradient(
                          0, 
                          0, 
                          canvas.width! * Math.cos(value * Math.PI / 180), 
                          canvas.height! * Math.sin(value * Math.PI / 180)
                        )
                        gradient.addColorStop(0, gradientStartColor)
                        gradient.addColorStop(1, gradientEndColor)
                        canvas.setBackgroundColor(gradient, () => {
                          canvas.renderAll()
                        })
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* 搜索背景素材 */}
          <div>
            <div className="mb-2">搜索背景：</div>
            <Input
              placeholder="搜索背景"
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>
        </div>
      </Drawer>
      
      {/* 元素抽屉 */}
      <Drawer
        title="元素"
        placement="left"
        onClose={() => setElementDrawerVisible(false)}
        open={elementDrawerVisible}
        width={400}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2">搜索元素：</div>
            <Input
              placeholder="搜索元素"
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>
          <div>
            <div className="mb-2">基础形状：</div>
            <div className="grid grid-cols-3 gap-2">
              {/* 线条 */}
              <div 
                className="border border-border rounded p-2 cursor-pointer hover:border-primary text-center"
                onClick={() => {
                  if (canvas) {
                    // 生成唯一名称
                    const uniqueName = generateUniqueLayerName(canvas, '线条')
                    // 创建线条
                    const line = new fabric.Line([100, 100, 200, 100], {
                      stroke: '#000000',
                      strokeWidth: 2,
                      left: canvas.width! / 2 - 50,
                      top: canvas.height! / 2 - 50,
                      name: uniqueName, // 设置唯一名称
                    })
                    canvas.add(line)
                    canvas.setActiveObject(line)
                    canvas.renderAll()
                  }
                }}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <div style={{ width: '60%', height: '2px', backgroundColor: '#000' }}></div>
                </div>
                <div className="text-xs mt-1">线条</div>
              </div>
              
              {/* 圆形 */}
              <div 
                className="border border-border rounded p-2 cursor-pointer hover:border-primary text-center"
                onClick={() => {
                  if (canvas) {
                    // 生成唯一名称
                    const uniqueName = generateUniqueLayerName(canvas, '圆形')
                    // 创建圆形
                    const circle = new fabric.Circle({
                      radius: 50,
                      fill: '#ffffff',
                      stroke: '#000000',
                      strokeWidth: 2,
                      left: canvas.width! / 2 - 50,
                      top: canvas.height! / 2 - 50,
                      name: uniqueName, // 设置唯一名称
                    })
                    canvas.add(circle)
                    canvas.setActiveObject(circle)
                    canvas.renderAll()
                  }
                }}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <div style={{ width: '60%', height: '60%', borderRadius: '50%', border: '2px solid #000' }}></div>
                </div>
                <div className="text-xs mt-1">圆形</div>
              </div>
              
              {/* 正方形 */}
              <div 
                className="border border-border rounded p-2 cursor-pointer hover:border-primary text-center"
                onClick={() => {
                  if (canvas) {
                    // 生成唯一名称
                    const uniqueName = generateUniqueLayerName(canvas, '正方形')
                    // 创建正方形
                    const square = new fabric.Rect({
                      width: 100,
                      height: 100,
                      fill: '#ffffff',
                      stroke: '#000000',
                      strokeWidth: 2,
                      left: canvas.width! / 2 - 50,
                      top: canvas.height! / 2 - 50,
                      name: uniqueName, // 设置唯一名称
                    })
                    canvas.add(square)
                    canvas.setActiveObject(square)
                    canvas.renderAll()
                  }
                }}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <div style={{ width: '60%', height: '60%', border: '2px solid #000' }}></div>
                </div>
                <div className="text-xs mt-1">正方形</div>
              </div>
              
              {/* 三角形 */}
              <div 
                className="border border-border rounded p-2 cursor-pointer hover:border-primary text-center"
                onClick={() => {
                  if (canvas) {
                    // 生成唯一名称
                    const uniqueName = generateUniqueLayerName(canvas, '三角形')
                    // 创建三角形
                    const triangle = new fabric.Triangle({
                      width: 100,
                      height: 100,
                      fill: '#ffffff',
                      stroke: '#000000',
                      strokeWidth: 2,
                      left: canvas.width! / 2 - 50,
                      top: canvas.height! / 2 - 50,
                      name: uniqueName, // 设置唯一名称
                    })
                    canvas.add(triangle)
                    canvas.setActiveObject(triangle)
                    canvas.renderAll()
                  }
                }}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <div style={{ width: 0, height: 0, borderLeft: '30px solid transparent', borderRight: '30px solid transparent', borderBottom: '60px solid #000' }}></div>
                </div>
                <div className="text-xs mt-1">三角形</div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2">预设素材：</div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {/* 元素列表 */}
              <div className="border border-border rounded p-2 cursor-pointer hover:border-primary">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <AppstoreOutlined style={{ fontSize: '24px', color: '#999' }} />
                </div>
                <div className="text-xs text-center mt-1">形状</div>
              </div>
              <div className="border border-border rounded p-2 cursor-pointer hover:border-primary">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <AppstoreOutlined style={{ fontSize: '24px', color: '#999' }} />
                </div>
                <div className="text-xs text-center mt-1">SVG</div>
              </div>
              <div className="border border-border rounded p-2 cursor-pointer hover:border-primary">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <AppstoreOutlined style={{ fontSize: '24px', color: '#999' }} />
                </div>
                <div className="text-xs text-center mt-1">图标</div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2">我的元素：</div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {/* 我的元素列表 */}
            </div>
          </div>
        </div>
      </Drawer>
      
      {/* 文字抽屉 */}
      <Drawer
        title="文字"
        placement="left"
        onClose={() => setTextDrawerVisible(false)}
        open={textDrawerVisible}
        width={400}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2">搜索文字：</div>
            <Input
              placeholder="搜索文字"
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>
          <div>
            <div className="mb-2">添加文字：</div>
            <Button block onClick={() => {
              // 添加文字逻辑
              handleAddText('body');
            }}>
              添加文字
            </Button>
          </div>
          <div>
            <div className="mb-2">按标签展示：</div>
            <div className="flex flex-wrap gap-2">
              {/* 标签列表 */}
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">全部</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">标题</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">副标题</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">正文</div>
            </div>
          </div>
        </div>
      </Drawer>
      
      {/* 图片抽屉 */}
      <Drawer
        title="图片"
        placement="left"
        onClose={() => setImageDrawerVisible(false)}
        open={imageDrawerVisible}
        width={400}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2">搜索图片：</div>
            <Input
              placeholder="搜索图片"
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>
          <div>
            <div className="mb-2">上传图片：</div>
            <Upload
              beforeUpload={handleUploadImage}
              showUploadList={false}
              accept="image/*"
            >
              <Button block icon={<UploadOutlined />}>
                上传图片
              </Button>
            </Upload>
          </div>
          <div>
            <div className="mb-2">按标签展示：</div>
            <div className="flex flex-wrap gap-2">
              {/* 标签列表 */}
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">全部</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">风景</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">人物</div>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer">美食</div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* 文本解析抽屉 */}
      <Drawer
        title="文本解析 - 结构化文本生成画布"
        placement="left"
        onClose={() => setTextParseDrawerVisible(false)}
        open={textParseDrawerVisible}
        width={600}
      >
        <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          <TextArea
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            rows={10}
            placeholder="请输入结构化文本，支持画布尺寸、背景和多种图形元素的快速创建"
            maxLength={10000}
            showCount
            style={{ minHeight: 300 }}
          />
          
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              type="primary"
              onClick={handleParseText}
              loading={parseLoading}
              style={{ flex: 1 }}
            >
              解析并应用到画布
            </Button>
            <Button
              onClick={() => setParseText('')}
              style={{ minWidth: 100 }}
            >
              清空
            </Button>
          </div>
          
          <Tabs defaultActiveKey="examples">
            <TabPane tab="使用示例" key="examples">
              <Collapse defaultActiveKey={['1']}>
                <Panel header="基础画布示例" key="1">
                  <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>{`画布:
  宽度: 800
  高度: 600
背景:
  颜色: #ffffff
元素:
- 类型: 文本
  内容: 你好，世界！
  x: 100
  y: 100
  字号: 24
  颜色: #333333`}</pre>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setParseText(`画布:
  宽度: 800
  高度: 600
背景:
  颜色: #ffffff
元素:
- 类型: 文本
  内容: 你好，世界！
  x: 100
  y: 100
  字号: 24
  颜色: #333333`)}
                  >
                    复制此示例
                  </Button>
                </Panel>
                <Panel header="多元素示例" key="2">
                  <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>{`画布:
  宽度: 750
  高度: 1334
背景:
  颜色: #f0f2f5
元素:
- 类型: 文本
  内容: 欢迎使用文本解析功能
  x: 100
  y: 50
  字号: 32
  颜色: #1890ff
  字重: bold
  字体: 微软雅黑
- 类型: 矩形
  x: 100
  y: 120
  宽度: 550
  高度: 300
  填充颜色: #ffffff
  边框颜色: #d9d9d9
  边框宽度: 1
  圆角: 8
- 类型: 文本
  内容: 你可以快速创建多种图形元素
  x: 150
  y: 200
  字号: 24
  颜色: #666666
- 类型: 圆形
  x: 400
  y: 600
  半径: 100
  填充颜色: #e6f7ff
  边框颜色: #1890ff`}
                  </pre>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setParseText(`画布:
  宽度: 750
  高度: 1334
背景:
  颜色: #f0f2f5
元素:
- 类型: 文本
  内容: 欢迎使用文本解析功能
  x: 100
  y: 50
  字号: 32
  颜色: #1890ff
  字重: bold
  字体: 微软雅黑
- 类型: 矩形
  x: 100
  y: 120
  宽度: 550
  高度: 300
  填充颜色: #ffffff
  边框颜色: #d9d9d9
  边框宽度: 1
  圆角: 8
- 类型: 文本
  内容: 你可以快速创建多种图形元素
  x: 150
  y: 200
  字号: 24
  颜色: #666666
- 类型: 圆形
  x: 400
  y: 600
  半径: 100
  填充颜色: #e6f7ff
  边框颜色: #1890ff`)}
                  >
                    复制此示例
                  </Button>
                </Panel>
                <Panel header="JSON格式示例" key="3">
                  <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>{`{
  "canvas": {
    "宽度": 600,
    "高度": 400
  },
  "background": {
    "type": "solid",
    "color": "#ffffff"
  },
  "elements": [
    {
      "type": "text",
      "内容": "JSON格式也支持",
      "x": 100,
      "y": 100,
      "字号": 24,
      "颜色": "#333333"
    },
    {
      "type": "triangle",
      "x": 200,
      "y": 200,
      "宽度": 100,
      "高度": 100,
      "fill": "#ff7875"
    }
  ]
}`}
                  </pre>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setParseText(`{
  "canvas": {
    "宽度": 600,
    "高度": 400
  },
  "background": {
    "type": "solid",
    "color": "#ffffff"
  },
  "elements": [
    {
      "type": "text",
      "内容": "JSON格式也支持",
      "x": 100,
      "y": 100,
      "字号": 24,
      "颜色": "#333333"
    },
    {
      "type": "triangle",
      "x": 200,
      "y": 200,
      "宽度": 100,
      "高度": 100,
      "fill": "#ff7875"
    }
  ]
}`)}
                  >
                    复制此示例
                  </Button>
                </Panel>
              </Collapse>
            </TabPane>
            <TabPane tab="使用说明" key="help">
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#666666' }}>
                <h4 style={{ marginBottom: 8, color: '#333' }}>支持的配置参数：</h4>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 4 }}>画布参数：</p>
                  <ul style={{ marginLeft: 20 }}>
                    <li>宽度：画布宽度（像素）</li>
                    <li>高度：画布高度（像素）</li>
                  </ul>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 4 }}>背景参数：</p>
                  <ul style={{ marginLeft: 20 }}>
                    <li>颜色：背景色，支持#RRGGBB格式或预定义颜色名称</li>
                  </ul>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 4 }}>支持的元素类型：</p>
                  <ul style={{ marginLeft: 20 }}>
                    <li>文本 (text)：文字内容</li>
                    <li>矩形 (rectangle)：矩形形状</li>
                    <li>圆形 (circle)：圆形形状</li>
                    <li>线条 (line)：直线段</li>
                    <li>三角形 (triangle)：三角形形状</li>
                  </ul>
                </div>
                
                <div style={{ backgroundColor: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 4, padding: 12, marginTop: 16 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: 4, color: '#cf1322' }}>常见问题：</p>
                  <ul style={{ marginLeft: 20 }}>
                    <li>问：如何设置圆形的大小？<br/>答：使用「半径」属性设置圆形大小</li>
                    <li>问：颜色可以使用哪些格式？<br/>答：支持#RRGGBB十六进制格式或预定义颜色名称</li>
                    <li>问：元素的单位是什么？<br/>答：所有尺寸和位置都使用像素(px)作为单位</li>
                  </ul>
                </div>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </Drawer>
      
      {/* 模板解析抽屉 */}
      <Drawer
        title="模板解析 - 生成AI文案需求"
        placement="left"
        onClose={() => setTemplateParseDrawerVisible(false)}
        open={templateParseDrawerVisible}
        width={600}
        destroyOnClose={false}
      >
        <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
          {/* 步骤1：分析模板 */}
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">1</div>
              <div className="font-medium text-gray-800">分析当前模板</div>
            </div>
            
            <Button 
              type="primary" 
              onClick={analyzeTemplate}
              loading={analysisLoading}
              icon={<BarChartOutlined />}
              className="mb-4 w-full"
            >
              分析模板需求
            </Button>
            
            {templateAnalysisResult && (
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <div className="text-blue-800 mb-2 font-medium">模板分析结果：</div>
                
                {/* 基本统计信息 */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500">文本段落</div>
                    <div className="font-semibold text-lg">{templateAnalysisResult.textCount} 段</div>
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500">表情符号</div>
                    <div className="font-semibold text-lg">{templateAnalysisResult.emojiCount} 个</div>
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500">总字数</div>
                    <div className="font-semibold text-lg">{templateAnalysisResult.totalCharCount} 字</div>
                  </div>
                  <div className="bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500">最大容量</div>
                    <div className="font-semibold text-lg">{templateAnalysisResult.totalEstimatedMaxChars} 字</div>
                  </div>
                </div>
                
                {/* 文本类型统计 */}
                {templateAnalysisResult.textTypeStats && Object.keys(templateAnalysisResult.textTypeStats).length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">文本类型分布：</div>
                    <div className="space-y-1">
                      {Object.entries(templateAnalysisResult.textTypeStats).map(([type, stats]: [string, any]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span>{type}：{stats.count}个</span>
                          <span className="font-medium">{stats.totalChars}/{stats.maxChars}字</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 详细文本元素分析 */}
                {templateAnalysisResult.details && templateAnalysisResult.details.text && templateAnalysisResult.details.text.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">详细文本分析：</div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {templateAnalysisResult.details.text
                        .sort((a: any, b: any) => {
                          // 先按垂直位置排序，再按水平位置排序
                          if (a.position.top !== b.position.top) {
                            return a.position.top - b.position.top
                          }
                          return a.position.left - b.position.left
                        })
                        .map((textEl, index) => {
                          // 计算填充率状态颜色
                          let fillColor = 'bg-green-500'
                          if (textEl.fillRatio > 0.9) {
                            fillColor = 'bg-red-500'
                          } else if (textEl.fillRatio > 0.7) {
                            fillColor = 'bg-yellow-500'
                          }
                          
                          return (
                            <div key={textEl.textId} className="bg-white p-2 rounded shadow-sm">
                              <div className="flex justify-between items-center">
                                <div className="font-medium">{index + 1}. {textEl.textType}</div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                  字号: {textEl.fontSize}px
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                字数: {textEl.actualCharCount}/{textEl.estimatedMaxChars}字
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>填充率</span>
                                  <span>{Math.round(textEl.fillRatio * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${fillColor}`}
                                    style={{ width: `${Math.min(textEl.fillRatio * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                              {textEl.hasContent && textEl.content.trim() && (
                                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  现有内容: "{textEl.content.trim().substring(0, 50)}{textEl.content.length > 50 ? '...' : ''}"
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-1 border-t border-blue-100 mt-3 text-sm text-gray-500">
                  <span>总计元素：</span>
                  <span>{templateAnalysisResult.totalElements}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* 步骤2：输入文章内容 */}
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center mr-2">2</div>
              <div className="font-medium text-gray-800">输入文章内容</div>
            </div>
            
            <TextArea
              value={userArticleInput}
              onChange={(e) => setUserArticleInput(e.target.value)}
              rows={6}
              placeholder="请在此输入您的文章内容，AI将根据这些内容生成符合模板的文案"
              maxLength={5000}
              showCount
              onBlur={() => {
                if (templateAnalysisResult) {
                  generateAiPrompt(templateAnalysisResult, userArticleInput)
                }
              }}
              className="mb-2"
            />
            
            <div className="flex justify-between">
              <Button 
                onClick={() => setUserArticleInput('')}
                size="small"
              >
                清空内容
              </Button>
              
              {templateAnalysisResult && userArticleInput.trim() && (
                <Button 
                  type="primary" 
                  size="small"
                  onClick={() => generateAiPrompt(templateAnalysisResult, userArticleInput)}
                >
                  生成AI提示词
                </Button>
              )}
            </div>
          </div>
          
          {/* 步骤3：AI文案需求 */}
          <div className="border rounded-lg p-4 bg-white shadow-sm" style={{ flex: 1 }}>
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center mr-2">3</div>
              <div className="font-medium text-gray-800">AI文案需求</div>
              <Tooltip title="点击复制到剪贴板">
                <Button 
                  type="text" 
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(aiPromptResult)}
                  className="ml-auto"
                />
              </Tooltip>
            </div>
            
            <div 
              className="bg-purple-50 p-4 rounded-md h-40 overflow-auto cursor-pointer border border-purple-100"
              onClick={() => copyToClipboard(aiPromptResult)}
              style={{ transition: 'all 0.2s', position: 'relative' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3e8ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#faf5ff';
              }}
            >
              {aiPromptResult ? (
                <div>
                  <div className="absolute top-2 right-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                    点击复制
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{aiPromptResult}</div>
                </div>
              ) : (
                <div className="text-gray-400 flex items-center justify-center h-full">
                  <span>请先分析模板并输入文章内容</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 步骤4：AI文字反写 */}
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center mr-2">4</div>
              <div className="font-medium text-gray-800">AI文字反写</div>
            </div>
            
            <TextArea
              id="aiResultInput"
              rows={4}
              placeholder="将AI生成的文案粘贴到这里，然后点击应用按钮"
              maxLength={2000}
              showCount
              className="mb-3"
            />
            
            <Button 
              type="primary" 
              block
              icon={<EditOutlined />}
              onClick={() => {
                const aiResult = (document.getElementById('aiResultInput') as HTMLTextAreaElement)?.value || ''
                if (aiResult.trim()) {
                  applyAiResultToTemplate(aiResult)
                } else {
                  message.warning('请先输入AI生成的文案内容')
                }
              }}
            >
              应用AI结果到模板
            </Button>
            
            <div className="mt-2 text-xs text-gray-500">
              提示：将AI生成的文案按段落粘贴到上方输入框，系统会自动将内容匹配到模板对应的文本位置
            </div>
          </div>
          
          {/* 使用帮助提示 */}
          <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
            使用流程：1. 分析模板 → 2. 输入文章内容 → 3. 复制AI提示词 → 4. 将AI结果反写到模板
          </div>
        </div>
      </Drawer>
    </div>
  );
}