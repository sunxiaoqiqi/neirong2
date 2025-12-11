import { Router } from 'express'
import prisma from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    const where: any = {}
    if (type) where.type = type

    const folders = await prisma.folder.findMany({
      where,
      orderBy: { name: 'asc' },
    })
    res.json(folders)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, parentId, type } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: '文件夹名称和类型不能为空' })
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId ? Number(parentId) : null,
        type,
      },
    })

    res.status(201).json(folder)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: '文件夹名称不能为空' })
    }

    const folder = await prisma.folder.update({
      where: { id: Number(id) },
      data: { name },
    })

    res.json(folder)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '文件夹不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 检查文件夹是否为空
    const workCount = await prisma.work.count({ where: { folderId: Number(id) } })
    if (workCount > 0) {
      return res.status(400).json({ error: '文件夹不为空，无法删除' })
    }

    await prisma.folder.delete({
      where: { id: Number(id) },
    })

    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '文件夹不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router


