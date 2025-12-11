import { Request, Response } from 'express'
import prisma from '../config/database.js'

/**
 * 获取AI使用统计
 */
export const getAIStats = async (req: Request, res: Response) => {
  try {
    // 按模型分组统计
    const statsByModel = await prisma.aIUsage.groupBy({
      by: ['model'],
      _count: {
        id: true,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    })

    // 按类型分组统计
    const statsByType = await prisma.aIUsage.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    })

    // 总体统计
    const totalStats = await prisma.aIUsage.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    })

    // 格式化数据
    const modelStats = statsByModel.map((stat) => ({
      model: stat.model,
      count: stat._count.id,
      inputTokens: stat._sum.inputTokens || 0,
      outputTokens: stat._sum.outputTokens || 0,
      totalTokens: (stat._sum.inputTokens || 0) + (stat._sum.outputTokens || 0),
    }))

    const typeStats = statsByType.map((stat) => ({
      type: stat.type,
      count: stat._count.id,
      inputTokens: stat._sum.inputTokens || 0,
      outputTokens: stat._sum.outputTokens || 0,
      totalTokens: (stat._sum.inputTokens || 0) + (stat._sum.outputTokens || 0),
    }))

    res.json({
      success: true,
      data: {
        total: {
          count: totalStats._count.id,
          inputTokens: totalStats._sum.inputTokens || 0,
          outputTokens: totalStats._sum.outputTokens || 0,
          totalTokens: (totalStats._sum.inputTokens || 0) + (totalStats._sum.outputTokens || 0),
        },
        byModel: modelStats,
        byType: typeStats,
      },
    })
  } catch (error: any) {
    console.error('获取AI统计失败:', error)
    res.status(500).json({
      error: error.message || '获取AI统计失败',
    })
  }
}

