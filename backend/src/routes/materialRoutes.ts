import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import prisma from '../config/database.js'

const router = Router()

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const type = req.body.type || 'images'
    const dir = path.join(uploadDir, type)
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式，仅支持 JPG、PNG、GIF、SVG'))
    }
  },
})

router.get('/', async (req, res) => {
  try {
    const { type, keyword, folderId, tags } = req.query
    const where: any = {}
    if (type) where.type = type
    if (folderId) where.folderId = Number(folderId)
    if (keyword) {
      where.name = { contains: keyword as string }
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    // 过滤标签（SQLite 限制）
    let filteredMaterials = materials
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      filteredMaterials = materials.filter((material) => {
        if (!material.tags) return false
        const materialTags = JSON.parse(material.tags) as string[]
        return tagArray.some((tag) => materialTags.includes(tag))
      })
    }

    res.json({ data: filteredMaterials })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' })
    }

    const { type, name } = req.body
    const fileUrl = `/uploads/${type}/${req.file.filename}`
    const fileSize = req.file.size

    const material = await prisma.material.create({
      data: {
        name: name || req.file.originalname,
        type: type || 'image',
        fileUrl,
        fileSize,
      },
    })

    res.status(201).json(material)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, tags, folderId } = req.body

    const material = await prisma.material.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(folderId !== undefined && { folderId: folderId ? Number(folderId) : null }),
      },
    })

    res.json(material)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '素材不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const material = await prisma.material.findUnique({
      where: { id: Number(id) },
    })

    if (material) {
      // 删除文件
      const filePath = path.join(process.cwd(), material.fileUrl)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    await prisma.material.delete({
      where: { id: Number(id) },
    })

    res.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '素材不存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

export default router

