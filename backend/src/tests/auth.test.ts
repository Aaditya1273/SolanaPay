import request from 'supertest'
import app from '../index'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Authentication Routes', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({})
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.username).toBe(userData.username)
      expect(response.body.user.password).toBeUndefined()
    })

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'password123'
      }

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      // Try to create second user with same email
      const duplicateData = { ...userData, username: 'testuser2' }
      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400)

      expect(response.body.message).toBe('User already exists')
    })

    it('should reject invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.errors).toBeDefined()
    })

    it('should reject short password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: '123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.errors).toBeDefined()
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123'
        })
    })

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe('test@example.com')
    })

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401)

      expect(response.body.message).toBe('Invalid credentials')
    })
  })

  describe('GET /api/auth/me', () => {
    let authToken: string

    beforeEach(async () => {
      // Create and login user
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123'
        })
      
      authToken = response.body.token
    })

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.user.email).toBe('test@example.com')
      expect(response.body.user.username).toBe('testuser')
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401)

      expect(response.body.message).toBe('Not authorized, no token')
    })

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.message).toBe('Not authorized, token failed')
    })
  })
})
