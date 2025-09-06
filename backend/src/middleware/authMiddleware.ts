import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from './errorMiddleware'

const prisma = new PrismaClient()

interface AuthRequest extends Request {
  user?: any
}

export const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          walletAddress: true,
          isVerified: true,
          kycStatus: true,
          tier: true,
          rewardPoints: true,
        }
      })

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' })
      }

      next()
    } catch (error) {
      console.error(error)
      res.status(401).json({ message: 'Not authorized, token failed' })
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' })
  }
})

export const authenticateToken = protect

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(403).json({ message: 'Not authorized as admin' })
  }
}

export const verified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.isVerified) {
    next()
  } else {
    res.status(403).json({ message: 'Account not verified' })
  }
}

export const kycApproved = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.kycStatus === 'APPROVED') {
    next()
  } else {
    res.status(403).json({ message: 'KYC verification required' })
  }
}
