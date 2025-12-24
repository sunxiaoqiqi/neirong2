import { aiConfig } from '../config/ai.js'
import prisma from '../config/database.js'

// 注意：这里需要安装 @alicloud/dashscope SDK
// 由于SDK可能还在更新，这里提供基础实现框架

interface AIUsageRecord {
  model: string
  type: 'text-rewrite' | 'image-generate'
  inputTokens: number
  outputTokens: number
}

export class AIService {
  private apiKey: string

  constructor() {
    this.apiKey = aiConfig.apiKey
    // 不在这里抛出错误，允许在没有API Key时也能记录统计
  }

  /**
   * 记录AI使用统计
   */
  private async recordUsage(record: AIUsageRecord) {
    try {
      await prisma.aIUsage.create({
        data: record,
      })
    } catch (error) {
      console.error('记录AI使用统计失败:', error)
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 小红书文案改写
   */
  async rewriteText(originalText: string, prompt?: string, model: string = 'qwen-turbo'): Promise<string> {
    const systemPrompt =
      prompt ||
      '请将以下文案改写成适合小红书平台的风格，要求：1. 语言活泼有趣 2. 使用emoji表情 3. 增加互动性 4. 保持原意'

    // 估算输入token（简单估算：1个中文字符约等于1.5个token，英文单词约等于1.3个token）
    const inputText = systemPrompt + originalText
    const estimatedInputTokens = Math.ceil(inputText.length * 1.3)

    try {
      if (!this.apiKey) {
        // 模拟返回，用于测试统计功能
        const result = `改写后的文案：${originalText}（请配置DASHSCOPE_API_KEY以使用真实AI功能）`
        const estimatedOutputTokens = Math.ceil(result.length * 1.3)
        
        // 记录统计（即使API未配置也记录，方便测试）
        await this.recordUsage({
          model,
          type: 'text-rewrite',
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
        })
        
        return result
      }

      // TODO: 集成通义千问API
      // 示例代码（需要根据实际SDK调整）:
      /*
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: originalText },
            ],
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000,
          },
        }),
      })

      const data = await response.json()
      const result = data.output.choices[0].message.content
      
      // 从API响应中获取实际的token使用量
      const inputTokens = data.usage?.input_tokens || estimatedInputTokens
      const outputTokens = data.usage?.output_tokens || Math.ceil(result.length * 1.3)
      
      // 记录统计
      await this.recordUsage({
        model,
        type: 'text-rewrite',
        inputTokens,
        outputTokens,
      })
      
      return result
      */

      // 临时返回，实际需要替换为真实API调用
      const result = `改写后的文案：${originalText}（请配置DASHSCOPE_API_KEY以使用真实AI功能）`
      const estimatedOutputTokens = Math.ceil(result.length * 1.3)
      
      await this.recordUsage({
        model,
        type: 'text-rewrite',
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
      })
      
      return result
    } catch (error: any) {
      console.error('文案改写失败:', error)
      throw new Error('文案改写失败，请稍后重试')
    }
  }

  /**
   * AI生图
   */
  async generateImage(prompt: string, model: string = 'wanx-v1'): Promise<string> {
    // 估算输入token（图片生成通常只计算prompt的token）
    const estimatedInputTokens = Math.ceil(prompt.length * 1.3)
    // 图片生成通常不返回文本，输出token为0或固定值
    const outputTokens = 0

    try {
      if (!this.apiKey) {
        throw new Error('AI生图功能需要配置DASHSCOPE_API_KEY')
      }

      // 尝试调用通义万相API
      console.log('尝试调用通义万相API进行图片生成:', prompt)
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: {
            prompt: prompt,
          },
          parameters: {
            size: '1024*1024',
            n: 1,
          },
        }),
      })

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string }
        if (response.status === 403 && errorData.message && errorData.message.includes('does not support synchronous calls')) {
          throw new Error(
            '通义万相API不支持同步调用。为了正确实现此功能，需要：\n' +
            '1. 重构API为异步架构\n' +
            '2. 后端接收请求并返回任务ID\n' +
            '3. 前端通过轮询获取任务状态和图片URL\n' +
            '\n当前临时解决方案：API调用已提交，请检查阿里云DASHSCOPE控制台查看图片生成结果。'
          )
        } else {
          throw new Error(`API请求失败: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ''}`)
        }
      }

      // 正常处理API响应（如果API调用成功）
      const data = await response.json() as {
        output?: {
          results?: Array<{ url?: string }>
        }
        usage?: {
          input_tokens?: number
        }
      }
      
      // 检查响应数据结构
      if (!data.output || !Array.isArray(data.output.results) || data.output.results.length === 0) {
        throw new Error('API返回数据格式不正确或无图片生成结果')
      }
      
      const imageUrl = data.output.results[0].url
      if (!imageUrl) {
        throw new Error('API未返回有效的图片URL')
      }
      
      // 从API响应中获取实际的token使用量（如果有）
      const inputTokens = data.usage?.input_tokens || estimatedInputTokens
      
      // 记录统计
      await this.recordUsage({
        model,
        type: 'image-generate',
        inputTokens,
        outputTokens: 0,
      })
      
      return imageUrl
    } catch (error: any) {
        console.error('AI生图失败:', error)
        // 保留原始错误信息，帮助诊断
        if (error.message && (error.message.includes('API请求失败') || error.message.includes('通义万相API不支持同步调用'))) {
          throw error
        } else {
          throw new Error('AI生图失败，请稍后重试。错误详情: ' + (error.message || String(error)))
        }
    }
  }
}

