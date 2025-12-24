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
        return tagArray.some((tag) => templateTags.includes(String(tag)))
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

    console.log('创建模板请求:', { name, canvasDataType: typeof canvasData, canvasDataLength: canvasData?.length, tags, thumbnailUrl })

    if (!name) {
      return res.status(400).json({ error: '模版名称不能为空' })
    }

    // 处理 canvasData：如果已经是字符串，直接使用；否则序列化
    let canvasDataStr: string | null = null
    if (canvasData) {
      if (typeof canvasData === 'string') {
        canvasDataStr = canvasData
        console.log('canvasData 是字符串，直接使用，长度:', canvasDataStr.length)
      } else {
        canvasDataStr = JSON.stringify(canvasData)
        console.log('canvasData 是对象，已序列化，长度:', canvasDataStr.length)
      }
    }

    // 处理 tags：如果已经是字符串，解析后再序列化；否则直接序列化
    let tagsStr: string | null = null
    if (tags) {
      if (typeof tags === 'string') {
        try {
          // 如果已经是 JSON 字符串，直接使用
          JSON.parse(tags)
          tagsStr = tags
        } catch {
          // 如果不是有效的 JSON，当作普通字符串处理
          tagsStr = JSON.stringify([tags])
        }
      } else {
        tagsStr = JSON.stringify(tags)
      }
    }

    console.log('准备创建模板，数据:', { 
      name, 
      canvasDataLength: canvasDataStr?.length, 
      tagsStr, 
      thumbnailUrlLength: thumbnailUrl?.length || 0 
    })

    // 检查数据长度，避免超出数据库限制
    if (canvasDataStr && canvasDataStr.length > 10000000) {
      console.warn('canvasData 数据过长，可能超出数据库限制')
    }

    const template = await prisma.template.create({
      data: {
        name,
        canvasData: canvasDataStr,
        tags: tagsStr,
        thumbnailUrl: thumbnailUrl && thumbnailUrl.length > 1000000 ? null : thumbnailUrl, // 如果缩略图太长，设为 null
      },
    })

    console.log('模板创建成功，ID:', template.id)
    res.status(201).json(template)
  } catch (error: any) {
    console.error('创建模板失败:', error)
    console.error('错误消息:', error.message)
    console.error('错误代码:', error.code)
    console.error('错误堆栈:', error.stack)
    
    // 提供更详细的错误信息
    let errorMessage = error.message || '创建模板失败'
    if (error.code === 'P2002') {
      errorMessage = '模板名称已存在'
    } else if (error.code === 'P2003') {
      errorMessage = '数据库约束错误'
    }
    
    res.status(500).json({ error: errorMessage })
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

