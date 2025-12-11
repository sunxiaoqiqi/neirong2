import { Router } from 'express'
import prisma from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { keyword, tags } = req.query
    const where: any = {}
    
    if (keyword) {
      where.name = { contains: keyword as string }
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    // 过滤标签（SQLite 限制）
    let filteredTemplates = templates
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      filteredTemplates = templates.filter((template) => {
        if (!template.tags) return false
        const templateTags = JSON.parse(template.tags) as string[]
        return tagArray.some((tag) => templateTags.includes(tag))
      })
    }

    res.json({ data: filteredTemplates })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!template) {
      return res.status(404).json({ error: '模版不存在' })
    }
    res.json(template)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, canvasData, tags, thumbnailUrl } = req.body

    if (!name) {
      return res.status(400).json({ error: '模版名称不能为空' })
    }

    const template = await prisma.template.create({
      data: {
        name,
        canvasData: canvasData ? JSON.stringify(canvasData) : null,
        tags: tags ? JSON.stringify(tags) : null,
        thumbnailUrl,
      },
    })

    res.status(201).json(template)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, canvasData, tags, thumbnailUrl } = req.body

    const template = await prisma.template.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(canvasData && { canvasData: JSON.stringify(canvasData) }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      },
    })

    res.json(template)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '模版不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.template.delete({
      where: { id: Number(id) },
    })
    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '模版不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/apply', async (req, res) => {
  try {
    const { id } = req.params
    const { workId } = req.body

    const template = await prisma.template.findUnique({
      where: { id: Number(id) },
    })

    if (!template) {
      return res.status(404).json({ error: '模版不存在' })
    }

    if (workId) {
      // 应用模版到指定作品
      const work = await prisma.work.findUnique({
        where: { id: Number(workId) },
      })

      if (!work) {
        return res.status(404).json({ error: '作品不存在' })
      }

      // 合并模版数据到作品
      if (template.canvasData) {
        await prisma.work.update({
          where: { id: Number(workId) },
          data: {
            canvasData: template.canvasData,
          },
        })
      }
    }

    res.json({ success: true, templateData: template.canvasData })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router

