import { Router } from 'express'
import { rewriteText, generateImage } from '../controllers/aiController.js'
import { getAIStats } from '../controllers/aiStatsController.js'

const router = Router()

router.post('/text-rewrite', rewriteText)
router.post('/image-generate', generateImage)
router.get('/stats', getAIStats)

export default router

