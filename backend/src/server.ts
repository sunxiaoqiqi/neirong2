import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import workRoutes from './routes/workRoutes.js'
import templateRoutes from './routes/templateRoutes.js'
import materialRoutes from './routes/materialRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import folderRoutes from './routes/folderRoutes.js'
import tagRoutes from './routes/tagRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
// 增加请求体大小限制，支持大的 canvasData 和 thumbnailUrl
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 静态文件服务
app.use('/uploads', express.static('uploads'))

// 路由
app.use('/api/works', workRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/upload', uploadRoutes)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 错误处理
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
})

