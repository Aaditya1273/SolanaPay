import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'

// Load environment variables
dotenv.config()

// Import routes
import authRoutes from './routes/auth'
import walletRoutes from './routes/wallet'
import taskRoutes from './routes/tasks'
import rewardRoutes from './routes/rewards'
import userRoutes from './routes/users'
import kycRoutes from './routes/kyc'

// Import middleware
import { errorHandler } from './middleware/errorMiddleware'
import { rateLimiter } from './middleware/rateLimiter'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(rateLimiter)

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Make io accessible to routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/users', userRoutes)
app.use('/api/kyc', kycRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SolanaPay API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  // Join user-specific room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`)
    console.log(`User ${userId} joined their room`)
  })

  // Handle wallet connection status
  socket.on('wallet-connected', (data) => {
    socket.broadcast.emit('user-wallet-connected', data)
  })

  // Handle payment notifications
  socket.on('payment-sent', (data) => {
    io.to(`user-${data.recipientId}`).emit('payment-received', data)
  })

  // Handle task notifications
  socket.on('task-created', (data) => {
    socket.broadcast.emit('new-task-available', data)
  })

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 SolanaPay API Server running on port ${PORT}`)
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`)
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`)
})

export default app
