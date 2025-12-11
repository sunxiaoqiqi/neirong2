import api from './api'

export interface AIStats {
  total: {
    count: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  byModel: Array<{
    model: string
    count: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }>
  byType: Array<{
    type: string
    count: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }>
}

// 图片生成任务状态类型
export interface ImageGenerationTask {
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

export const aiService = {
  getStats: async () => {
    return api.get<{ success: boolean; data: AIStats }>('/ai/stats')
  },

  rewriteText: async (originalText: string, prompt?: string, model?: string) => {
    return api.post('/ai/text-rewrite', { originalText, prompt, model })
  },

  generateImage: async (prompt: string, model?: string) => {
    try {
      // 显示加载状态
      console.log('开始AI图片生成请求，正在加载...')
      
      // 尝试发送请求
      const response = await api.post('/ai/image-generate', { prompt, model });
      
      // 请求成功
      console.log('AI图片生成请求完成:', response);
      return response;
    } catch (error: any) {
      // 处理错误，特别是异步架构相关的提示
      if (error.response?.data?.error?.includes('通义万相API不支持同步调用')) {
        console.log('API需要异步处理，显示提示信息给用户')
        // 保留原始错误信息，让前端组件能够据此显示适当的加载/提示状态
        throw error;
      }
      console.error('AI图片生成请求失败:', error);
      throw error;
    }
  },
}

