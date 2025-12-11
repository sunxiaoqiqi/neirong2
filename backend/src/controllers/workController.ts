import { Request, Response } from 'express'
import prisma from '../config/database.js'

export const getWorks = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, folderId, tags, keyword, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query

    const skip = (Number(page) - 1) * Number(pageSize)
    const take = Number(pageSize)

    const where: any = {}
    if (folderId) where.folderId = Number(folderId)
    if (keyword) {
      where.name = { contains: keyword as string }
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      // SQLite 不支持 JSON 查询，需要手动过滤
      // 这里简化处理，实际应该优化数据结构
    }

    const orderBy: any = {}
    if (sortBy === 'name') {
      orderBy.name = sortOrder === 'asc' ? 'asc' : 'desc'
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.updatedAt = sortOrder === 'asc' ? 'asc' : 'desc'
    }

    const [works, total] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.work.count({ where }),
    ])

    // 过滤标签（SQLite 限制）
    let filteredWorks = works
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      filteredWorks = works.filter((work) => {
        if (!work.tags) return false
        const workTags = JSON.parse(work.tags) as string[]
        return tagArray.some((tag) => workTags.includes(tag))
      })
    }

    res.json({
      data: filteredWorks,
      total: filteredWorks.length,
      page: Number(page),
      pageSize: Number(pageSize),
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const getWork = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const work = await prisma.work.findUnique({
      where: { id: Number(id) },
    })

    if (!work) {
      return res.status(404).json({ error: '作品不存在' })
    }

    res.json(work)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const createWork = async (req: Request, res: Response) => {
  try {
    const { name, description, canvasData, folderId, tags } = req.body

    if (!name) {
      return res.status(400).json({ error: '作品名称不能为空' })
    }

    const work = await prisma.work.create({
      data: {
        name,
        description,
        canvasData: canvasData ? JSON.stringify(canvasData) : null,
        folderId: folderId ? Number(folderId) : null,
        tags: tags ? JSON.stringify(tags) : null,
        status: 'draft',
      },
    })

    res.status(201).json(work)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const updateWork = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, canvasData, folderId, tags, status } = req.body

    const work = await prisma.work.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(canvasData && { canvasData: JSON.stringify(canvasData) }),
        ...(folderId !== undefined && { folderId: folderId ? Number(folderId) : null }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(status && { status }),
      },
    })

    res.json(work)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '作品不存在' })
    }
    res.status(500).json({ error: error.message })
  }
}

export const deleteWork = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.work.delete({
      where: { id: Number(id) },
    })

    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '作品不存在' })
    }
    res.status(500).json({ error: error.message })
  }
}

export const duplicateWork = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const originalWork = await prisma.work.findUnique({
      where: { id: Number(id) },
    })

    if (!originalWork) {
      return res.status(404).json({ error: '作品不存在' })
    }

    const newWork = await prisma.work.create({
      data: {
        name: `${originalWork.name}_副本`,
        description: originalWork.description,
        canvasData: originalWork.canvasData,
        folderId: originalWork.folderId,
        tags: originalWork.tags,
        status: 'draft',
      },
    })

    res.status(201).json(newWork)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

