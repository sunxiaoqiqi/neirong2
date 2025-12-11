import { Request, Response } from 'express'
import { AIService } from '../services/aiService.js'

const aiService = new AIService()

export const rewriteText = async (req: Request, res: Response) => {
  try {
    const { originalText, prompt, model } = req.body

    if (!originalText) {
      return res.status(400).json({ error: '原始文案不能为空' })
    }

    const rewrittenText = await aiService.rewriteText(originalText, prompt, model || 'qwen-turbo')

    res.json({
      success: true,
      result: rewrittenText,
    })
  } catch (error: any) {
    res.status(500).json({
      error: error.message || '文案改写失败',
    })
  }
}

export const generateImage = async (req: Request, res: Response) => {
  try {
    const { prompt, model } = req.body

    if (!prompt) {
      return res.status(400).json({ error: '提示词不能为空' })
    }

    const imageUrl = await aiService.generateImage(prompt, model || 'wanx-v1')

    res.json({
      success: true,
      imageUrl,
    })
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'AI生图失败',
    })
  }
}

