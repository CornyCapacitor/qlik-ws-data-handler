import express from 'express'
import { getDataset } from '../controllers/getDataset'

const router = express.Router()

router.get('/', getDataset)

export default router