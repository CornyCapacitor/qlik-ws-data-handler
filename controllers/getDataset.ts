import { Request, Response } from 'express'

export const getDataset = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send({ message: 'Inside /api/dataset' })
}