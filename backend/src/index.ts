import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { errorHandler, notFound } from './middleware/errorMiddleware'
import { rateLimiter } from './middleware/rateLimiter'
import logger from './utils/logger'

// Import routes
import authRoutes from './routes/auth'
import emailRoutes from './routes/email'
import walletRoutes from './routes/wallet'
import tasksRoutes from './routes/tasks'
import rewardsRoutes from './routes/rewards'
import userRoutes from './routes/users'
import onrampRoutes from './routes/onramp'
import settlementsRoutes from './routes/settlements'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}))
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(rateLimiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/user', userRoutes)
app.use('/api/onramp', onrampRoutes)
app.use('/api/settlements', settlementsRoutes)

// Socket.IO for real-time features
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`)

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`)
    logger.info(`User ${userId} joined their room`)
  })

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`)
  })
})

// Make io available to routes
app.set('io', io)

// Error handling
app.use(notFound)
app.use(errorHandler)

// Port management with automatic retry
const startServer = async () => {
  const basePort = parseInt(process.env.PORT || '3001', 10)
  const maxRetries = 10

  const tryPort = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const serverInstance = server.listen(port, () => {
        logger.info(`🚀 VPay Backend running on port ${port}`)
        logger.info(`📊 Health check: http://localhost:${port}/health`)
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
        
        if (port !== basePort) {
          logger.info(`✨ Auto-selected port ${port} (${basePort} was busy)`)
        }
        resolve(port)
      })

      serverInstance.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          if (port - basePort < maxRetries) {
            logger.warn(`⚠️  Port ${port} is busy, trying ${port + 1}...`)
            // Try next port
            tryPort(port + 1).then(resolve).catch(reject)
          } else {
            reject(new Error(`Unable to find available port after ${maxRetries} attempts`))
          }
        } else {
          reject(err)
        }
      })
    })
  }

  try {
    await tryPort(basePort)
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error}`)
    process.exit(1)
  }
}

// Start server with port retry logic
startServer()

export default app
