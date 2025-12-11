import { Router } from 'express'
import {
  getWorks,
  getWork,
  createWork,
  updateWork,
  deleteWork,
  duplicateWork,
} from '../controllers/workController.js'

const router = Router()

router.get('/', getWorks)
router.get('/:id', getWork)
router.post('/', createWork)
router.put('/:id', updateWork)
router.delete('/:id', deleteWork)
router.post('/:id/duplicate', duplicateWork)

export default router

