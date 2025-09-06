import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import { protect } from '../middleware/authMiddleware'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

const router = express.Router()
const prisma = new PrismaClient()

// Ensure upload directory exists
const uploadDir = 'uploads/kyc'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure multer for KYC document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const userId = (req as AuthenticatedRequest).user.id
    const documentType = req.body.type || 'document'
    cb(null, `${userId}-${documentType}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'))
    }
  }
})

// @desc    Submit personal information for KYC
// @route   POST /api/kyc/personal-info
// @access  Private
router.post('/personal-info',
  protect,
  [
    body('fullName').notEmpty().isLength({ min: 2, max: 100 }),
    body('dateOfBirth').isISO8601(),
    body('address').notEmpty().isLength({ min: 10, max: 500 }),
    body('phoneNumber').optional().isMobilePhone(),
    body('nationality').optional().isLength({ max: 50 }),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { fullName, dateOfBirth, address, phoneNumber, nationality } = req.body

    // Create or update KYC record
    const kycRecord = await prisma.kYCVerification.upsert({
      where: { userId: req.user.id },
      update: {
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        address,
        phoneNumber,
        nationality,
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        address,
        phoneNumber,
        nationality,
        status: 'PENDING',
        submittedAt: new Date()
      }
    })

    res.json({
      success: true,
      message: 'Personal information saved successfully',
      kycRecord
    })
  })
)

// @desc    Upload KYC document
// @route   POST /api/kyc/upload
// @access  Private
router.post('/upload',
  protect,
  upload.single('document'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const { type } = req.body
    if (!type || !['passport', 'drivers_license', 'national_id', 'selfie'].includes(type)) {
      return res.status(400).json({ message: 'Invalid document type' })
    }

    const documentPath = `/uploads/kyc/${req.file.filename}`

    // Save document record
    const document = await prisma.kYCDocument.create({
      data: {
        userId: req.user.id,
        type,
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: documentPath,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date()
      }
    })

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        type: document.type,
        filename: document.filename,
        uploadedAt: document.uploadedAt
      }
    })
  })
)

// @desc    Submit KYC application for review
// @route   POST /api/kyc/submit
// @access  Private
router.post('/submit',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check if user has uploaded required documents
    const documents = await prisma.kYCDocument.findMany({
      where: { userId: req.user.id }
    })

    if (documents.length < 2) {
      return res.status(400).json({ 
        message: 'Please upload at least 2 documents (ID + Selfie)' 
      })
    }

    // Check if personal info exists
    const kycRecord = await prisma.kYCVerification.findUnique({
      where: { userId: req.user.id }
    })

    if (!kycRecord) {
      return res.status(400).json({ 
        message: 'Please complete personal information first' 
      })
    }

    // Update KYC status to pending and user status
    await prisma.$transaction([
      prisma.kYCVerification.update({
        where: { userId: req.user.id },
        data: {
          status: 'PENDING',
          submittedAt: new Date()
        }
      }),
      prisma.user.update({
        where: { id: req.user.id },
        data: { kycStatus: 'PENDING' }
      })
    ])

    // In a real application, you would:
    // 1. Send documents to identity verification service (Jumio, Onfido, etc.)
    // 2. Queue for manual review
    // 3. Send notification emails
    // 4. Create audit logs

    res.json({
      success: true,
      message: 'KYC application submitted successfully. Review typically takes 24-48 hours.',
      status: 'PENDING'
    })
  })
)

// @desc    Get KYC status and documents
// @route   GET /api/kyc/status
// @access  Private
router.get('/status',
  protect,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const kycRecord = await prisma.kYCVerification.findUnique({
      where: { userId: req.user.id },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            filename: true,
            uploadedAt: true
          }
        }
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { kycStatus: true }
    })

    res.json({
      success: true,
      kycRecord,
      status: user?.kycStatus || 'NOT_STARTED',
      documentsCount: kycRecord?.documents.length || 0
    })
  })
)

// @desc    Admin: Review and approve/reject KYC
// @route   PUT /api/kyc/review/:userId
// @access  Private (Admin only)
router.put('/review/:userId',
  protect,
  [
    body('status').isIn(['APPROVED', 'REJECTED']),
    body('reviewNotes').optional().isLength({ max: 1000 }),
  ],
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user for demo purposes
    
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { userId } = req.params
    const { status, reviewNotes } = req.body

    // Update KYC record and user status
    await prisma.$transaction([
      prisma.kYCVerification.update({
        where: { userId },
        data: {
          status,
          reviewNotes,
          reviewedAt: new Date(),
          reviewedBy: req.user.id
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { 
          kycStatus: status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
        }
      })
    ])

    // In a real app, send notification email to user
    
    res.json({
      success: true,
      message: `KYC ${status.toLowerCase()} successfully`,
      status
    })
  })
)

export default router
