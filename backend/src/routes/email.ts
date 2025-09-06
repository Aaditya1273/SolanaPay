import express, { Request, Response } from 'express'
import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator'
import { asyncHandler } from '../middleware/errorMiddleware'
import crypto from 'crypto'

const router = express.Router()
const prisma = new PrismaClient()

// Email transporter configuration with fallback
const createTransporter = () => {
  // Check if SMTP credentials are properly configured
  const hasCredentials = process.env.SMTP_USER && process.env.SMTP_PASS && 
                        process.env.SMTP_USER.trim() !== '' && process.env.SMTP_PASS.trim() !== '' &&
                        process.env.SMTP_USER !== 'your_smtp_user' && process.env.SMTP_PASS !== 'your_smtp_password'
  
  if (!hasCredentials) {
    console.log('⚠️  No SMTP credentials found, using development mode (emails logged to console)')
    return null // Will be handled in the email sending logic
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Generate OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString()
}

// Store OTP in database
const storeOTP = async (email: string, otp: string, type: 'verification' | 'reset') => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.oTP.upsert({
    where: { email },
    update: {
      otp,
      type,
      expiresAt,
      attempts: 0,
      createdAt: new Date()
    },
    create: {
      email,
      otp,
      type,
      expiresAt,
      attempts: 0
    }
  })
}

// @desc    Send OTP for email verification
// @route   POST /api/email/send-verification-otp
// @access  Public
router.post('/send-verification-otp',
  [
    body('email').isEmail().normalizeEmail(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const otp = generateOTP()

    try {
      // Store OTP in database
      await storeOTP(email, otp, 'verification')

      // Check if SMTP credentials are properly configured
      const hasCredentials = process.env.SMTP_USER && process.env.SMTP_PASS && 
                            process.env.SMTP_USER.trim() !== '' && process.env.SMTP_PASS.trim() !== '' &&
                            process.env.SMTP_USER !== 'your_smtp_user' && process.env.SMTP_PASS !== 'your_smtp_password'
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">SolanaPay</h1>
            <p style="color: white; margin: 5px 0;">Web3 Micro-Economy Platform</p>
          </div>
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333;">Email Verification Required</h2>
            <p style="color: #666; font-size: 16px;">
              Welcome to SolanaPay! Please verify your email address to complete your registration.
            </p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="color: #333; margin-bottom: 10px;">Your verification code is:</p>
              <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">
              This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                <strong>Security Tips:</strong><br>
                • Never share this code with anyone<br>
                • SolanaPay will never ask for your password via email<br>
                • If you suspect suspicious activity, contact our support team
              </p>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; background: #f8f9fa;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              2024 SolanaPay. All rights reserved.
            </p>
          </div>
        </div>
      `

      // Development fallback - log to console if no credentials
      if (!hasCredentials) {
        console.log('\n DEVELOPMENT MODE - Email OTP:')
        console.log(` To: ${email}`)
        console.log(` OTP Code: ${otp}`)
        console.log(` Expires: 10 minutes`)
        console.log(' Copy this OTP to verify your email in the frontend\n')
      } else {
        // Send actual email
        const transporter = createTransporter()
        if (transporter) {
          await transporter.sendMail({
            from: `"SolanaPay" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'SolanaPay Email Verification - OTP Code',
            html: emailHtml,
          })
          console.log(` Email sent successfully to ${email}`)
        }
      }

      res.json({
        success: true,
        message: 'Verification OTP sent to your email',
        expiresIn: '10 minutes'
      })
    } catch (error) {
      console.error('Email sending error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      })
    }
  })
)

// @desc    Verify OTP
// @route   POST /api/email/verify-otp
// @access  Public
router.post('/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, otp } = req.body

    try {
      const otpRecord = await prisma.oTP.findUnique({
        where: { email }
      })

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found for this email'
        })
      }

      if (otpRecord.expiresAt < new Date()) {
        await prisma.oTP.delete({ where: { email } })
        return res.status(400).json({
          success: false,
          message: 'OTP has expired'
        })
      }

      if (otpRecord.attempts >= 3) {
        await prisma.oTP.delete({ where: { email } })
        return res.status(400).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP'
        })
      }

      if (otpRecord.otp !== otp) {
        await prisma.oTP.update({
          where: { email },
          data: { attempts: otpRecord.attempts + 1 }
        })
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        })
      }

      // OTP is valid - mark user as verified if it's verification type
      if (otpRecord.type === 'verification') {
        await prisma.user.update({
          where: { email },
          data: { isVerified: true }
        })
      }

      // Delete used OTP
      await prisma.oTP.delete({ where: { email } })

      res.json({
        success: true,
        message: 'OTP verified successfully',
        type: otpRecord.type
      })
    } catch (error) {
      console.error('OTP verification error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP'
      })
    }
  })
)

// @desc    Send password reset OTP
// @route   POST /api/email/send-reset-otp
// @access  Public
router.post('/send-reset-otp',
  [
    body('email').isEmail().normalizeEmail(),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body

    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        })
      }

      const otp = generateOTP()
      await storeOTP(email, otp, 'reset')

      // Send password reset email or log to console in development
      const transporter = createTransporter()
      
      if (!transporter) {
        // Development mode - log OTP to console
        console.log('📧 DEVELOPMENT MODE - Password Reset OTP:')
        console.log(`📧 To: ${email}`)
        console.log(`📧 Reset OTP Code: ${otp}`)
        console.log(`📧 Expires: 10 minutes`)
        console.log('📧 Copy this OTP to reset your password in the frontend')
      } else {
        // Production mode - send actual email
        const mailOptions = {
          from: process.env.SMTP_FROM || 'noreply@SolanaPay.com',
          to: email,
          subject: 'SolanaPay Password Reset - OTP Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">SolanaPay</h1>
                <p style="color: white; margin: 5px 0;">Web3 Micro-Economy Platform</p>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p style="color: #666; font-size: 16px;">
                  We received a request to reset your SolanaPay account password.
                </p>
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <p style="color: #333; margin-bottom: 10px;">Your password reset code is:</p>
                  <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                </div>
                <p style="color: #666; font-size: 14px;">
                  This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    © 2024 SolanaPay. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          `
        }

        await transporter.sendMail(mailOptions)
      }

      res.json({
        success: true,
        message: 'Password reset OTP sent to your email',
        expiresIn: '10 minutes'
      })
    } catch (error) {
      console.error('Password reset email error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      })
    }
  })
)

// @desc    Reset password with OTP
// @route   POST /api/email/reset-password
// @access  Public
router.post('/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
    body('newPassword').isLength({ min: 6 }),
  ],
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, otp, newPassword } = req.body

    try {
      const otpRecord = await prisma.oTP.findUnique({
        where: { email }
      })

      if (!otpRecord || otpRecord.type !== 'reset') {
        return res.status(400).json({
          success: false,
          message: 'No password reset OTP found for this email'
        })
      }

      if (otpRecord.expiresAt < new Date()) {
        await prisma.oTP.delete({ where: { email } })
        return res.status(400).json({
          success: false,
          message: 'OTP has expired'
        })
      }

      if (otpRecord.otp !== otp) {
        await prisma.oTP.update({
          where: { email },
          data: { attempts: otpRecord.attempts + 1 }
        })
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        })
      }

      // Hash new password
      const bcrypt = require('bcryptjs')
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(newPassword, salt)

      // Update user password
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      })

      // Delete used OTP
      await prisma.oTP.delete({ where: { email } })

      res.json({
        success: true,
        message: 'Password reset successfully'
      })
    } catch (error) {
      console.error('Password reset error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      })
    }
  })
)

export default router
