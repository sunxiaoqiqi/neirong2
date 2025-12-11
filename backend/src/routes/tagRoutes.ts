import { Router } from 'express'
import prisma from '../config/database.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(tags)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body

    if (!name) {
      return res.status(400).json({ error: '标签名称不能为空' })
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || null,
      },
    })

    res.status(201).json(tag)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '标签名称已存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.tag.delete({
      where: { id: Number(id) },
    })
    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '标签不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router


